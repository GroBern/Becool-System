import mongoose from 'mongoose';
import dns from 'dns';

// Prefer public DNS — Windows stub resolver sometimes refuses SRV queries
// that `mongodb+srv://` relies on. We still fall back to DoH below.
try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch { }

let isConnected = false;
let listenersBound = false;

export function getConnectionStatus() {
    return isConnected;
}

function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    mongoose.connection.on('connected', () => {
        isConnected = true;
        console.log(`MongoDB connected: ${mongoose.connection.host}`);
    });
    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('MongoDB disconnected — retrying...');
    });
    mongoose.connection.on('error', (err) => {
        isConnected = false;
        console.warn('MongoDB error:', err?.message || err);
    });
}

function classifyError(err) {
    const msg = (err && err.message) || String(err);
    if (/querySrv|ENOTFOUND|EAI_AGAIN|ECONNREFUSED.*_mongodb|queryTxt/i.test(msg)) {
        return [
            'DNS SRV lookup for MongoDB Atlas failed.',
            'Will auto-retry via DNS-over-HTTPS (Cloudflare/Google) on the next attempt.',
        ].join(' ');
    }
    if (/Authentication failed|bad auth/i.test(msg)) {
        return 'MongoDB authentication failed. Check MONGODB_URI username/password.';
    }
    if (/IP.*whitelist|not allowed to connect/i.test(msg)) {
        return 'Your current IP is not whitelisted in MongoDB Atlas Network Access.';
    }
    return msg;
}

/**
 * DNS-over-HTTPS fallback. Queries Cloudflare (then Google) over HTTPS so we
 * don't depend on UDP/TCP port 53 at all. Returns an array of RDATA strings.
 */
async function dohQuery(name, type) {
    const endpoints = [
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
        `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    ];
    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                headers: { accept: 'application/dns-json' },
                // 6s hard cap per endpoint
                signal: AbortSignal.timeout(6000),
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data.Answer) && data.Answer.length) {
                return data.Answer.map((a) => a.data);
            }
        } catch {
            // try next endpoint
        }
    }
    return [];
}

/**
 * Resolve a `mongodb+srv://user:pass@host/db?opts` URI to a plain
 * `mongodb://user:pass@h1:p,h2:p,h3:p/db?tls=true&...` URI using DoH.
 * Mirrors the driver's SRV polling logic (_mongodb._tcp.<host> SRV + <host> TXT).
 */
async function resolveSrvViaDoH(srvUri) {
    const u = new URL(srvUri);
    const host = u.hostname;

    // 1) SRV records → list of {target, port}
    const srvAnswers = await dohQuery(`_mongodb._tcp.${host}`, 'SRV');
    if (!srvAnswers.length) {
        throw new Error(`DoH SRV lookup returned no records for _mongodb._tcp.${host}`);
    }
    // Cloudflare returns: "<priority> <weight> <port> <target>."
    const seeds = srvAnswers.map((line) => {
        const parts = line.trim().split(/\s+/);
        const port = parts[2];
        const target = parts[3].replace(/\.$/, '');
        return `${target}:${port}`;
    });

    // 2) TXT record → extra connection options (e.g. authSource=admin&replicaSet=xyz)
    const txtAnswers = await dohQuery(host, 'TXT');
    const txtOpts = txtAnswers
        .map((s) => s.replace(/^"|"$/g, ''))
        .join('&');

    // 3) Build plain mongodb:// URI
    const userInfo = u.username ? `${u.username}${u.password ? ':' + u.password : ''}@` : '';
    const db = u.pathname || '';

    // Merge query params: original URI opts + TXT opts + enforce tls=true
    // (Atlas SRV implies TLS and authSource=admin by default)
    const mergedParams = new URLSearchParams(u.search);
    if (txtOpts) {
        for (const [k, v] of new URLSearchParams(txtOpts)) {
            if (!mergedParams.has(k)) mergedParams.set(k, v);
        }
    }
    if (!mergedParams.has('tls')) mergedParams.set('tls', 'true');
    if (!mergedParams.has('authSource')) mergedParams.set('authSource', 'admin');

    const query = mergedParams.toString();
    const resolved = `mongodb://${userInfo}${seeds.join(',')}/${db.replace(/^\//, '')}${query ? '?' + query : ''}`;
    return resolved;
}

export async function connectDB() {
    const originalUri = process.env.MONGODB_URI;
    if (!originalUri) {
        console.error('MONGODB_URI is not set in .env');
        process.exit(1);
    }

    bindListeners();

    const MAX_RETRIES = 20;
    let retries = 0;
    let uri = originalUri;
    let triedDoH = false;

    while (!isConnected) {
        try {
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                family: 4,
            });
            return;
        } catch (err) {
            isConnected = false;
            retries++;
            const reason = classifyError(err);

            // If this looks like a DNS SRV failure, resolve via DoH once and
            // switch to a plain mongodb:// URI with explicit seed list.
            const msg = (err && err.message) || '';
            const looksLikeSrvFailure = /querySrv|queryTxt|ENOTFOUND|EAI_AGAIN|ECONNREFUSED.*_mongodb/i.test(msg);
            if (!triedDoH && looksLikeSrvFailure && originalUri.startsWith('mongodb+srv://')) {
                triedDoH = true;
                try {
                    console.warn('Native DNS SRV failed — resolving via DNS-over-HTTPS...');
                    uri = await resolveSrvViaDoH(originalUri);
                    const safe = uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');
                    console.warn(`DoH resolved URI: ${safe}`);
                    try { await mongoose.disconnect(); } catch { }
                    continue;
                } catch (dohErr) {
                    console.warn(`DoH fallback failed: ${dohErr.message}`);
                }
            }

            if (retries >= MAX_RETRIES) {
                console.error(`MongoDB connection failed after ${MAX_RETRIES} attempts.`);
                console.error(reason);
                process.exit(1);
            }
            const delay = Math.min(3000 * Math.pow(1.5, Math.min(retries - 1, 5)), 15000);
            console.warn(`MongoDB not available — retry ${retries}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s...`);
            console.warn(`Reason: ${reason}`);
            try { await mongoose.disconnect(); } catch { }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

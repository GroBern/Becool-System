/**
 * Icon generator for Becool Surf PWA.
 *
 * Priority:
 *   1. If `public/brand/logo.png` (or .jpg / .webp) exists → use it as the
 *      source and produce clean resized PNGs via `sharp`.
 *   2. Else if `public/brand/logo-becool.svg` exists → rasterize it via `sharp`.
 *   3. Else → fall back to the built-in placeholder generator (no deps).
 *
 * Outputs:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png    (padded safe zone)
 *   public/apple-touch-icon.png           (180×180)
 *
 * Run: `node scripts/gen-icons.mjs`
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const brandDir = join(publicDir, 'brand');
const iconDir = join(publicDir, 'icons');
mkdirSync(iconDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });

const candidates = [
  ['png', join(brandDir, 'logo.png')],
  ['jpg', join(brandDir, 'logo.jpg')],
  ['jpeg', join(brandDir, 'logo.jpeg')],
  ['webp', join(brandDir, 'logo.webp')],
  ['svg', join(brandDir, 'logo-becool.svg')],
];

const source = candidates.find(([, p]) => existsSync(p));

async function generateWithSharp(srcPath) {
  const sharp = (await import('sharp')).default;
  console.log(`Using source: ${srcPath}`);

  const sizes = [
    { file: join(iconDir, 'icon-192.png'), size: 192, pad: 0 },
    { file: join(iconDir, 'icon-512.png'), size: 512, pad: 0 },
    // Maskable needs ~10% padding on each side so the icon is fully inside the safe zone
    { file: join(iconDir, 'icon-maskable-512.png'), size: 512, pad: 56 },
    { file: join(publicDir, 'apple-touch-icon.png'), size: 180, pad: 0 },
  ];

  for (const { file, size, pad } of sizes) {
    const inner = size - pad * 2;
    const resized = await sharp(srcPath)
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    if (pad === 0) {
      writeFileSync(file, resized);
    } else {
      // Place the resized icon on a black background with padding (maskable icons
      // look best on a solid brand-colored backdrop — the Be Cool logo is black/white
      // so black reads as "the background")
      const composed = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      })
        .composite([{ input: resized, top: pad, left: pad }])
        .png()
        .toBuffer();
      writeFileSync(file, composed);
    }
    console.log(`  ✓ ${file} (${size}×${size}${pad ? `, pad ${pad}` : ''})`);
  }
}

// ────────────────────────────────────────────────────────────────
// Fallback: minimal pure-Node PNG generator (no deps) — used only when
// no brand source file exists.
// ────────────────────────────────────────────────────────────────
function fallbackGenerate() {
  console.log('No brand source found — generating placeholder icons.');
  const FONT_B = [
    [1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0],
  ];

  function crc32(buf) {
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  function makePng(size, { bgTop, bgBot, padding = 0 }) {
    const raw = Buffer.alloc(size * (size * 4 + 1));
    const glyphW = 5, glyphH = 7;
    const scale = Math.floor(size / 12);
    const gx0 = Math.floor((size - glyphW * scale) / 2);
    const gy0 = Math.floor((size - glyphH * scale) / 2);

    for (let y = 0; y < size; y++) {
      const rowStart = y * (size * 4 + 1);
      raw[rowStart] = 0;
      const t = y / (size - 1);
      const r = Math.round(bgTop[0] * (1 - t) + bgBot[0] * t);
      const g = Math.round(bgTop[1] * (1 - t) + bgBot[1] * t);
      const b = Math.round(bgTop[2] * (1 - t) + bgBot[2] * t);
      for (let x = 0; x < size; x++) {
        const o = rowStart + 1 + x * 4;
        const inPad = x >= padding && y >= padding && x < size - padding && y < size - padding;
        let R = r, G = g, B = b, A = 255;
        if (!inPad) { R = bgTop[0]; G = bgTop[1]; B = bgTop[2]; }
        const gx = x - gx0, gy = y - gy0;
        if (gx >= 0 && gy >= 0 && gx < glyphW * scale && gy < glyphH * scale) {
          const fx = Math.floor(gx / scale);
          const fy = Math.floor(gy / scale);
          if (FONT_B[fy] && FONT_B[fy][fx]) { R = G = B = 255; }
        }
        raw[o] = R; raw[o + 1] = G; raw[o + 2] = B; raw[o + 3] = A;
      }
    }
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const idat = deflateSync(raw);
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  }

  const purple = [139, 92, 246];
  const deep = [109, 40, 217];

  writeFileSync(join(iconDir, 'icon-192.png'), makePng(192, { bgTop: purple, bgBot: deep }));
  writeFileSync(join(iconDir, 'icon-512.png'), makePng(512, { bgTop: purple, bgBot: deep }));
  writeFileSync(join(iconDir, 'icon-maskable-512.png'), makePng(512, { bgTop: purple, bgBot: deep, padding: 64 }));
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), makePng(180, { bgTop: purple, bgBot: deep }));
}

// ────────────────────────────────────────────────────────────────
try {
  if (source) {
    await generateWithSharp(source[1]);
  } else {
    fallbackGenerate();
  }
  console.log('\nIcons ready in', iconDir);
} catch (err) {
  console.error('Icon generation failed:', err.message);
  console.error('Falling back to placeholder icons.');
  fallbackGenerate();
}

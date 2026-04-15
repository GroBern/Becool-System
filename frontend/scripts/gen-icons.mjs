// Generates simple solid-color PNG icons with a centered "B" glyph using
// only Node's built-in modules (zlib + Buffer). No external deps.
// Output: public/icons/icon-{192,512}.png and icon-maskable-512.png
// Run:    node scripts/gen-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

// Minimal 5x7 bitmap font for letter "B"
const FONT_B = [
  [1,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,1,1,1,0],
];

function crc32(buf) {
  let c, crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
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
  // Build raw RGBA pixels with a vertical gradient + white "B" glyph centered.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const glyphW = 5, glyphH = 7;
  const scale = Math.floor(size / 12);
  const gx0 = Math.floor((size - glyphW * scale) / 2);
  const gy0 = Math.floor((size - glyphH * scale) / 2);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter byte
    // gradient factor
    const t = y / (size - 1);
    const r = Math.round(bgTop[0] * (1 - t) + bgBot[0] * t);
    const g = Math.round(bgTop[1] * (1 - t) + bgBot[1] * t);
    const b = Math.round(bgTop[2] * (1 - t) + bgBot[2] * t);
    for (let x = 0; x < size; x++) {
      const o = rowStart + 1 + x * 4;
      // rounded-rect-ish mask for maskable safe area padding
      const inPad = x >= padding && y >= padding && x < size - padding && y < size - padding;
      let R = r, G = g, B = b, A = 255;
      if (!inPad) { R = bgTop[0]; G = bgTop[1]; B = bgTop[2]; }
      // glyph
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
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sky = [14, 165, 233];   // #0ea5e9
const deep = [3, 105, 161];   // #0369a1

writeFileSync(resolve(outDir, 'icon-192.png'), makePng(192, { bgTop: sky, bgBot: deep }));
writeFileSync(resolve(outDir, 'icon-512.png'), makePng(512, { bgTop: sky, bgBot: deep }));
writeFileSync(resolve(outDir, 'icon-maskable-512.png'), makePng(512, { bgTop: sky, bgBot: deep, padding: 64 }));
writeFileSync(resolve(__dirname, '../public/apple-touch-icon.png'), makePng(180, { bgTop: sky, bgBot: deep }));

console.log('Icons generated in', outDir);

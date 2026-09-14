import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(width, height, rgbaFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgbaFn(x, y, width, height);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const body = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return body;
}

function plus(x, y, n, barRatio, thickRatio) {
  const cx = n / 2;
  const cy = n / 2;
  const bar = n * barRatio;
  const thick = Math.max(3, n * thickRatio);
  return (
    (Math.abs(x - cx) < thick && Math.abs(y - cy) < bar) ||
    (Math.abs(y - cy) < thick && Math.abs(x - cx) < bar)
  );
}

function mark(x, y, n) {
  const bg = [242, 242, 247, 255];
  const ink = [0, 122, 255, 255];
  if (plus(x, y, n, 0.18, 0.07)) return ink;
  return bg;
}

function maskable(x, y, n) {
  const bg = [0, 122, 255, 255];
  const ink = [255, 255, 255, 255];
  if (plus(x, y, n, 0.14, 0.055)) return ink;
  return bg;
}

for (const size of [180, 192, 512]) {
  const buf = png(size, size, (x, y, w) => mark(x, y, w));
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  writeFileSync(join(outDir, name), buf);
}

for (const size of [192, 512]) {
  writeFileSync(
    join(outDir, `icon-${size}-maskable.png`),
    png(size, size, (x, y, w) => maskable(x, y, w)),
  );
}

console.log("wrote icons to", outDir);

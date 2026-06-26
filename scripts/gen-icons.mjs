// Generate PWA PNG icons from scratch — no image dependencies.
// Draws the Omixfit mark (lime rounded square + dark lightning bolt) into an
// RGBA buffer and encodes a PNG using only Node's zlib.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const INK = [11, 14, 19, 255];
const LIME = [214, 255, 61, 255];

// bolt polygon in a 0..100 space (matches favicon.svg path)
const BOLT = [
  [56, 14], [30, 56], [48, 56], [44, 86], [72, 42], [52, 42],
];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function draw(size, { maskable }) {
  const buf = Buffer.alloc(size * size * 4);
  const r = maskable ? 0 : size * 0.22; // corner radius (0 = full bleed for maskable)
  // maskable keeps the bolt inside a ~78% safe zone
  const pad = maskable ? size * 0.13 : 0;
  const inner = size - pad * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-rect background test
      let bg = true;
      if (r > 0) {
        const cx = Math.min(Math.max(x, r), size - r);
        const cy = Math.min(Math.max(y, r), size - r);
        const dx = x - cx;
        const dy = y - cy;
        bg = dx * dx + dy * dy <= r * r;
      }
      // bolt test (normalize to 0..100 within inner area)
      const bx = ((x - pad) / inner) * 100;
      const by = ((y - pad) / inner) * 100;
      const onBolt = bg && pointInPoly(bx, by, BOLT);

      let c;
      if (!bg) c = [0, 0, 0, 0];
      else if (onBolt) c = INK;
      else c = LIME;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = c[3];
    }
  }
  return buf;
}

// ---- minimal PNG encoder -----------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // raw with per-scanline filter byte (0)
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(name, size, opts) {
  const png = encodePNG(draw(size, opts), size);
  writeFileSync(join(OUT, name), png);
  console.log(`  ✓ ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)}kb)`);
}

console.log("Generating Omixfit icons…");
write("icon-192.png", 192, { maskable: false });
write("icon-512.png", 512, { maskable: false });
write("icon-maskable-512.png", 512, { maskable: true });
console.log("Done.");

// Writes public/fx/grain.png: a 512px tile of soft monochrome noise for the film-grain overlay.
import fs from "node:fs";
import zlib from "node:zlib";
const N = 512;
let s = 1234567;
const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
const raw = Buffer.alloc((N * 2 + 1) * N);
for (let y = 0; y < N; y++) {
  raw[y * (N * 2 + 1)] = 0;
  for (let x = 0; x < N; x++) {
    const g = (rand() + rand() + rand()) / 3; // softer than uniform
    const i = y * (N * 2 + 1) + 1 + x * 2;
    raw[i] = Math.round(g * 255);
    raw[i + 1] = 255;
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8;
ihdr[9] = 4; // grayscale + alpha
fs.mkdirSync("public/fx", { recursive: true });
fs.writeFileSync(
  "public/fx/grain.png",
  Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]),
);
console.log("grain ok");

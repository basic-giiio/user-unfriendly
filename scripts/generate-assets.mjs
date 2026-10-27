import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../public/assets/', import.meta.url);
mkdirSync(out, { recursive: true });
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(data) {
  let c = 0xffffffff;
  for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 4 + 1); rows[offset] = 0;
    pixels.copy(rows, offset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function image(w, h, color = [0,0,0,0]) {
  const pixels = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) pixels.set(color, i * 4);
  return {
    set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) pixels.set(c, (y * w + x) * 4); },
    rect(x, y, rw, rh, c) { for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) this.set(xx, yy, c); },
    colorAt(x, y) { const i = (y * w + x) * 4; return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]; },
    save(name) { writeFileSync(new URL(name, out), png(w, h, pixels)); }
  };
}
function cloud(img, x, y) {
  const c = [221,243,255,255], soft = [168,218,250,255];
  img.rect(x + 3, y, 7, 2, soft); img.rect(x + 1, y + 2, 15, 4, c); img.rect(x + 4, y + 6, 11, 2, soft);
  img.rect(x + 5, y + 2, 5, 2, [245,251,255,255]);
}
// Modular pieces keep the scene movable while retaining the blue XP wallpaper base.
const sky = image(320, 180, [19,117,204,255]);
for (let y = 0; y < 180; y++) {
  const t = Math.floor(y / 6) / 29;
  const c = [Math.round(8 + 41*t), Math.round(79 + 105*t), Math.round(165 + 69*t), 255];
  sky.rect(0, y, 320, 1, c);
}
function pixelScale(source, factor, width, height) {
  const scaled = image(width * factor, height * factor);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) scaled.rect(x * factor, y * factor, factor, factor, source.colorAt(x, y));
  return scaled;
}
pixelScale(sky, 6, 320, 180).save('xp-pixel-wallpaper.png');

const cloudAsset = image(40, 22);
cloud(cloudAsset, 1, 4); cloudAsset.rect(7, 7, 25, 9, [226,246,255,255]);
cloudAsset.rect(4, 12, 32, 5, [185,224,248,255]); cloudAsset.rect(12, 4, 18, 5, [242,251,255,255]);
pixelScale(cloudAsset, 4, 40, 22).save('pixel-cloud.png');

const sunAsset = image(32, 32);
sunAsset.rect(2, 8, 28, 16, [74,180,232,130]); sunAsset.rect(6, 4, 20, 24, [104,198,239,165]);
sunAsset.rect(12, 1, 8, 4, [255,218,95,255]); sunAsset.rect(12, 27, 8, 4, [255,218,95,255]);
sunAsset.rect(2, 12, 4, 8, [255,218,95,255]); sunAsset.rect(26, 12, 4, 8, [255,218,95,255]);
sunAsset.rect(7, 6, 18, 20, [255,186,39,255]); sunAsset.rect(9, 8, 14, 16, [255,211,76,255]);
sunAsset.rect(13, 11, 7, 11, [255,239,148,255]); sunAsset.rect(9, 8, 6, 3, [255,244,183,255]);
pixelScale(sunAsset, 4, 32, 32).save('pixel-sun.png');

const flag = image(40, 34);
flag.rect(6, 8, 12, 10, [241,48,55,255]); flag.rect(21, 5, 13, 12, [48,174,72,255]);
flag.rect(4, 21, 14, 11, [31,119,224,255]); flag.rect(21, 19, 14, 13, [255,191,31,255]);
flag.rect(6, 8, 12, 2, [255,128,119,255]); flag.rect(21, 5, 13, 2, [139,234,126,255]);
flag.rect(4, 21, 14, 2, [133,205,255,255]); flag.rect(21, 19, 14, 2, [255,230,117,255]);
flag.rect(18, 9, 2, 9, [255,255,255,175]); flag.rect(18, 22, 2, 9, [255,255,255,175]);
pixelScale(flag, 4, 40, 34).save('xp-window-logo.png');

// Two-line 8-bit title to sit beside the Windows flag on the desktop.
const bitmapGlyphs = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','11001','10101','10011','10011','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
};
const title = image(38, 18);
function drawBitmapWord(word, y, color) {
  const startX = Math.floor((38 - word.length * 6) / 2);
  [...word].forEach((letter, letterIndex) => {
    const glyph = bitmapGlyphs[letter];
    glyph.forEach((row, rowIndex) => [...row].forEach((pixel, columnIndex) => {
      if (pixel === '1') {
        const x = startX + letterIndex * 6 + columnIndex;
        title.set(x + 1, y + rowIndex + 1, [5,30,83,255]);
        title.set(x, y + rowIndex, color);
      }
    }));
  });
}
drawBitmapWord('WINDOW', 0, [255,227,111,255]);
drawBitmapWord('XTREME', 10, [244,250,255,255]);
pixelScale(title, 5, 38, 18).save('window-xtreme-title.png');

const hill = image(180, 50);
for (let x = 0; x < 180; x += 3) {
  const crest = 18 + Math.round(10 * Math.sin(x / 26) + 5 * Math.sin(x / 12));
  hill.rect(x, crest, 3, 50 - crest, [20 + (x % 5) * 2, 136 + (x % 4) * 6, 48, 255]);
  hill.rect(x, crest, 3, 2, [78,193,70,255]);
}
hill.rect(0, 46, 180, 4, [16,112,40,255]);
pixelScale(hill, 5, 180, 50).save('xp-green-hill.png');

const grass = image(30, 15);
grass.rect(0, 11, 30, 4, [18,125,48,255]);
grass.rect(3, 8, 4, 7, [51,173,62,255]); grass.rect(7, 4, 4, 11, [72,193,69,255]);
grass.rect(11, 7, 4, 8, [36,158,52,255]); grass.rect(17, 2, 4, 13, [81,199,68,255]);
grass.rect(21, 6, 4, 9, [38,159,48,255]); grass.rect(25, 8, 4, 7, [56,180,61,255]);
pixelScale(grass, 5, 30, 15).save('pixel-grass.png');

// Classic Windows account tile: a blue glass orb with a simple user silhouette.
const account = image(64, 64);
account.rect(17, 3, 30, 4, [15,51,111,255]); account.rect(10, 7, 44, 5, [15,51,111,255]);
account.rect(6, 12, 52, 37, [15,51,111,255]); account.rect(10, 49, 44, 7, [15,51,111,255]);
account.rect(17, 56, 30, 4, [15,51,111,255]);
account.rect(15, 7, 34, 6, [90,182,241,255]); account.rect(10, 13, 44, 31, [47,139,216,255]);
account.rect(14, 11, 36, 7, [146,219,252,255]); account.rect(10, 39, 44, 9, [23,111,196,255]);
account.rect(19, 41, 26, 10, [30,73,148,255]); account.rect(22, 37, 20, 7, [245,190,139,255]);
account.rect(21, 19, 22, 20, [104,65,40,255]); account.rect(24, 16, 16, 22, [247,198,150,255]);
account.rect(25, 16, 14, 4, [113,67,40,255]); account.rect(23, 19, 3, 11, [113,67,40,255]);
account.rect(39, 19, 3, 11, [113,67,40,255]); account.rect(27, 26, 2, 2, [62,47,39,255]);
account.rect(35, 26, 2, 2, [62,47,39,255]); account.rect(30, 32, 6, 2, [185,94,84,255]);
account.rect(11, 14, 3, 24, [182,230,255,255]); account.rect(50, 17, 2, 20, [23,103,182,255]);
account.save('xp-account-icon.png');

// Recycle bin in cool gray/teal glass with XP era chunky pixel geometry.
const bin = image(64, 64);
bin.rect(18, 14, 29, 5, [202,241,252,255]);
bin.rect(15, 18, 35, 3, [249,255,255,255]);
bin.rect(19, 21, 27, 29, [147,212,229,255]);
bin.rect(22, 23, 21, 25, [222,246,250,255]);
bin.rect(18, 48, 30, 4, [105,176,197,255]);
bin.rect(25, 10, 15, 4, [231,250,255,255]); bin.rect(22, 13, 20, 3, [184,227,240,255]);
bin.rect(26, 24, 3, 21, [102,176,201,255]); bin.rect(32, 24, 3, 21, [102,176,201,255]); bin.rect(38, 24, 3, 21, [102,176,201,255]);
bin.rect(18, 20, 3, 28, [255,255,255,255]); bin.rect(45, 22, 2, 22, [92,159,183,255]);
bin.rect(13, 54, 38, 3, [62,120,161,255]); bin.rect(17, 52, 30, 2, [108,164,197,255]);
bin.save('recycle-bin-icon.png');

// Pixel cursor arrow and its closed-hand dragging state.
const arrow = image(20, 24);
const arrowRows = ['1...............','11..............','121.............','1221............','12221...........','122221..........','1222221.........','12222221........','122222221.......','1222222221......','12222222221.....','122222222221....','1222222222221...','122222221111....','1221221221......','121.1221221.....','11..122.1221....','....122..1221...','....122...1221..','....122....1221.','.....11.....111.'];
for (let y = 0; y < arrowRows.length; y++) for (let x = 0; x < arrowRows[y].length; x++) {
  const p = arrowRows[y][x]; if (p === '1') arrow.set(x,y,[0,0,0,255]); if (p === '2') arrow.set(x,y,[255,255,255,255]);
}
arrow.save('pixel-cursor.png');
const hand = image(20, 24);
hand.rect(7, 2, 3, 10, [0,0,0,255]); hand.rect(8, 3, 1, 8, [255,255,255,255]);
hand.rect(10, 5, 3, 8, [0,0,0,255]); hand.rect(11, 6, 1, 6, [255,255,255,255]);
hand.rect(13, 7, 3, 7, [0,0,0,255]); hand.rect(14, 8, 1, 5, [255,255,255,255]);
hand.rect(16, 9, 3, 6, [0,0,0,255]); hand.rect(17, 10, 1, 4, [255,255,255,255]);
hand.rect(5, 10, 3, 9, [0,0,0,255]); hand.rect(6, 11, 1, 7, [255,255,255,255]);
hand.rect(8, 12, 9, 8, [0,0,0,255]); hand.rect(9, 13, 7, 6, [255,255,255,255]);
hand.rect(10, 20, 6, 2, [0,0,0,255]); hand.save('pixel-hold-cursor.png');


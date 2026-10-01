// Mechanical resize/padding only: no crop, redraw, recoloring, or AI edits.
// NODE_PATH may point to a runtime containing sharp. Pass the supplied PNG once.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const original = path.join(root, 'assets/launcher/ICON-TAPtoTESt.png');
const hash = data => createHash('sha256').update(data).digest('hex');

async function square(source, size, content, transparent) {
  const resized = await sharp(source).resize(content, content, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: transparent ? '#00000000' : '#ffffff' } })
    .composite([{ input: resized, left: Math.floor((size - content) / 2), top: Math.floor((size - content) / 2) }]).png().toBuffer();
}
async function main() {
  if (process.argv[2]) {
    const supplied = fs.readFileSync(path.resolve(process.argv[2]));
    fs.mkdirSync(path.dirname(original), { recursive: true });
    if (fs.existsSync(original)) assert.equal(hash(fs.readFileSync(original)), hash(supplied), 'Stored original differs; review explicitly before replacing it.');
    else fs.copyFileSync(path.resolve(process.argv[2]), original, fs.constants.COPYFILE_EXCL);
  }
  const source = fs.readFileSync(original);
  const meta = await sharp(source).metadata();
  assert.equal(meta.format, 'png');
  const report = { original: 'assets/launcher/ICON-TAPtoTESt.png', sourceSHA256: hash(source), width: meta.width, height: meta.height, adaptiveDp: { canvas: 108, content: 60, padding: 24 }, files: [] };
  for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
    const directory = path.join(root, 'android/app/src/main/res', 'mipmap-' + density);
    const size = 48 * scale;
    const foreground = await square(source, 108 * scale, 60 * scale, true);
    const legacy = await square(source, size, 40 * scale, false);
    const round = await sharp(legacy).composite([{ input: Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    for (const [name, data] of [['ic_launcher_foreground.png', foreground], ['ic_launcher.png', legacy], ['ic_launcher_round.png', round]]) {
      fs.writeFileSync(path.join(directory, name), data);
      report.files.push({ path: path.relative(root, path.join(directory, name)), sha256: hash(data) });
    }
  }
  const store = path.join(root, 'store/taptotest-icon-512.png');
  const storeData = await sharp(source).resize(512, 512, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
  fs.writeFileSync(store, storeData);
  report.files.push({ path: path.relative(root, store), sha256: hash(storeData) });
  // Confirm the dark lettering survives the stricter central 66dp circle.
  const { data, info } = await sharp(await square(source, 432, 240, true)).raw().toBuffer({ resolveWithObject: true });
  let darkPixelsOutsideSafeCircle = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i+3] > 128 && data[i] < 80 && data[i+1] < 80 && data[i+2] < 80 && Math.hypot(x + .5 - 216, y + .5 - 216) > 132) darkPixelsOutsideSafeCircle++;
  }
  assert.equal(darkPixelsOutsideSafeCircle, 0, 'Lettering extends outside the conservative circular safe zone');
  report.darkPixelsOutside66DpCircle = darkPixelsOutsideSafeCircle;
  fs.writeFileSync(path.join(root, 'store/taptotest-icon-manifest.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sourceSHA256: report.sourceSHA256, generated: report.files.length, darkPixelsOutsideSafeCircle }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

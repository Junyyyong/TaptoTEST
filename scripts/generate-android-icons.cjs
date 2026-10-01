// Mechanical resize/padding only: no crop, redraw, recoloring, or AI edits.
// The supplied full-bleed artwork fills legacy/store icons. Adaptive launchers
// use a 72dp picture on the matching yellow background; Android owns the mask.
// NODE_PATH may point to a runtime containing sharp. Pass the supplied PNG once.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const originalRelative = 'assets/launcher/Tepee-icon-06.png';
const original = path.join(root, originalRelative);
const background = '#fccf00';
const hash = data => createHash('sha256').update(data).digest('hex');

async function square(source, size, content, transparent) {
  const resized = await sharp(source).resize(content, content, { fit: 'contain', background }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: transparent ? '#00000000' : background } })
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
  const report = { original: originalRelative, sourceSHA256: hash(source), width: meta.width, height: meta.height,
    background, layout: 'full-bleed', adaptiveDp: { canvas: 108, content: 72, padding: 18 }, files: [] };
  for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
    const directory = path.join(root, 'android/app/src/main/res', 'mipmap-' + density);
    const size = 48 * scale;
    fs.mkdirSync(directory, { recursive: true });
    const foreground = await square(source, 108 * scale, 72 * scale, true);
    const legacy = await square(source, size, size, false);
    const round = await sharp(legacy).composite([{ input: Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    for (const [name, data] of [['ic_launcher_foreground.png', foreground], ['ic_launcher.png', legacy], ['ic_launcher_round.png', round]]) {
      fs.writeFileSync(path.join(directory, name), data);
      report.files.push({ path: path.relative(root, path.join(directory, name)), sha256: hash(data) });
    }
  }
  const store = path.join(root, 'store/taptotest-icon-512.png');
  const storeData = await sharp(source).resize(512, 512, { fit: 'contain', background }).flatten({ background }).png().toBuffer();
  fs.writeFileSync(store, storeData);
  report.files.push({ path: path.relative(root, store), sha256: hash(storeData) });
  assert.equal(hash(fs.readFileSync(original)), report.sourceSHA256, 'Never modify the supplied artwork');
  fs.writeFileSync(path.join(root, 'store/taptotest-icon-manifest.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sourceSHA256: report.sourceSHA256, generated: report.files.length, background, adaptiveDp: report.adaptiveDp }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

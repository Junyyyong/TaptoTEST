// Diagnostic launcher-mask previews only; the supplied PNG stays untouched.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
async function main() {
  fs.writeFileSync(path.join(__dirname, 'icon-before.png'), execFileSync('git', ['show', 'HEAD:store/taptotest-icon-512.png'], { cwd: root }));
  fs.copyFileSync(path.join(root, 'store/taptotest-icon-512.png'), path.join(__dirname, 'icon-after.png'));
  const foreground = path.join(root, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png');
  const canvas = await sharp({ create: { width: 432, height: 432, channels: 4, background: '#fccf00' } })
    .composite([{ input: foreground }]).png().toBuffer();
  // Android's visible 72dp area (central 288px of the 108dp xxxhdpi image).
  const visible = await sharp(canvas).extract({ left: 72, top: 72, width: 288, height: 288 }).resize(512, 512).png().toBuffer();
  const masks = {
    circle: '<circle cx="256" cy="256" r="256" fill="white"/>',
    rounded: '<rect width="512" height="512" rx="112" fill="white"/>',
  };
  for (const [name, shape] of Object.entries(masks)) {
    await sharp(visible).composite([{ input: Buffer.from(`<svg width="512" height="512">${shape}</svg>`), blend: 'dest-in' }])
      .png().toFile(path.join(__dirname, `icon-${name}-preview.png`));
  }
  console.log('Icon before/after and two mask previews saved');
}
main().catch(e => { console.error(e); process.exitCode = 1; });

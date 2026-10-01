const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), store = path.join(root, 'store');
const captures = JSON.parse(fs.readFileSync(path.join(__dirname, 'verification.json')));
const images = ['taptotest-icon-512.png', ...captures.screenshots.map(s => 'screenshots/2026-10-01/' + s.file)];
const destination = path.join(store, 'TAPtoTEST-images-20261001.zip');
assert.ok(!fs.existsSync(destination), 'Do not overwrite an earlier package');
assert.equal(images.length, 8);
execFileSync('zip', ['-j', destination, ...images], { cwd: store });
const zipped = execFileSync('unzip', ['-Z1', destination], { encoding: 'utf8' }).trim().split('\n');
assert.deepEqual(zipped, images.map(file => path.basename(file)));
const sha256 = data => createHash('sha256').update(data).digest('hex');
for (const file of images) {
  const original = fs.readFileSync(path.join(store, file));
  const archived = execFileSync('unzip', ['-p', destination, path.basename(file)], { maxBuffer: 4 * 1024 * 1024 });
  assert.equal(sha256(original), sha256(archived), file + ' must stay byte-identical in ZIP');
}
fs.writeFileSync(path.join(__dirname, 'download-verification.json'), JSON.stringify({
  zip: path.relative(root, destination), sha256: sha256(fs.readFileSync(destination)),
  images, entries: zipped, eachPngByteIdentical: true, bytes: fs.statSync(destination).size,
}, null, 2) + '\n', { flag: 'wx' });
console.log('PASS: eight original PNGs packaged without resizing');

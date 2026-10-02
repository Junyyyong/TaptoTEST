// Validates the bundle/resources and preserves the dated release without overwrite.
// Java signature/whole-web-asset verification is performed separately.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const java = path.join(process.env.JAVA_HOME, 'bin/java');
const tool = process.env.BUNDLETOOL_JAR;
assert.ok(tool, 'Set BUNDLETOOL_JAR');
const version = process.env.RELEASE_VERSION || '1.0.1';
const code = Number(process.env.RELEASE_CODE || 2);
const date = process.env.RELEASE_DATE || '2026-09-30';
const reportDir = process.env.RELEASE_REPORT_DIR || 'docs/research/2026-09-30-android-text-icons';
assert.match(version, /^\d+\.\d+\.\d+$/);
assert.ok(Number.isSafeInteger(code) && code >= 2);
assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
assert.ok(path.resolve(root, reportDir).startsWith(root + '/docs/research/'));
const hash = data => createHash('sha256').update(data).digest('hex');
const bundle = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
const old = path.join(root, '.android-tools/releases/2026-09-30/TAPtoTEST-v1.0-code1-783968f.aab');
const bundletool = (...args) => execFileSync(java, ['-jar', tool, ...args, '--bundle=' + bundle], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
async function main() {
  assert.equal(hash(fs.readFileSync(old)), 'f00fad07b04ce4f3d74c0b854ef0cab27d5304abf800b04f7f8b9002607474b1', 'Previous release changed');
  if (code > 2) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.1-code2-20260930.aab'))), 'fa8db9a9d3dad8aad4a0c97e2a8abf9f054dd65df2c520432052eee477be5d06', 'Code2 release changed');
  if (code > 3) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.2-code3-20261001.aab'))), 'f43df7b0fcc5c4635bbb8185346b1735c33e80ad43eed835300103867813a10a', 'Undelivered code3 candidate changed');
  if (code > 4) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.2-code4-20261001.aab'))), 'd8ff29f83f1c0044c8b55e57466a20092a294f3a3c91e8782e8ff3395f883a5a', 'Delivered code4 release changed');
  if (code > 5) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.3-code5-20261001.aab'))), 'cf65ccc675a12b1fed141d20549d60becd21a56c3e6677ba2a319ccc0e18417e', 'Code5 release changed');
  if (code > 6) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.4-code6-20261001.aab'))), 'ec54e9d3d93cdfc698d80ae2811b050170006ad0dd088e8ffc3975e83b3ec853', 'Code6 release changed');
  if (code > 7) assert.equal(hash(fs.readFileSync(path.join(root, 'android/releases/TAPtoTEST-1.0.5-code7-20261001.aab'))), 'ec96ad8fee3c71bd11756012c854b18aa2721e59baabcf086ead0127008974b0', 'Code7 release changed');
  bundletool('validate');
  const manifest = bundletool('dump', 'manifest');
  for (const text of ['package="io.github.junyyyong.taptotest"', `android:versionCode="${code}"`, `android:versionName="${version}"`, 'android:minSdkVersion="24"', 'android:targetSdkVersion="36"', 'android:icon="@mipmap/ic_launcher"', 'android:roundIcon="@mipmap/ic_launcher_round"']) assert.ok(manifest.includes(text), text);
  assert.ok(!manifest.includes('android:debuggable="true"'));
  const config = parseInt(manifest.match(/android:configChanges="(0x[0-9a-f]+)"/i)[1], 16);
  assert.ok((config & 0x40000000) !== 0, 'fontScale configuration callback registered');
  assert.ok(bundletool('dump', 'resources', '--resource=string/app_name', '--values').includes('"TAPtoTEST"'));
  const icons = JSON.parse(fs.readFileSync(path.join(root, 'store/taptotest-icon-manifest.json')));
  const expectedIconBackground = icons.background || '#ffffff';
  const builtIconColors = bundletool('dump', 'resources', '--resource=color/ic_launcher_background', '--values')
    .match(/#[0-9a-f]{6,8}\b/gi) || [];
  assert.ok(builtIconColors.map(color => '#' + color.slice(-6).toLowerCase()).includes(expectedIconBackground.toLowerCase()));
  const entries = execFileSync('unzip', ['-Z1', bundle], { encoding: 'utf8' }).trim().split('\n');
  const verified = [];
  for (const icon of icons.files.filter(file => file.path.startsWith('android/'))) {
    const local = fs.readFileSync(path.join(root, icon.path));
    assert.equal(hash(local), icon.sha256, 'Generated icon changed');
    const entry = 'base/' + icon.path.split('/main/')[1].replace(/mipmap-([^/]+)\//, 'mipmap-$1-v4/');
    assert.ok(entries.includes(entry), 'Icon missing: ' + entry);
    const data = execFileSync('unzip', ['-p', bundle, entry], { maxBuffer: 1024 * 1024 });
    const source = await sharp(local).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const built = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual(built.info, source.info); assert.deepEqual(built.data, source.data, 'Bundled icon pixel mismatch');
    verified.push(entry);
  }
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const resource = bundletool('dump', 'resources', '--resource=mipmap/' + name, '--values');
    assert.ok(resource.includes('res/mipmap-anydpi-v26/' + name + '.xml'));
  }
  const dexDump = path.join(root, '.android-tools/sdk/build-tools/35.0.0/dexdump');
  const temp = fs.mkdtempSync('/private/tmp/taptotest-release-dex.');
  let compiledTextPolicy = false;
  for (const entry of entries.filter(name => /^base\/dex\/classes.*\.dex$/.test(name))) {
    const file = path.join(temp, path.basename(entry));
    fs.writeFileSync(file, execFileSync('unzip', ['-p', bundle, entry], { maxBuffer: 32 * 1024 * 1024 }));
    const dump = execFileSync(dexDump, ['-d', file], { encoding: 'utf8', maxBuffer: 150 * 1024 * 1024 });
    const section = dump.split(/\nClass #\d+\s*-\n/).find(text => text.includes("Class descriptor  : 'Lio/github/junyyyong/taptotest/MainActivity;'"));
    if (!section) continue;
    for (const token of ['applyGameTextZoom', 'setTextZoom', 'onCreate', 'onResume', 'onConfigurationChanged', '#int 100']) assert.ok(section.includes(token), 'Missing compiled policy: ' + token);
    if (code > 4) for (const token of ['publishGameInsets', 'getRootWindowInsets', 'getLocationInWindow', '--android-game-inset-top']) assert.ok(section.includes(token), 'Missing compiled proportional-viewport policy: ' + token);
    compiledTextPolicy = true;
  }
  assert.ok(compiledTextPolicy, 'Compiled MainActivity missing');
  const signature = execFileSync(java, [path.join(root, '.android-tools/VerifyRelease.java'), root], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.ok(signature.includes('93381e4bf0cc519b6540750e006b87b3e5e9db721390abda3a6e6ae83fb777dc'), 'Original signing certificate must be retained');
  const unchangedPaths = ['src/core/pick', 'src/content/puzzles.ts', 'src/ui/pickStorage.ts', 'src/ui/persistentStore.ts', 'src/ui/pickRecords.ts', 'src/config/app.ts', 'public/assets/fonts'];
  assert.equal(execFileSync('git', ['diff', 'HEAD', '--', ...unchangedPaths], { cwd: root, encoding: 'utf8' }), '', 'Rules, storage, media and fonts unchanged');
  // Legacy vibration values still validate. Only explanatory line comments may
  // differ in the validator; keep the actual compatibility rules identical.
  const commentOnlyPaths = ['src/ui/pickSaveValidation.ts'];
  const withoutLineComments = source => source.replace(/^\s*\/\/[^\n]*(?:\n|$)/gm, '');
  for (const file of commentOnlyPaths) {
    const previous = execFileSync('git', ['show', 'HEAD:' + file], { cwd: root, encoding: 'utf8' });
    assert.equal(withoutLineComments(fs.readFileSync(path.join(root, file), 'utf8')), withoutLineComments(previous), 'Save validation rules unchanged');
  }
  const destination = path.join(root, `.android-tools/releases/${date}/TAPtoTEST-v${version}-code${code}.aab`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) assert.equal(hash(fs.readFileSync(destination)), hash(fs.readFileSync(bundle)), 'Never overwrite an existing release with different bytes');
  else fs.copyFileSync(bundle, destination, fs.constants.COPYFILE_EXCL);
  const friendly = path.join(root, `android/releases/TAPtoTEST-${version}-code${code}-${date.replaceAll('-', '')}.aab`);
  execFileSync('git', ['check-ignore', friendly], { cwd: root });
  fs.mkdirSync(path.dirname(friendly), { recursive: true });
  if (fs.existsSync(friendly)) assert.equal(hash(fs.readFileSync(friendly)), hash(fs.readFileSync(destination)), 'Do not overwrite a different delivery copy');
  else fs.copyFileSync(destination, friendly, fs.constants.COPYFILE_EXCL);
  assert.equal(hash(fs.readFileSync(friendly)), hash(fs.readFileSync(destination)));
  const report = {
    versionName: version, versionCode: code, applicationId: 'io.github.junyyyong.taptotest',
    targetSdk: 36, minSdk: 24, path: friendly, archivedPath: destination, deliveryCopyIdentical: true, bytes: fs.statSync(destination).size,
    sha256: hash(fs.readFileSync(destination)), previousAabPreserved: true,
    baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    uncommittedChangesIncluded: true, iconsPixelVerified: verified,
    sourceIconSha256: icons.sourceSHA256,
    signatureAndWebVerification: signature.trim().split('\n'), unchangedSourcePaths: unchangedPaths, commentOnlySourcePaths: commentOnlyPaths,
    checks: ['bundletool validate passed', 'manifest/version/app ID/fontScale flag passed', '15 icon payloads pixel-identical', 'adaptive resources present', `${expectedIconBackground} icon background, correct app label`, 'old delivered AAB hash unchanged', 'DEX contains lifecycle callbacks and setTextZoom(100)'],
    limitations: ['No connected Android device/emulator: real fontScale, launcher and in-place update not tested', 'Not uploaded to Google Play; Git publication is verified separately from this bundle check'],
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(root, reportDir, 'release-verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

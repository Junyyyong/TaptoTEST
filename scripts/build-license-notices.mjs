// Maintainer-only: regenerate after updating release dependencies, not at runtime.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const cache = path.join(process.env.GRADLE_USER_HOME || path.join(root, '.android-tools/gradle-cache'), 'caches/modules-2/files-2.1');
const components = JSON.parse(fs.readFileSync(path.join(root, '.android-tools/release-artifacts.json')));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'taptest-licenses-'));
const notices = new Map();
function filesFor(d) {
  const dir = path.join(cache, d.group, d.name, d.version);
  return fs.readdirSync(dir).flatMap(h => fs.readdirSync(path.join(dir, h)).map(f => path.join(dir, h, f)));
}
function licenseFor(d, depth = 0) {
  if (depth > 5) throw new Error('License inheritance too deep');
  const file = filesFor(d).find(f => f.endsWith('.pom'));
  const xml = fs.readFileSync(file, 'utf8');
  const license = xml.match(/<licenses>([\s\S]*?)<\/licenses>/)?.[1];
  if (license) {
    if (!/apache\.org\/licenses\/LICENSE-2\.0/.test(license)) throw new Error(`Review new license: ${file}`);
    return 'Apache-2.0';
  }
  const parent = xml.match(/<parent>([\s\S]*?)<\/parent>/)?.[1];
  if (!parent) throw new Error(`No license found: ${file}`);
  const value = tag => parent.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1];
  return licenseFor({ group: value('groupId'), name: value('artifactId'), version: value('version') }, depth + 1);
}
function addNotice(label, text) {
  const key = hash(text);
  const entry = notices.get(key) || { labels: [], text, sha256: key };
  entry.labels.push(label); notices.set(key, entry);
}
function archiveNotices(file, label, nested = false) {
  const entries = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n');
  for (const name of entries.filter(n => /(?:^|\/)(?:NOTICE|LICENSE|COPYING)[^/]*$/i.test(n))) {
    addNotice(`${label} — ${name}`, execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' }));
  }
  if (!nested) for (const name of entries.filter(n => n === 'classes.jar' || /^libs\/.*\.jar$/.test(n))) {
    const jar = path.join(temp, hash(file + name) + '.jar');
    fs.writeFileSync(jar, execFileSync('unzip', ['-p', file, name], { maxBuffer: 32 * 1024 * 1024 }));
    archiveNotices(jar, label, true);
  }
}
try {
  const inventory = components.map(d => {
    const license = licenseFor(d);
    for (const file of filesFor(d).filter(f => /\.(aar|jar)$/.test(f))) archiveNotices(file, `${d.group}:${d.name}:${d.version}`);
    return { ...d, license };
  }).sort((a, b) => `${a.group}:${a.name}`.localeCompare(`${b.group}:${b.name}`));
  const npmPackages = ['@capacitor/core', '@capacitor/android', '@capacitor/preferences'];
  for (const name of npmPackages) {
    const pkg = JSON.parse(read(`node_modules/${name}/package.json`));
    addNotice(`${name} ${pkg.version} (MIT)`, read(`node_modules/${name}/LICENSE`));
  }
  for (const [label, file] of [
    ['Noto Sans KR (SIL Open Font License 1.1)', 'NotoSansKR-OFL.txt'],
    ['Noto Serif KR (SIL Open Font License 1.1)', 'NotoSerifKR-OFL.txt'],
    ['Apache License 2.0', 'Apache-2.0.txt'],
    ['Apache Cordova 14.0.1 — NOTICE', 'Cordova-NOTICE.txt'],
    ['Apache Cordova 14.0.1 — LICENSE', 'Cordova-LICENSE.txt'],
  ]) addNotice(label, read(`public/legal/${file}`));
  const ordered = [...notices.values()].sort((a,b) => {
    const rank = n => n.labels.some(l => /^(?:@capacitor|Noto)/.test(l)) ? 0 : 1;
    return rank(a) - rank(b);
  });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="referrer" content="no-referrer" /><title>TAPtoTEST — Open-source licenses</title><link rel="stylesheet" href="./legal/legal.css" /></head>
<body><main><h1>Open-source licenses</h1><p class="meta">TAPtoTEST · TapeeTepee openstudio</p>
<p>Thank you to the authors of the software and font used in this game. Tap a heading to read its license and notices. These notices concern the listed third-party components, not a license to reuse the game's artwork or branding.</p>
<p lang="ko">사용한 소프트웨어와 서체의 라이선스·저작권 고지입니다. 제목을 누르면 전문을 읽을 수 있습니다. 게임의 그림·로고에 대한 재사용 허가를 뜻하지 않습니다.</p>
${ordered.map(n => `<details><summary>${escape(n.labels.length > 2 ? 'AndroidX — Apache License 2.0' : n.labels.join(' / '))}</summary>${n.labels.length > 2 ? `<p class="meta">${escape(n.labels.join('\n'))}</p>` : ''}<pre>${escape(n.text)}</pre></details>`).join('\n')}
<details><summary>Android release dependency inventory</summary><p class="meta">Resolved release dependencies, including metadata and annotations. Apache-2.0 unless noted. Build and test tools are not included.</p><ul>
${inventory.map(d => `<li>${escape(`${d.group}:${d.name}:${d.version}`)} — ${d.license}</li>`).join('\n')}
</ul></details></main></body></html>\n`;
  fs.writeFileSync(path.join(root, 'public/licenses.html'), html);
  fs.writeFileSync(path.join(root, 'public/legal/dependencies.json'), JSON.stringify(inventory, null, 2) + '\n');
  console.log(`Generated licenses.html: ${inventory.length} Android dependency components, ${notices.size} unique notice texts.`);
} finally {
  // Only the exact mkdtemp directory created above is removed.
  fs.rmSync(temp, { recursive: true, force: true });
}

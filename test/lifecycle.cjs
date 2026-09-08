'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const themeRoot = path.resolve(__dirname, '..');
const blogRoot = path.resolve(process.argv[2] || path.join(themeRoot, '../..'));
const npmCli = process.env.npm_execpath;
const offline = !process.argv.includes('--online');
assert.ok(npmCli, 'Run through npm run test:lifecycle -- <blog root>');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'breezehome-lifecycle-'));
console.log(`Lifecycle workspace: ${base}`);
const write = (relative, data) => {
  const target = path.join(base, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data);
};
for (const name of ['package.json', 'package-lock.json']) write(name, fs.readFileSync(path.join(blogRoot, name)));
write('_config.yml', 'title: Lifecycle fixture\nauthor: Example\nurl: https://example.org/notebook\nroot: /notebook/\npermalink: :year/:month/:day/:title/\ntheme: breezehome\nsyntax_highlighter: highlight.js\n');
write('_config.breezehome.yml', 'rss: false\ncopyright_start: 2020\n');
write('source/_data/profile.yml', 'greeting: 独立生命周期测试\nintro: 原创样例，不含个人资料。\n');
write('source/_posts/example.md', '---\ntitle: 固定链接样例\ndate: 2026-01-02\ntags: [fixture]\n---\n## 正文\n保留正文。\n\n```mermaid\nflowchart LR\n A --> B\n```\n\n行内公式 $a^2$。参考[^n]。\n\n[^n]: 原创脚注。\n');
const protectedFiles = ['_config.yml', '_config.breezehome.yml', 'source/_data/profile.yml', 'source/_posts/example.md', 'package.json', 'package-lock.json'];
const digest = file => createHash('sha256').update(fs.readFileSync(path.join(base, file))).digest('hex');
const initial = Object.fromEntries(protectedFiles.map(file => [file, digest(file)]));
function npm(args, label) {
  try {
    const output = execFileSync(process.execPath, [npmCli, ...args], { cwd: base, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    write(`evidence/${label}.log`, output);
  } catch (error) {
    write(`evidence/${label}.log`, String(error.stdout || '') + String(error.stderr || error));
    throw new Error(`${label} failed; inspect ${base}/evidence/${label}.log`);
  }
}
const currentFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: themeRoot, encoding: 'utf8' }).trim().split(/\r?\n/);
function installTheme(version) {
  const destination = path.join(base, 'themes/breezehome');
  // Retain every tested theme snapshot; never touch the source checkout.
  if (fs.existsSync(destination)) {
    const previous = path.join(base, 'evidence', `theme-${Date.now()}`);
    assert.ok(previous.startsWith(base + path.sep));
    fs.mkdirSync(path.dirname(previous), { recursive: true }); fs.renameSync(destination, previous);
  }
  const files = version === 'current' ? currentFiles : execFileSync('git', ['ls-tree', '-r', '--name-only', version], { cwd: themeRoot, encoding: 'utf8' }).trim().split(/\r?\n/);
  for (const file of files) {
    if (!file || file.startsWith('../') || path.isAbsolute(file)) throw new Error('Invalid theme path');
    const data = version === 'current' ? fs.readFileSync(path.join(themeRoot, file)) : execFileSync('git', ['show', `${version}:${file}`], { cwd: themeRoot });
    write(`themes/breezehome/${file}`, data);
  }
}
const results = [];
function verify(label, enhanced) {
  npm(['run', 'clean'], `${label}-clean`);
  npm(['run', 'build'], `${label}-build`);
  const html = fs.readFileSync(path.join(base, 'public/2026/01/02/example/index.html'), 'utf8');
  assert.ok(html.includes('https://example.org/notebook/2026/01/02/example/'));
  assert.ok(html.includes('保留正文'));
  assert.equal(html.includes('data-bh-mermaid'), enhanced);
  assert.equal(html.includes('class="katex"'), enhanced);
  assert.equal(fs.existsSync(path.join(base, 'public/js/vendor/mermaid.min.js')), enhanced);
  assert.ok(fs.readFileSync(path.join(base, 'public/index.html'), 'utf8').includes('独立生命周期测试'));
  assert.deepEqual(Object.fromEntries(protectedFiles.map(file => [file, digest(file)])), initial);
  fs.cpSync(path.join(base, 'public'), path.join(base, 'evidence', `${label}-public`), { recursive: true });
  results.push({ stage: label, passed: true, enhanced, sourceAndConfigUnchanged: true });
  console.log(`${label}: passed`);
}
try {
  installTheme('current');
  npm(['ci', ...(offline ? ['--offline'] : []), '--no-audit', '--no-fund'], 'fresh-install');
  verify('fresh-current', true);
  installTheme('v0.1.0-alpha.2'); verify('alpha2-baseline', false);
  installTheme('current'); verify('upgrade-current', true);
  installTheme('v0.1.0-alpha.2'); verify('rollback-alpha2', false);
  write('evidence/result.json', JSON.stringify({ passed: true, base, results, offline, dependencySource: 'supplied blog package-lock.json; npm ci; dependencies retained during theme-only rollback' }, null, 2));
  console.log(JSON.stringify({ passed: true, base, stages: results.length }));
} catch (error) { console.error(error); process.exitCode = 1; }

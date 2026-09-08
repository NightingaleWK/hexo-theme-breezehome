const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const blogRoot = path.resolve(process.argv[2] || process.cwd());
const sourceRoot = path.join(blogRoot, 'source');
const publicRoot = path.join(blogRoot, 'public');
const configFile = path.join(blogRoot, '_config.yml');

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else files.push(target);
    }
  }
  return files;
}

function outsideFencedMarkdown(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const visible = [];
  let fence;
  for (const line of lines) {
    if (!fence) {
      const opening = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
      if (opening) {
        fence = { character: opening[1][0], length: opening[1].length };
      } else {
        visible.push(line);
      }
      continue;
    }
    if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)) fence = undefined;
  }
  return visible.join('\n');
}

function hasMath(markdown) {
  const visible = outsideFencedMarkdown(markdown).replace(/(`+)[\s\S]*?\1/g, '');
  return /\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\$)(?=\S)[^$\r\n]*?\S\$(?!\$)/.test(visible);
}

function hasMermaid(markdown) {
  return /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid(?:[ \t]*\r?\n)/m.test(markdown);
}

function hasFootnotes(markdown) {
  const visible = outsideFencedMarkdown(markdown);
  return /\[\^[^\]\r\n]+\]/.test(visible) && /^ {0,3}\[\^[^\]\r\n]+\]:/m.test(visible);
}

function publicFileForUrl(value, siteRoot) {
  let pathname;
  try {
    pathname = new URL(value, 'https://breezehome.invalid').pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith('/')) return null;
  const normalizedRoot = siteRoot.endsWith('/') ? siteRoot : `${siteRoot}/`;
  if (normalizedRoot !== '/' && pathname.startsWith(normalizedRoot)) pathname = pathname.slice(normalizedRoot.length);
  else pathname = pathname.replace(/^\/+/, '');
  pathname = decodeURIComponent(pathname).replace(/[\\/]+/g, path.sep);
  if (!pathname || pathname.endsWith(path.sep)) pathname = path.join(pathname, 'index.html');
  const direct = path.join(publicRoot, pathname);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const indexFile = path.join(publicRoot, pathname, 'index.html');
  return fs.existsSync(indexFile) && fs.statSync(indexFile).isFile() ? indexFile : null;
}

const sourcePostFiles = walkFiles(path.join(sourceRoot, '_posts')).filter(file => /\.md$/i.test(file));
const htmlFiles = walkFiles(publicRoot).filter(file => /\.html$/i.test(file));
const sourceContents = sourcePostFiles.map(file => ({ file, content: fs.readFileSync(file, 'utf8') }));
const mermaidSources = sourceContents.filter(item => hasMermaid(item.content));
const mathSources = sourceContents.filter(item => hasMath(item.content));
const footnoteSources = sourceContents.filter(item => hasFootnotes(item.content));
const htmlContents = htmlFiles.map(file => ({ file, content: fs.readFileSync(file, 'utf8') }));
const mermaidPages = htmlContents.filter(item => /data-bh-mermaid/.test(item.content));
const mathPages = htmlContents.filter(item => /class="(?:bh-math-block|katex)/.test(item.content));
const footnotePages = htmlContents.filter(item => /class="bh-footnotes"/.test(item.content));

const configText = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : '';
const rootMatch = /^root:\s*["']?([^"'\r\n]+)["']?/m.exec(configText);
const siteRoot = rootMatch ? rootMatch[1].trim() : '/';
const internalReferences = [];
const brokenReferences = [];
const missingAlt = [];
const imagesWithoutLazy = [];

for (const item of htmlContents) {
  assert.match(item.content, /<html\b[^>]*\blang="[^"]+"/, `${item.file}: lang`);
  assert.match(item.content, /<main\b[^>]*\bid="main"/, `${item.file}: main landmark`);
  for (const match of item.content.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|data:|javascript:|#|\/\/)/i.test(value)) continue;
    internalReferences.push(value);
    if (!publicFileForUrl(value, siteRoot)) brokenReferences.push({ file: item.file, value });
  }
  for (const image of item.content.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(image[0])) missingAlt.push({ file: item.file, image: image[0] });
    if (!/\bloading="lazy"/i.test(image[0])) imagesWithoutLazy.push({ file: item.file, image: image[0] });
  }
}

assert.equal(brokenReferences.length, 0, `broken internal references: ${JSON.stringify(brokenReferences.slice(0, 5))}`);
assert.equal(missingAlt.length, 0, `images without alt: ${JSON.stringify(missingAlt.slice(0, 5))}`);
assert.equal(mermaidPages.length, mermaidSources.length, 'Mermaid source/page count');
assert.ok(mermaidPages.every(item => /js\/vendor\/mermaid\.min\.js/.test(item.content)), 'Mermaid pages load the local bundle');
assert.ok(htmlContents.filter(item => !/data-bh-mermaid/.test(item.content)).every(item => !/js\/vendor\/mermaid\.min\.js/.test(item.content)), 'non-Mermaid pages do not load Mermaid');
assert.equal(htmlContents.filter(item => /language-mermaid|```mermaid/.test(item.content)).length, 0, 'raw Mermaid fences');
if (mathSources.length) {
  assert.ok(mathPages.length >= mathSources.length, 'math source/page coverage');
  assert.ok(mathPages.every(item => /css\/vendor\/katex\/katex\.min\.css/.test(item.content)), 'math pages load KaTeX CSS');
}
if (footnoteSources.length) assert.ok(footnotePages.length >= footnoteSources.length, 'footnote source/page coverage');

const files = {
  html: htmlFiles.length,
  internalReferences: internalReferences.length,
  brokenReferences: brokenReferences.length,
  imagesWithoutAlt: missingAlt.length,
  mermaidSources: mermaidSources.length,
  mermaidPages: mermaidPages.length,
  mathSources: mathSources.length,
  mathPages: mathPages.length,
  footnoteSources: footnoteSources.length,
  footnotePages: footnotePages.length,
  imagesWithoutLazy: imagesWithoutLazy.length,
  assets: Object.fromEntries([
    'css/site.css',
    'js/site.js',
    'js/mermaid.js',
    'js/vendor/mermaid.min.js',
    'search-index.json'
  ].filter(relativePath => fs.existsSync(path.join(publicRoot, relativePath))).map(relativePath => [relativePath, fs.statSync(path.join(publicRoot, relativePath)).size]))
};
console.log(JSON.stringify({ passed: true, blogRoot, siteRoot, files }, null, 2));

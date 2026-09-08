'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { marked } = require('marked');

const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

let katex;
try {
  katex = require('katex');
} catch {}

const renderMath = (source, displayMode) => {
  if (!katex) return `<code class="bh-math-fallback">${escapeHtml(source)}</code>`;
  try {
    return katex.renderToString(source, {
      displayMode,
      output: 'htmlAndMathml',
      strict: 'ignore',
      throwOnError: false,
      trust: false
    });
  } catch {
    return `<code class="bh-math-fallback">${escapeHtml(source)}</code>`;
  }
};

const mermaidBlock = {
  name: 'breezehomeMermaid',
  level: 'block',
  start(source) {
    const match = source.match(/^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid(?:[ \t]*\r?\n)/m);
    return match ? match.index : undefined;
  },
  tokenizer(source) {
    const match = /^( {0,3})(`{3,}|~{3,})[ \t]*mermaid[^\r\n]*\r?\n([\s\S]*?)(?:\r?\n)?\2[ \t]*(?:\r?\n|$)/.exec(source);
    if (!match) return;
    return {
      type: 'breezehomeMermaid',
      raw: match[0],
      text: match[3].trim()
    };
  },
  renderer(token) {
    return `<div class="bh-mermaid" data-bh-mermaid role="img" aria-label="Mermaid 图表">${escapeHtml(token.text)}</div>\n`;
  }
};

const replaceMermaidFences = markdown => {
  const lines = String(markdown).split(/\r?\n/);
  const output = [];
  let fence;
  for (const line of lines) {
    if (!fence) {
      const opening = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
      if (opening) {
        fence = {
          character: opening[1][0],
          language: opening[2].trim().split(/\s+/)[0].toLowerCase(),
          length: opening[1].length,
          lines: [line]
        };
      } else {
        output.push(line);
      }
      continue;
    }

    fence.lines.push(line);
    const closing = new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line);
    if (!closing) continue;

    if (fence.language === 'mermaid') {
      const source = fence.lines.slice(1, -1).join('\n').trim();
      output.push(`<div class="bh-mermaid" data-bh-mermaid role="img" aria-label="Mermaid 图表">${escapeHtml(source)}</div>`);
    } else {
      output.push(...fence.lines);
    }
    fence = undefined;
  }
  if (fence) output.push(...fence.lines);
  return output.join('\n');
};

const blockMath = {
  name: 'breezehomeBlockMath',
  level: 'block',
  start(source) {
    const match = source.match(/^(?: {0,3}\$\$| {0,3}\\\[)/m);
    return match ? match.index : undefined;
  },
  tokenizer(source) {
    const dollarMatch = /^( {0,3})\$\$[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n[ \t]*)?\$\$(?:\r?\n|$)/.exec(source);
    if (dollarMatch) {
      return {
        type: 'breezehomeBlockMath',
        raw: dollarMatch[0],
        text: dollarMatch[2].trim()
      };
    }
    const bracketMatch = /^( {0,3})\\\[[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n[ \t]*)?\\\](?:\r?\n|$)/.exec(source);
    if (bracketMatch) {
      return {
        type: 'breezehomeBlockMath',
        raw: bracketMatch[0],
        text: bracketMatch[2].trim()
      };
    }
  },
  renderer(token) {
    return `<div class="bh-math-block" role="math">${renderMath(token.text, true)}</div>\n`;
  }
};

const inlineMath = {
  name: 'breezehomeInlineMath',
  level: 'inline',
  start(source) {
    const positions = [source.indexOf('\\('), source.indexOf('$')].filter(position => position >= 0);
    return positions.length ? Math.min(...positions) : undefined;
  },
  tokenizer(source) {
    const bracketMatch = /^\\\(([\s\S]+?)\\\)/.exec(source);
    if (bracketMatch && /\S/.test(bracketMatch[1])) {
      return {
        type: 'breezehomeInlineMath',
        raw: bracketMatch[0],
        text: bracketMatch[1]
      };
    }
    const dollarMatch = /^\$(?!\$)([^$\r\n]+?)\$(?!\$)/.exec(source);
    if (dollarMatch && /\S/.test(dollarMatch[1]) && !/^\d/.test(dollarMatch[1])) {
      return {
        type: 'breezehomeInlineMath',
        raw: dollarMatch[0],
        text: dollarMatch[1]
      };
    }
  },
  renderer(token) {
    return renderMath(token.text, false);
  }
};

const encodeMarker = value => Buffer.from(String(value), 'utf8').toString('base64');
const decodeMarker = value => Buffer.from(value, 'base64').toString('utf8');

const parseFootnoteDefinition = source => {
  const firstLine = /^( {0,3})\[\^([^\]\r\n]+)\]:[ \t]*(.*?)(?:\r?\n|$)/.exec(source);
  if (!firstLine) return;
  const parts = [firstLine[3]];
  let consumed = firstLine[0].length;
  while (consumed < source.length) {
    const continuation = /^(?:(?: {4}|\t)(.*?)(?:\r?\n|$))/.exec(source.slice(consumed));
    if (!continuation) break;
    parts.push(continuation[1]);
    consumed += continuation[0].length;
  }
  return {
    body: parts.join('\n').trim(),
    id: firstLine[2].trim().toLowerCase(),
    raw: source.slice(0, consumed)
  };
};

const footnoteDefinition = {
  name: 'breezehomeFootnoteDefinition',
  level: 'block',
  start(source) {
    const match = source.match(/^ {0,3}\[\^[^\]\r\n]+\]:/m);
    return match ? match.index : undefined;
  },
  tokenizer(source) {
    const definition = parseFootnoteDefinition(source);
    if (!definition) return;
    return {
      type: 'breezehomeFootnoteDefinition',
      raw: definition.raw,
      id: definition.id,
      body: definition.body
    };
  },
  renderer(token) {
    return `<!--bh-footnote-definition:${encodeMarker(token.id)}:${encodeMarker(token.body)}-->`;
  }
};

const footnoteReference = {
  name: 'breezehomeFootnoteReference',
  level: 'inline',
  start(source) {
    const match = source.match(/\[\^[^\]\r\n]+\]/);
    return match ? match.index : undefined;
  },
  tokenizer(source) {
    const match = /^\[\^([^\]\r\n]+)\]/.exec(source);
    if (!match) return;
    return {
      type: 'breezehomeFootnoteReference',
      raw: match[0],
      id: match[1].trim().toLowerCase()
    };
  },
  renderer(token) {
    return `<sup data-bh-footnote-ref="${encodeMarker(token.id)}"></sup>`;
  }
};

const renderFootnotes = function (html) {
  const definitions = new Map();
  const definitionPattern = /<!--bh-footnote-definition:([^:]+):([A-Za-z0-9+/=]+)-->/g;
  html = html.replace(definitionPattern, (_, id, body) => {
    definitions.set(decodeMarker(id), decodeMarker(body));
    return '';
  });

  const order = [];
  const references = new Map();
  const referencePattern = /<sup data-bh-footnote-ref="([^"]+)"><\/sup>/g;
  html = html.replace(referencePattern, (_, encodedId) => {
    const id = decodeMarker(encodedId);
    if (!order.includes(id)) order.push(id);
    const number = order.indexOf(id) + 1;
    const ids = references.get(id) || [];
    const referenceId = `fnref-${number}-${ids.length + 1}`;
    ids.push(referenceId);
    references.set(id, ids);
    return `<sup id="${referenceId}" class="bh-footnote-ref"><a href="#fn-${number}" aria-label="脚注 ${number}">${number}</a></sup>`;
  });

  if (!order.length) return html;

  const inlineOptions = {
    ...this.options,
    extensions: { renderers: {}, childTokens: {} },
    hooks: undefined,
    walkTokens: undefined
  };
  const items = order.map((id, index) => {
    const number = index + 1;
    const source = definitions.get(id);
    const body = source
      ? marked.parseInline(source, inlineOptions)
      : `<span class="bh-footnote-missing">未找到脚注定义：${escapeHtml(id)}</span>`;
    const backrefs = (references.get(id) || []).map(referenceId => `<a href="#${referenceId}" class="bh-footnote-backref" aria-label="返回正文">↩︎</a>`).join(' ');
    return `<li id="fn-${number}">${body} ${backrefs}</li>`;
  }).join('');
  return `${html}<section class="bh-footnotes" aria-label="脚注"><h2>脚注</h2><ol>${items}</ol></section>\n`;
};

if (!marked.__breezehomeEnhancements) {
  marked.use({
    extensions: [mermaidBlock, blockMath, inlineMath, footnoteDefinition, footnoteReference],
    hooks: { postprocess: renderFootnotes }
  });
  marked.__breezehomeEnhancements = true;
}

hexo.extend.filter.register('marked:renderer', function (renderer) {
  const renderCode = renderer.code.bind(renderer);
  const renderImage = renderer.image.bind(renderer);
  renderer.code = function (code, infostring, escaped) {
    const language = String(infostring || '').trim().split(/\s+/)[0].toLowerCase();
    if (language === 'mermaid') {
      return `<div class="bh-mermaid" data-bh-mermaid>${escapeHtml(String(code || ''))}</div>\n`;
    }
    return renderCode(code, infostring, escaped);
  };
  renderer.image = function (href, title, text) {
    const output = renderImage(href, title, text);
    return /<img\b[^>]*\balt=/.test(output) ? output : output.replace('<img ', '<img alt="" ');
  };
});

hexo.extend.filter.register('before_post_render', function (data) {
  if (data && typeof data.content === 'string') data.content = replaceMermaidFences(data.content);
  return data;
}, 5);

const collectionItems = collection => {
  if (!collection) return [];
  if (typeof collection.toArray === 'function') return collection.toArray();
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.data)) return collection.data;
  return Array.from(collection);
};

const resolvePackageFile = (packageName, relativePath) => {
  const resolvers = [
    () => require.resolve(`${packageName}/package.json`),
    () => createRequire(path.join(hexo.base_dir, 'package.json')).resolve(`${packageName}/package.json`)
  ];
  for (const resolve of resolvers) {
    try {
      return path.join(path.dirname(resolve()), relativePath);
    } catch {}
  }
  return null;
};

const hasMarker = (items, pattern) => items.some(item => pattern.test(String(item.content || '')));

const sourceFiles = sourceDirectory => {
  if (!sourceDirectory || !fs.existsSync(sourceDirectory)) return [];
  const files = [];
  const pending = [sourceDirectory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (/\.(?:md|markdown)$/i.test(entry.name)) files.push(target);
    }
  }
  return files;
};

const sourceIncludes = (files, pattern) => files.some(file => pattern.test(fs.readFileSync(file, 'utf8')));

const sourceHasMath = files => files.some(file => {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const content = [];
  let fence;
  for (const line of lines) {
    if (!fence) {
      const opening = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
      if (opening) {
        fence = { character: opening[1][0], length: opening[1].length };
      } else {
        content.push(line);
      }
      continue;
    }
    if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)) fence = undefined;
  }
  const inline = content.join('\n').replace(/(`+)[\s\S]*?\1/g, '');
  return /\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\$)(?=\S)[^$\r\n]*?\S\$(?!\$)/.test(inline);
});

hexo.extend.generator.register('breezehome-vendor-assets', function (locals) {
  const items = [...collectionItems(locals.posts), ...collectionItems(locals.pages)];
  const files = sourceFiles(this.source_dir || path.join(this.base_dir, 'source'));
  const outputs = [];

  if (hasMarker(items, /data-bh-mermaid/) || sourceIncludes(files, /^ {0,3}(?:`{3,}|~{3,})[ \t]*mermaid(?:[ \t]*\r?\n)/m)) {
    const mermaidFile = resolvePackageFile('mermaid', 'dist/mermaid.min.js');
    if (mermaidFile && fs.existsSync(mermaidFile)) {
      outputs.push({ path: 'js/vendor/mermaid.min.js', data: fs.readFileSync(mermaidFile) });
    }
  }

  if (hasMarker(items, /class="(?:bh-math-block|katex)/) || sourceHasMath(files)) {
    const katexCssFile = resolvePackageFile('katex', 'dist/katex.min.css');
    const katexPackageFile = resolvePackageFile('katex', 'package.json');
    if (katexCssFile && katexPackageFile && fs.existsSync(katexCssFile)) {
      const css = fs.readFileSync(katexCssFile, 'utf8');
      outputs.push({ path: 'css/vendor/katex/katex.min.css', data: css });
      const fontPattern = /url\((?:["']?)(fonts\/[^)"']+)/g;
      for (const match of css.matchAll(fontPattern)) {
        const fontFile = path.join(path.dirname(katexPackageFile), 'dist', match[1]);
        if (fs.existsSync(fontFile)) {
          outputs.push({ path: `css/vendor/katex/${match[1].replace(/\\/g, '/')}`, data: fs.readFileSync(fontFile) });
        }
      }
    }
  }

  return outputs;
});

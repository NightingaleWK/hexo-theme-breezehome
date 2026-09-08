const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),Module=require('node:module');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const dependencyRoot=process.argv[2]?path.resolve(process.argv[2]):root;
process.env.NODE_PATH=[path.join(dependencyRoot,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
// Optional dependency source enables testing without changing another blog.
const req=createRequire(path.join(dependencyRoot,'package.json'));
// Copied theme scripts must resolve the same dependencies as this test runner,
// including npm installations hoisted to the containing blog directory.
process.env.NODE_PATH=[...req.resolve.paths('hexo'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const Hexo=req('hexo');
const hexoVersion=req('hexo/package.json').version;
assert.equal(hexoVersion,require('../package.json').devDependencies.hexo,'test must use the supported Hexo version');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'breezehome-smoke-'));
function write(file,text){const dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text);}
fs.cpSync(path.join(root,'layout'),path.join(base,'themes/breezehome/layout'),{recursive:true});
fs.cpSync(path.join(root,'source'),path.join(base,'themes/breezehome/source'),{recursive:true});
fs.cpSync(path.join(root,'scripts'),path.join(base,'themes/breezehome/scripts'),{recursive:true});
fs.copyFileSync(path.join(root,'_config.yml'),path.join(base,'themes/breezehome/_config.yml'));
write('package.json',JSON.stringify({name:'theme-smoke',version:'1.0.0',hexo:{version:hexoVersion}}));
write('_config.yml','title: Breezehome Test\nauthor: Example\nurl: https://example.org/notebook\nroot: /notebook/\npermalink: :year/:month/:day/:title/\ntheme: breezehome\nsyntax_highlighter: highlight.js\nmarked:\n  lazyload: true\n');
write('source/_posts/example.md',[
 '---',
 'title: 中文与代码',
 'date: 2026-01-02 12:00:00',
 'categories: [技术]',
 'tags: [Hexo]',
 '---',
 '## 正文标题',
 '',
 '这是原创测试样例，包含行内公式 $a^2+b^2=c^2$ 和脚注[^note]。',
 '',
 '$$',
 'E = mc^2',
 '$$',
 '',
 '```mermaid',
 'flowchart LR',
 '  A[开始] --> B[完成]',
 '```',
 '',
 '```js',
 'console.log("Breezehome");',
 '```',
 '',
 '| 键 | 值 |',
 '| --- | --- |',
 '| foo | bar |',
 '',
 '![远程图片](https://example.org/image.png)',
 '',
 '[^note]: 这是 **脚注** 内容。'
].join('\n'));
write('source/_posts/excluded.md','---\ntitle: Not searchable\ndate: 2026-01-01\nsearch: false\n---\nThis published post opts out of search.');
write('source/_drafts/draft.md','---\ntitle: Private draft\n---\nDraft body must not be indexed.');
write('source/tags/index.md','---\ntitle: tags\n---\n');
write('source/_posts/media.md',fs.readFileSync(path.join(root,'test/fixtures/media.md'),'utf8'));
write('source/fixture-video.js',fs.readFileSync(path.join(root,'test/fixtures/video.js'),'utf8'));
write('source/fixture.svg','<svg xmlns="http://www.w3.org/2000/svg" width="960" height="300" viewBox="0 0 960 300"><rect width="960" height="300" fill="#386651"/><circle cx="480" cy="150" r="100" fill="#fafaf8"/></svg>');
(async()=>{
 const hexo=new Hexo(base,{silent:true});
 for(const name of ['hexo-renderer-ejs','hexo-renderer-marked','hexo-generator-archive','hexo-generator-category','hexo-generator-tag'])await hexo.loadPlugin(req.resolve(name));
 await hexo.init();
 await hexo.call('generate',{silent:true});
 const read=file=>fs.readFileSync(path.join(base,'public',file),'utf8');
 for(const file of ['index.html','archives/index.html','categories/index.html','tags/index.html','search/index.html','404.html','css/site.css','js/site.js','js/vendor/mermaid.min.js','css/vendor/katex/katex.min.css'])assert.ok(read(file).length,file);
 const post=read('2026/01/02/example/index.html');
 assert.match(post,/<main id="main" tabindex="-1"/,'skip link target accepts keyboard focus');
 assert.ok(read('2026/01/03/media/index.html').includes('fixture-video.js') && read('fixture-video.js').includes('MediaRecorder'),'local video fixture available');
 assert.ok(post.includes('正文标题') && post.includes('highlight'),'post rendering');
 assert.ok(post.includes('data-bh-mermaid') && !post.includes('language-mermaid'),'Mermaid fence conversion');
 assert.ok(post.includes('bh-math-block') && post.includes('katex'),'math rendering');
 assert.ok(post.includes('bh-footnotes') && post.includes('脚注'),'footnote rendering');
 assert.ok(post.includes('/notebook/css/site.css'),'subdirectory asset root');
 assert.ok(post.includes('https://example.org/notebook/2026/01/02/example/'),'canonical permalink');
 assert.ok(post.includes('https://example.org/image.png'),'external image path');
 assert.ok(post.includes('loading="lazy"'),'lazy image loading');
 assert.ok(read('tags/index.html').includes('/notebook/tags/Hexo/'),'existing tags page');
 assert.ok(!read('archives/index.html').includes('mermaid.min.js'),'feature assets load only on matching pages');
 const index=JSON.parse(read('search-index.json'));
 assert.equal(index.length,1,'draft and search:false excluded');
 assert.equal(index[0].url,'/notebook/2026/01/02/example/','original permalink');
 await hexo.exit();
 console.log(JSON.stringify({passed:true,hexo:require(req.resolve('hexo/package.json')).version,output:path.join(base,'public'),checks:17}));
})().catch(error=>{console.error(error);process.exitCode=1;});

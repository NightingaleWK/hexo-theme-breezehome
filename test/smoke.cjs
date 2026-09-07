const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
// Optional dependency source enables testing without changing another blog.
const req=createRequire(path.join(process.argv[2]?path.resolve(process.argv[2]):root,'package.json'));
const Hexo=req('hexo');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'breezehome-smoke-'));
function write(file,text){const dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text);}
fs.cpSync(path.join(root,'layout'),path.join(base,'themes/breezehome/layout'),{recursive:true});
fs.cpSync(path.join(root,'source'),path.join(base,'themes/breezehome/source'),{recursive:true});
fs.cpSync(path.join(root,'scripts'),path.join(base,'themes/breezehome/scripts'),{recursive:true});
fs.copyFileSync(path.join(root,'_config.yml'),path.join(base,'themes/breezehome/_config.yml'));
write('package.json','{"name":"theme-smoke","version":"1.0.0","hexo":{"version":"7.3.0"}}');
write('_config.yml','title: Breezehome Test\nauthor: Example\nurl: https://example.org/notebook\nroot: /notebook/\npermalink: :year/:month/:day/:title/\ntheme: breezehome\nsyntax_highlighter: highlight.js\n');
write('source/_posts/example.md','---\ntitle: 中文与代码\ndate: 2026-01-02 12:00:00\ncategories: [技术]\ntags: [Hexo]\n---\n## 正文标题\n\n这是原创测试样例。\n\n```js\nconsole.log("Breezehome");\n```\n\n| 键 | 值 |\n| --- | --- |\n| foo | bar |\n');
write('source/_posts/excluded.md','---\ntitle: Not searchable\ndate: 2026-01-01\nsearch: false\n---\nThis published post opts out of search.');
write('source/_drafts/draft.md','---\ntitle: Private draft\n---\nDraft body must not be indexed.');
write('source/tags/index.md','---\ntitle: tags\n---\n');
(async()=>{
 const hexo=new Hexo(base,{silent:true});await hexo.init();
 for(const name of ['hexo-renderer-ejs','hexo-renderer-marked','hexo-generator-archive','hexo-generator-category','hexo-generator-tag'])await hexo.loadPlugin(req.resolve(name));
 await hexo.call('generate',{silent:true});
 const read=file=>fs.readFileSync(path.join(base,'public',file),'utf8');
 for(const file of ['index.html','archives/index.html','categories/index.html','tags/index.html','search/index.html','404.html','css/site.css','js/site.js'])assert.ok(read(file).length,file);
 const post=read('2026/01/02/example/index.html');
 assert.ok(post.includes('正文标题') && post.includes('highlight'),'post rendering');
 assert.ok(post.includes('/notebook/css/site.css'),'subdirectory asset root');
 assert.ok(post.includes('https://example.org/notebook/2026/01/02/example/'),'canonical permalink');
 assert.ok(read('tags/index.html').includes('/notebook/tags/Hexo/'),'existing tags page');
 const index=JSON.parse(read('search-index.json'));
 assert.equal(index.length,1,'draft and search:false excluded');
 assert.equal(index[0].url,'/notebook/2026/01/02/example/','original permalink');
 await hexo.exit();
 console.log(JSON.stringify({passed:true,hexo:require(req.resolve('hexo/package.json')).version,output:path.join(base,'public'),checks:9}));
})().catch(error=>{console.error(error);process.exitCode=1;});

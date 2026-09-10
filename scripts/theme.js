'use strict';
const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
hexo.extend.helper.register('bh_escape', escape);
hexo.extend.helper.register('bh_links', function (items) {
  return (items || []).filter(item => /^(https?:\/\/|mailto:|\/)/i.test(item.url || '') && !String(item.url).startsWith('//')).map(item => `<a href="${escape(this.url_for(item.url))}">${escape(item.label)}</a>`).join('');
});
hexo.extend.helper.register('bh_posts', function(posts) {
  let html='',year='';
  posts.sort('date',-1).forEach(post => {
    const next=this.date(post.date,'YYYY');
    if(next!==year){if(year)html+='</ul></section>';year=next;html+=`<section class="year"><h2>${escape(year)}</h2><ul class="article-list">`;}
    html+=`<li><a href="${escape(this.url_for(post.path))}">${escape(post.title)}</a> ${this.bh_status_badge(post)}</li>`;
  });
  return html+(year?'</ul></section>':'<p class="muted">还没有文章。</p>');
});
// Theme scripts are loaded after site plugins; replace the article-stream homepage.
hexo.extend.generator.register('index', function(locals) {
  if (locals.pages.some(page => page.path === 'index.html')) return [];
  return {path:'index.html',layout:'index',data:{title:''}};
});
hexo.extend.generator.register('breezehome-pages', function(locals) {
  const existing = new Set(locals.pages.map(page => page.path));
  return [
    {path:this.config.category_dir+'/index.html',layout:'page',data:{title:'分类',bhType:'categories'}},
    {path:this.config.tag_dir+'/index.html',layout:'page',data:{title:'标签',bhType:'tags'}},
    {path:'search/index.html',layout:'page',data:{title:'搜索',bhType:'search'}},
    {path:'404.html',layout:'page',data:{title:'页面未找到',bhType:'404'}}
  ].filter(route=>!existing.has(route.path));
});
hexo.extend.generator.register('breezehome-search', function(locals) {
  const decode = text => String(text).replace(/&#(x[0-9a-f]+|\d+);/gi, (_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[n]));
  const root=this.config.root || '/';
  const data=locals.posts.sort('date',-1).filter(p=>p.published!==false && p.search!==false).map(p=>({
    title:p.title,url:root+p.path,status:({current:'当前指南',historical:'历史资料',memory:'玩家回忆',pending:'待核实'})[p.content_status && p.content_status.kind] || undefined,taxonomy:p.categories.map(c=>c.name).concat(p.tags.map(t=>t.name)).join(' '),
    text:decode((p.content||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim()
  }));
  return {path:'search-index.json',data:JSON.stringify(data)};
});

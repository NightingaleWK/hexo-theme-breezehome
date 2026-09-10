'use strict';
const labels = {current:'当前指南', historical:'历史资料', memory:'玩家回忆', pending:'待核实'};
hexo.extend.helper.register('bh_status', function(post) {
  const value = post.content_status;
  return value && labels[value.kind] ? {...value, label:labels[value.kind]} : null;
});
hexo.extend.helper.register('bh_status_badge', function(post) {
  const status = this.bh_status(post);
  return status ? `<span class="content-badge" data-status="${status.kind}">${status.label}</span>` : '';
});
hexo.extend.helper.register('bh_navigation', function() {
  const defaults = [{label:'首页',url:'/'},{label:'归档',url:'/'+this.config.archive_dir+'/'},{label:'分类',url:'/'+this.config.category_dir+'/'},{label:'标签',url:'/'+this.config.tag_dir+'/'},{label:'友链',url:'/links/'},{label:'搜索',url:'/search/'}];
  return (Array.isArray(this.theme.navigation) ? this.theme.navigation : defaults).filter(item => item && item.label && /^\/(?!\/)/.test(item.url || ''));
});

# Breezehome · 风宅

一个克制、内容优先的 Hexo 主题。首页介绍自己，通过归档阅读文章。系统字体、原生 CSS 和少量 JavaScript，避免装饰性动效和全站加载的第三方前端库。

**当前版本：0.1.0-alpha.1。开发预览版，尚未完成全部正文扩展与浏览器兼容验收。**

## 已有功能

- 个人介绍、网站介绍、工作经历和人生履历。
- 按年份排列的标题归档，复用 Hexo 的归档分页。
- 分类、标签、独立搜索页与本地全文关键词搜索。
- 跟随系统、浅色、深色配色与偏好记忆。
- 响应式布局、长文目录、构建时代码高亮、复制、宽表局部滚动。
- 原生 Hexo 文章永久链接、上一篇/下一篇、基本 SEO 元信息、404、RSS 入口。
- 不启用 JavaScript 时，首页、文章与归档仍能阅读；搜索和复制需 JavaScript。

## 安装（Git 管理）

要求 Hexo 7、Node.js 18 及以上。已在 Hexo 7.3.0 验证。请在独立的 Hexo 博客目录执行，并遵循该目录自己的 Git 管理约定。

```sh
git submodule add https://github.com/NightingaleWK/hexo-theme-breezehome.git themes/breezehome
git -C themes/breezehome checkout v0.1.0-alpha.1
npm install hexo-renderer-ejs hexo-renderer-marked hexo-generator-archive hexo-generator-category hexo-generator-tag
```

博客 `_config.yml`：

```yaml
theme: breezehome
syntax_highlighter: highlight.js
per_page: 40
```

保留既有的 `url`、`root`、`permalink`、文章文件名和发布日期。主题使用 Hexo 生成的文章路径，不重新命名文章。首页替换文章流入口；归档仍由官方生成器负责。不要同时安装多个同类 Markdown 渲染器。

```sh
npx hexo generate
npx hexo server
```

现有的 `source/categories/index.md`、`source/tags/index.md`、`source/search/index.md` 可以保留；不存在时主题生成对应入口。自定义分类和标签目录使用博客的 `category_dir`、`tag_dir` 配置。

## 个人内容

在博客自己的 `source/_data/profile.yml` 保存资料，升级主题时无需改写这些内容：

```yaml
greeting: 你好，我是你的名字。
intro: 这里记录生活、工作与学习。
about: 一处存放文字与经历的地方。
links:
  - label: GitHub
    url: https://github.com/your-account
work:
  - period: 2024—至今
    title: 单位 / 岗位
    description: 填写实际职责与成果。
life:
  - period: 2020
    title: 一个重要节点
    description: 填写自己的经历。
```

上述内容是示例。资料字段按普通文本输出，不解析 HTML。不要把个人资料直接写进主题模板。

可选的博客 `_config.breezehome.yml`：

```yaml
copyright_start: 2020
beian: ""
rss: /atom.xml
```

RSS 入口要求博客安装并配置 feed 生成器；不需要时设置 `rss: false`。站点地图也由博客侧插件生成。

## 搜索与正文边界

搜索索引在构建时生成，第一次提交非空查询时加载。按关键词匹配，标题匹配优先；不包含草稿和 `search: false` 的文章。`search: false` 仅从索引排除，不会使文章私密。搜索索引属于公开站点内容。

Markdown 与 Hexo 标签语法由博客的渲染流程处理。**本版本尚未集成 Mermaid、数学公式和脚注扩展**，也未验收所有旧主题专用语法。不要把“显示源码”当作图表已成功渲染。

## 版本与升级

- `main`：当前开发代码。
- `v0.1.0-alpha.1`：首个可构建 Alpha 快照。
- 使用 `CHANGELOG.md` 记录变化；后续修复增加预发布版本号。
- 功能和验收清单完成后再发布稳定版，安装时固定版本标签。
- 主题仓库只包含主题、文档和原创测试样例，不包含个人博客文章、配置、搜索索引或部署产物。

升级前阅读变更记录，在博客的主题子模块中取回并检出指定标签，然后在博客仓库提交子模块指针变更。先本地构建预览，再自行部署。

## 开发与验证

```sh
npm install
npm test
```

测试在系统临时目录创建独立 Hexo 站点，检查原生构建、归档、分类标签入口、搜索排除、子目录资源及永久链接。测试样例为原创内容。临时结果保留供排查。

本版已完成 Hexo 7.3.0 构建测试；原型阶段已检查 Chromium 桌面与手机尺寸的排版、明暗切换和搜索。正式主题仍需继续完成跨浏览器、媒体及正文扩展验收。详细计划见 [ROADMAP.md](ROADMAP.md)。

## 许可证

[MIT](LICENSE)。第三方依赖沿用各自许可证，本仓库未复制第三方前端库。

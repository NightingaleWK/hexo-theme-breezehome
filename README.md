# Breezehome · 风宅

一个克制、内容优先的 Hexo 主题。首页介绍自己，通过归档阅读文章。系统字体、原生 CSS 和少量 JavaScript，避免装饰性动效和全站加载的第三方前端库。

**当前版本：0.1.0-alpha.3（当前工作树，尚未发布）。开发预览版，尚未完成全部正文扩展与浏览器兼容验收。**

## 已有功能

- 个人介绍、网站介绍、工作经历和人生履历。
- 按年份排列的标题归档，复用 Hexo 的归档分页。
- 分类、标签、独立搜索页与本地全文关键词搜索。
- 跟随系统、浅色、深色配色与偏好记忆。
- 响应式布局、长文目录、构建时代码高亮、复制、宽表局部滚动。
- 正文居中；1320px 及以上宽屏固定右侧目录，手机和较窄窗口使用右下角折叠目录，支持独立滚动、章节跳转后收起、点击外部或 Esc 关闭。
- 全站右下角常驻回到顶部按钮，支持键盘、减少动态效果偏好和移动端安全区，打印时隐藏悬浮控件。
- 原生 Hexo 文章永久链接、上一篇/下一篇、基本 SEO 元信息、404、RSS 入口。
- 不启用 JavaScript 时，首页、文章与归档仍能阅读；搜索和复制需 JavaScript。

## 安装（Git 管理）

主题仅跟进 Hexo 最新稳定版，当前支持与测试基线为 Hexo 8.1.2，要求 Node.js 20.19.0 及以上。不再维护 Hexo 7.x 及更早版本的兼容性。后续稳定版发布后，更新依赖并完成验证，再调整支持基线。请在独立的 Hexo 博客目录执行，并遵循该目录自己的 Git 管理约定。

```sh
git submodule add https://github.com/NightingaleWK/hexo-theme-breezehome.git themes/breezehome
git -C themes/breezehome checkout v0.1.0-alpha.2
npm install hexo-renderer-ejs@2.0.0 hexo-renderer-marked@6.3.0 hexo-generator-archive@2.0.0 hexo-generator-category@2.0.0 hexo-generator-tag@2.0.0 --save-exact
```

以上安装的是已发布的 alpha.2，不包含当前工作树的正文扩展。当前 alpha.3 尚无远端标签，不能通过检出 `v0.1.0-alpha.3` 安装。使用当前开发源码时，还需在博客根目录执行 `npm install marked@4.3.0 katex@0.18.7 mermaid@11.17.2 --save-exact`，保留更新后的根目录 `package-lock.json`。尤其不要安装未限定版本的 marked：本主题扩展与当前渲染器使用 marked 4.3.0。

博客 `_config.yml`：

```yaml
theme: breezehome
syntax_highlighter: highlight.js
marked:
  lazyload: true
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

Markdown 与 Hexo 标签语法由博客的渲染流程处理。Mermaid 代码块会按页面按需加载本地脚本，数学公式由 KaTeX 在构建时渲染，常见 GFM 脚注会生成无脚本可读的脚注区。旧主题专用语法仍需结合实际文章完成兼容检查。

## 版本与升级

- `main`：当前开发代码。
- `v0.1.0-alpha.1`：首个可构建 Alpha 快照（历史版本）。
- `v0.1.0-alpha.2`：Hexo 8.1.2 支持与测试基线。
- `0.1.0-alpha.3`：当前工作树的正文扩展和回归测试改进，尚未打标签。
- 使用 `CHANGELOG.md` 记录变化；后续修复增加预发布版本号。
- 功能和验收清单完成后再发布稳定版，安装时固定版本标签。
- 主题仓库只包含主题、文档和原创测试样例，不包含个人博客文章、配置、搜索索引或部署产物。

升级前阅读变更记录，在博客的主题子模块中取回并检出指定标签，然后在博客仓库提交子模块指针变更。先本地构建预览，再自行部署。

升级前记录博客和主题的提交号，并保留博客依赖声明、锁文件、配置及文章。先确认两个工作区都无未处理的改动，再检出确实存在的目标标签；根据该版本说明更新博客根目录依赖。执行干净构建，然后审计生成结果。切换版本需要清理 Hexo 缓存，避免保留上一版图表资源或 HTML。

回退时检出先前记录的主题提交；如果依赖也发生变化，同时恢复与目标版本配套的博客 `package.json` 和 `package-lock.json`，再运行 `npm ci`、`npm run clean`、`npm run build`。不要仅手改锁文件或删除个人资料。回退至 alpha.2 后，Mermaid 会退回代码展示，公式和脚注扩展不再提供，这是版本能力差异。

## 开发与验证

```sh
npm install
npm test
npm run test:site -- D:/blog
npm run test:lifecycle -- D:/blog
```

`test:lifecycle` 要求本地存在 `v0.1.0-alpha.2` 标签，使用传入博客的依赖声明和锁文件，在独立临时目录执行离线 `npm ci`，依次验证当前工作树全新安装、alpha.2 基线、升级及回退。各阶段使用真实 npm 构建，检查固定链接、正文、个人资料和配置哈希，保留日志与生成产物。它验证的是给定锁文件的可重复安装及主题切换；不代表远端克隆、新版本标签发布或完全无缓存的联网安装已经验收。

若缓存缺包，执行 `npm run test:lifecycle -- D:/blog --online`，允许 npm 按原锁文件下载缺失依赖。主题切换各阶段保留同一套已安装依赖；该测试不验证任意历史锁文件之间的依赖迁移。

`npm test` 在系统临时目录创建独立 Hexo 站点，检查原生构建、归档、分类标签入口、搜索排除、子目录资源及永久链接。测试样例为原创内容。`npm run test:site -- D:/blog` 在博客完成构建后检查现有文章的 Mermaid、公式、脚注、图片替代文本和内部资源引用。临时结果保留供排查。

当前独立构建测试基于 Hexo 8.1.2，主题开发依赖固定为该版本。测试样例覆盖 Mermaid、行内与块级公式、脚注、代码、表格和外部图片路径。2026-09-08，在 Node.js 26.3.0 环境下通过主题构建测试、当前博客的 npm run build 和站点兼容性审计。构建验证不代表已完成全部浏览器兼容性验收。原型阶段已检查 Chromium 桌面与手机尺寸的排版、明暗切换、Mermaid 和搜索。正式主题仍需继续完成跨浏览器、媒体及正文扩展验收。详细计划见 [ROADMAP.md](ROADMAP.md)。

## 许可证

[MIT](LICENSE)。第三方依赖沿用各自许可证，本仓库未复制第三方前端库。

# 拾光集重构任务

## 项目背景
你正在重构一个基于 Cloudflare Workers 的网址导航站项目。项目当前是单文件巨石架构（work_v2.js，2908行），需要拆分为模块化结构。

## ⚠️ 关键约束
1. **Cloudflare Workers 语法**：不使用 Node.js API，只用 Workers Runtime API
2. **原文件保留**：work_v2.js、work_v1.js、worker.js 不要修改，新代码写在 src/ 目录
3. **保持功能不变**：拆分后功能必须与 work_v2.js 完全一致

## 任务 1：创建模块化目录结构

在项目根目录下创建 `src/` 目录，按以下结构拆分：

```
src/
├── index.js              # 入口文件，路由分发
├── api/
│   ├── router.js         # API 路由分发
│   ├── sites.js          # sites 表 CRUD
│   ├── pending.js        # pending_sites 表 CRUD
│   └── categories.js     # categories CRUD
├── admin/
│   ├── router.js         # Admin 路由
│   ├── auth.js           # 会话管理
│   └── pages.js          # 页面渲染（含静态资源）
├── frontend/
│   └── renderer.js       # 前台页面渲染
├── utils/
│   ├── html.js           # escapeHTML, sanitizeUrl
│   ├── sort.js           # normalizeSortOrder
│   └── icons.js          # SVG 备用图标
└── templates/
    ├── admin.html        # 管理后台 HTML
    ├── admin.css         # 管理后台 CSS
    ├── admin.js          # 管理后台前端 JS
    ├── login.html        # 登录页 HTML
    └── frontend.html     # 前台页面模板（TailwindCSS CDN）
```

## 任务 2：修复 Bug

### Bug #26：退出登录后刷新网页不用密码进入管理页面
问题分析：`destroyAdminSession` 删除了 KV 中的 session，但浏览器的 cookie 可能没有被正确清除。
修复方向：
- 确保退出时 `Set-Cookie` 的 `Max-Age=0` 和 `Path=/` 正确
- 确保 session cookie 名称在所有地方一致（`nav_admin_session`）
- 在 `validateAdminSession` 中，如果 token 无效必须返回 `{ authenticated: false }`

### Bug #24：README 和 schema.sql 的 SQL 不一致
README 中的 SQL 有 `"desc"` (带引号)，schema.sql 中是 `desc` (不带引号)。
修复方向：统一使用不带引号的 `desc`，因为 `desc` 在 D1 中不是保留字（但在某些 SQL 方言中是）。

## 任务 3：代码优化

### 优化 1：Admin 编辑接口改为单条查询
当前 `handleEdit` 在前端用 `fetch('/api/config?page=1&pageSize=1000')` 拉所有数据。
改为：
- 新增 `GET /api/config/:id` 接口，单条查询
- 前端 `handleEdit` 改为调用新接口

### 优化 2：后台书签列表按分类分组显示（Issue #23）
在管理后台的书签列表中，按 catelog 分组显示，每组有分类标题。

### 优化 3：Favicon 自动获取（Issue #23）
添加一个新的 API 端点 `GET /api/favicon?url=xxx`，代理获取网站的 favicon。
- 尝试从 `https://api.iowen.cn/favicon/{url}` 获取
- 如果失败，返回空，前端使用默认图标

### 优化 4：移动端卡片尺寸优化（Issue #29）
调整前台卡片的 padding、字号、图标大小，让移动端更紧凑。

## 任务 4：样式提取

将内嵌在 JS 字符串中的 CSS 和 HTML 提取为独立文件：
- admin 页面的 CSS → `src/templates/admin.css`
- admin 页面的 HTML → `src/templates/admin.html`
- admin 页面的 JS → `src/templates/admin.js`
- 登录页 HTML → `src/templates/login.html`

注意：在 Cloudflare Workers 中，可以通过 `import adminHtml from './templates/admin.html'` 或者在代码中 `fetch` 自身的 `/static/xxx` 路径来加载这些文件。推荐在 Worker 内部用字符串模板引用，或通过 `env.ASSETS` 绑定静态资源。

## 执行顺序

1. 先创建目录结构和所有文件骨架
2. 从 work_v2.js 逐个模块复制逻辑到对应文件
3. 修改入口文件 index.js 的路由分发
4. 修复 Bug #26 和 #24
5. 实施优化 1-4
6. 确保所有功能与原版一致

## 工作目录
/workspace/vscode/nav/

## 参考文件
- 原始代码：work_v2.js（只读参考）
- 分析文档：PROJECT_ANALYSIS.md
- 数据库结构：schema.sql

# 拾光集 (Nav) 项目分析报告

## 项目概述

**仓库**: https://github.com/wangwangit/nav
**定位**: 基于 Cloudflare Workers + D1 + KV 的精品网址导航站
**技术栈**: Cloudflare Workers (单文件)、D1 数据库、KV 存储、TailwindCSS CDN
**当前状态**: work_v2.js 是最新版本（2908 行），全部逻辑在单文件中

## 架构现状

### 文件结构
```
nav/
├── worker.js       (2029行, 86KB) - 历史初版，不再更新
├── work_v1.js      (2134行, 91KB) - 旧版，保留兼容
├── work_v2.js      (2908行, 120KB) - 当前主版本
├── schema.sql      (29行) - 数据库表结构
├── README.md       (13KB) - 文档
└── LICENSE
```

### work_v2.js 内部逻辑模块（单文件内）

| 模块 | 行号范围 | 职责 |
|------|---------|------|
| SVG 图标 & 工具函数 | 1-100 | 备用 SVG、renderSiteCard、escapeHTML、sanitizeUrl、normalizeSortOrder |
| 会话管理 | 100-180 | Cookie 解析、KV 会话创建/验证/销毁 |
| API 层 | 201-700 | D1 CRUD：sites、pending_sites、categories、import/export |
| Admin 管理后台 | 700-2000 | 登录页、管理页（含内嵌 HTML/CSS/JS 字符串） |
| 前台渲染 | 2000-2908 | 公开页面：侧边栏、卡片网格、搜索、投稿模态框 |

### 数据库表（3 张）

1. **sites** - 已发布书签（id, name, url, logo, desc, catelog, sort_order, create_time, update_time）
2. **pending_sites** - 待审核书签（id, name, url, logo, desc, catelog, create_time）
3. **category_orders** - 分类排序（catelog PK, sort_order）

## GitHub Issues 分析（仅 Open）

| # | 标题 | 类型 | 优先级 | 采纳？ |
|---|------|------|--------|--------|
| #30 | 部署方法有问题 | 部署问题 | P1 | ✅ README 部署指引需完善 |
| #29 | 书签图标也太大了 | UI/UX | P1 | ✅ 移动端卡片需优化尺寸 |
| #26 | 退出登录后刷新网页不用密码进管理页 | 安全 Bug | P0 | ✅ **必须修复** - 会话验证逻辑有缺陷 |
| #25 | 能不能设置默认显示高点击率分类 | 功能建议 | P3 | ❌ 暂不做 - 需要新增点击统计表，复杂度高，ROI 低 |
| #24 | readme 和 schema.sql 的 sql 不一致 | 文档 | P2 | ✅ 简单修复 |
| #23 | 后台书签列表混乱 + 拖动排序 + logo 接口获取 | 功能增强 | P2 | ✅ 部分采纳 - 后台按分类分组 + favicon 自动获取；拖动排序暂不做（复杂度高） |

## 代码质量问题

### 严重
1. **单文件巨石架构**: 2908 行全在 work_v2.js，HTML/CSS/JS 全部以字符串内嵌，极难维护
2. **#26 会话安全 Bug**: `validateAdminSession` 中刷新 TTL 的逻辑可能与 `Set-Cookie` 冲突导致退出失效
3. **编辑时全量加载**: `handleEdit` 调用 `/api/config?page=1&pageSize=1000` 拉所有数据找一条，浪费资源

### 中等
4. **Admin 页面 CSS 重复**: 多处重复的 input/button/table 样式定义
5. **Admin JS 未格式化**: admin.js 字符串中的 JS 代码缩进混乱
6. **SQL 注入防护不足**: 虽然用了 prepare/bind，但 sort_order 的 normalizeSortOrder 逻辑可更健壮
7. **前端搜索纯客户端**: 所有数据加载后在浏览器端 filter，数据量大时性能差

### 低
8. **SVG 图标硬编码**: 备用图标直接写在代码里，不可配置
9. **缺少错误边界**: 前端 fetch 错误处理只有 alert，用户体验差

## 重构计划

### Phase 1: 文件拆分（保持功能不变）

将 work_v2.js 拆分为 Cloudflare Workers 标准模块结构：

```
src/
├── index.js              # 入口：路由分发
├── api/
│   ├── router.js         # API 路由逻辑
│   ├── sites.js          # sites CRUD
│   ├── pending.js        # pending_sites CRUD
│   └── categories.js     # categories CRUD
├── admin/
│   ├── router.js         # Admin 路由
│   ├── auth.js           # 会话管理（修复 #26）
│   └── pages.js          # 页面渲染
├── frontend/
│   └── renderer.js       # 前台页面渲染
├── utils/
│   ├── html.js           # escapeHTML、sanitizeUrl
│   ├── sort.js           # normalizeSortOrder
│   └── icons.js          # SVG 图标
├── templates/
│   ├── admin.html        # 管理后台 HTML（从字符串中提取）
│   ├── admin.css         # 管理后台 CSS（从字符串中提取）
│   ├── admin.js          # 管理后台 JS（从字符串中提取）
│   ├── login.html        # 登录页
│   └── frontend.html     # 前台页面模板
└── schema.sql            # 数据库结构
```

**注意**: 原 work_v2.js 保留不动，新代码在 src/ 中写。

### Phase 2: Bug 修复

1. **#26 会话安全**: 修复退出登录后刷新仍能进入后台的问题
   - 检查 `destroyAdminSession` 是否正确删除 KV 中的 session
   - 检查 `Set-Cookie` 的 Max-Age=0 是否正确清除 cookie
   - 可能的 root cause: cookie 名和 session key 不匹配

2. **#24 schema.sql 不一致**: 同步 README 和 schema.sql 中的建表语句

### Phase 3: 优化

1. **#29 移动端卡片尺寸优化**: 缩小卡片中的图标/文字尺寸
2. **#23 后台按分类分组显示**: 书签列表按 catelog 分组
3. **#23 favicon 自动获取**: 集成 favicon API（如 `https://api.iowen.cn/favicon/{url}`）
4. **编辑接口优化**: 改为 `/api/config/:id` GET 单条，不再全量拉取
5. **Admin CSS 重复清理**: 提取公共样式

### 不做的事（取舍决策）

| Issue | 原因 |
|-------|------|
| #25 点击率统计 | 需新增统计表 + Worker 运行时写入，复杂度高，当前阶段 ROI 低 |
| 拖动排序 (#23 部分) | 前端拖拽库引入会增加 bundle 体积，且 Cloudflare Workers 不支持 WebSocket，实时拖拽体验差 |
| 前端搜索改服务端 | 当前数据量（<1000 条书签）客户端搜索完全够用，不需要优化 |

## 执行策略

1. 我（凹凸曼）负责：任务分配、代码 review、测试验证
2. kiro CLI（claude-opus-4.6）负责：实际代码编写
3. 所有代码改动仅在 src/ 目录下进行，原 work_v2.js 保留
4. 每个 Phase 完成后 review 再推进下一步

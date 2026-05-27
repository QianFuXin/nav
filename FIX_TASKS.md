# 拾光集修复任务清单

基于 COMPREHENSIVE_REVIEW.md 的检查结果，按优先级分发以下修复任务。

## 任务执行规则
1. 每次只修复一个问题
2. 修复后立即 `git add` + `git commit`
3. commit message 格式：`fix: 问题描述` 或 `feat: 新功能描述`
4. 修复前先阅读相关代码，理解上下文
5. 修复后自检，确保不引入新问题

---

## 任务 1：修复 README.md 与 schema.sql 不一致（Bug #24）
**优先级：高**
**问题**：README.md 中的建表 SQL 有 `"desc"`（带引号）和 `status` 字段，schema.sql 中没有
**修复方向**：
- 统一使用 schema.sql 的版本（不带引号的 `desc`，无 `status` 字段）
- 更新 README.md 中的 SQL 示例，与 schema.sql 保持一致
**验证**：对比 README.md 和 schema.sql 的 SQL 语句

## 任务 2：补齐 src/templates/frontend.html
**优先级：中**
**问题**：前台模板未独立抽离，仍在 src/frontend/renderer.js 内拼接
**修复方向**：
- 从 renderer.js 中提取 HTML 模板部分到 src/templates/frontend.html
- renderer.js 改为读取模板文件并注入数据
- 保持功能不变
**验证**：前台页面渲染正常

## 任务 3：统一 admin.js 文件命名
**优先级：中**
**问题**：实际文件为 admin.js.txt，与规划的 admin.js 不一致
**修复方向**：
- 重命名 src/templates/admin.js.txt → src/templates/admin.js
- 更新 src/admin/pages.js 中的静态映射路径
**验证**：管理后台 JS 正常加载

## 任务 4：完善 favicon 功能
**优先级：中**
**问题**：API 已实现但未接入 UI，属于半成品
**修复方向**（二选一，需确认）：
- 方案 A：接入 UI - 在新增/编辑书签时调用 /api/favicon 自动获取图标
- 方案 B：移除半成品 - 删除 /api/favicon 接口，避免代码冗余
**验证**：根据选择的方案验证

## 任务 5：修复会话续期问题
**优先级：低**
**问题**：validateAdminSession 刷新 KV TTL 但未刷新浏览器 Cookie
**修复方向**：
- 在验证会话成功后，重新设置 Cookie 的 Max-Age
- 保持与 KV TTL 一致（12小时）
**验证**：长时间使用后台不会意外退出

## 任务 6：补充接口级回归测试
**优先级：低**
**问题**：缺少关键接口的测试覆盖
**修复方向**：
- 创建 tests/ 目录
- 编写关键接口的测试用例：
  - /admin/logout
  - GET /api/config/:id
  - 分类排序
  - 投稿开关
  - 导入/导出
**验证**：测试通过

---

## 执行进度

- [ ] 任务 1：修复 README.md 与 schema.sql 不一致
- [ ] 任务 2：补齐 src/templates/frontend.html
- [ ] 任务 3：统一 admin.js 文件命名
- [ ] 任务 4：完善 favicon 功能
- [ ] 任务 5：修复会话续期问题
- [ ] 任务 6：补充接口级回归测试

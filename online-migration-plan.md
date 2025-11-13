# 在线化迁移计划

## 背景与目标
- 将「想象词汇宇宙」从本地关卡管理迁移到 100% 在线、依托 Supabase 的运行模式。
- 玩家端始终访问线上版本；离线模式仅作为降级兜底。
- 管理员可直接在浏览器中创建、编辑、发布关卡，无需手动同步或部署。
- 所有排行榜、玩家进度与配置统一托管在 Supabase，避免本地缓存失真。

## 数据模型速览
| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `profiles` | 玩家公开资料 | `preferred_language`、`username` UNIQUE |
| `user_progress` | 全局货币 / 经验 / 设置 | `coins`、`experience`、`settings` JSON、`last_online_at` |
| `levels` | 线上关卡定义（JSON 内容） | `difficulty`、`language[]`、`version`、`is_published`、`content` |
| `user_level_progress` | 玩家在单关的状态 | `status`、`best_time_ms`、`attempts`、唯一 `(user_id, level_id)` |
| `leaderboards` | 关卡最佳成绩 | 唯一 `(user_id, level_id)`，记录用时、金币、提示数 |
| `admin_users` | 管理员白名单 | 记录具备后台访问权限的用户 |

所有业务表均开启 RLS：
- 关卡、排行榜等公开数据只对 `is_published = true` 的记录开放匿名读取。
- 玩家只能读取 / 写入自己的 `profiles`、`user_progress`、`user_level_progress`、`leaderboards`。
- 在 `admin_users` 中的账号可以通过服务端密钥或 Edge Function 调用受限接口。

## 迁移步骤
1. **数据库部署**
   - 在本地或 CI 中执行 `supabase db push`（或直接在 Supabase SQL 编辑器运行 `supabase/setup.sql`）。
   - 使用 Supabase Dashboard 插入首批 `admin_users` 记录，确保至少有一个管理员入口。
2. **前端/后端串接**
   - 读取关卡：改为从 `public.levels` 查询 `is_published = true` 的记录，并解析 `content` JSON（仅含 `tutorialSteps` 与 `groups`，其余数据来自列字段）。
   - 玩家进度：通过 `user_progress` 与 `user_level_progress` 的 RPC/REST 接口读写，不再依赖本地缓存文件。
   - 排行榜：完成关卡后向 `leaderboards` upsert 成绩，允许多次刷新最佳记录。
   - 管理后台：依托新的 `/routes/Admin.tsx`，提供关卡 CRUD、用户目录与排行榜查看。
3. **访问控制**
   - 所有 Supabase 客户端请求默认携带玩家 Session，自动享受 RLS 保护。
   - 管理员操作通过 `supabaseAdmin` 服务端客户端或 Edge Function 转发，避免在浏览器中泄露服务密钥。
4. **管理员 UI 本地化与体验**
   - 后台控制台完全切换为中文界面，包含：
     1. 线上关卡列表与 JSON 编辑器。
     2. 新的「用户总览」标签：支持按用户名/ID 搜索、查看金币、经验、最近在线时间，并展示关卡进度明细。
     3. 排行榜标签：下拉选择关卡即可查看实时最佳成绩。
   - 用户列表使用 `profiles + user_progress` 合并数据，详情面板调用 `fetchRemoteProgress` 与 `fetchUserLevelProgressRecords`。
   - 排行榜查询移除 Supabase 隐式关系，改为两段式查询，修复 “Could not find a relationship between 'leaderboards' and 'user_id'” 的缓存错误。
5. **验证与监控**
   - 在开发环境创建多个测试账号，验证：
     - 新玩家可看到 `level-001` 并自动生成初始进度。
     - 修改 `levels.content` 后，前端能即时获取新结构。
     - 非管理员无法写入 `levels` / `leaderboards` 他人记录。
     - 排行榜公开可读，但只能更新自己的成绩。
   - 上线后关注 Supabase 日志与前端错误上报，确保无循环回退到离线模式。

## 后续演进（可选）
1. 引入 `levels_history` 或 `level_versions` 记录，保留关卡编辑审计链路。
2. 为 `levels.content` 添加 JSON Schema 校验，阻止无效配置进入线上。
3. 在管理后台增加可视化统计，例如每日活跃、关卡完成率等指标，辅助设计师调优。

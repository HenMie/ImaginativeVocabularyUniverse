# 脑洞外语词场（ImaginativeVocabularyUniverse）

[![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](https://github.com/your-username/ImaginativeVocabularyUniverse)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-ffca3a.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3ecf8e.svg)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Vitest%20%2B%20Playwright-ready-7D4AEA.svg)](./playwright.config.ts)

> 一款以 **词牌拖拽分组** 为核心玩法的多语言外语学习游戏。项目结合 Supabase 云端能力、离线优先的 PWA、Zustand 状态管理以及 React DnD，打造出既适合自学也方便运营管理的完整产品。

---

## 📌 项目概览

- **多语言词汇场**：关卡数据支持韩/中/英/日等多语文本，玩家可自由组合游戏语言与释义语言。
- **云端 + 离线双模式**：Supabase 负责认证、进度、排行榜；本地 sessionStore/ProgressStore 则保证断网可玩与数据回放。
- **运营级后台**：`/admin` 提供可视化关卡编辑器、用户目录、排行榜及系统开关管理。
- **全链路体验守护**：Version Manager、NetworkStatus、RequestManager、SessionHealthChecker 协作，确保更新、网络、会话都可观测可恢复。

---

## ✨ 核心特性

### 🎮 学习玩法
- **智能拖拽棋盘**：`LevelPlay` 结合 React DnD + `useSimpleTouchControl`，桌面/触屏统一手感。
- **经济与提示系统**：`constants/economy.ts` 定义的金币、提示成本及递增公式在 `sessionStore` 中实时扣费。
- **渐进式教程**：`TutorialOverlay`、`animationOptimizer` 帮助新玩家理解规则并平滑过渡至正式挑战。
- **多语言词牌排版**：根据 `LanguageSettings` 中的偏好，动态选择字体、字号与释义语言顺序。

### 🧠 智能系统
- **Zustand 状态矩阵**：
  - `progressStore`：云端/本地进度双写、语言偏好、调试模式。
  - `sessionStore`：关卡内局部状态（棋盘、提示、高亮、完成行）。
  - `vocabularyStore`：生词本加载、增删、复习、批量导出。
  - `languageStore` / `themeStore`：全局语言与主题。
- **请求与缓存守护**：`requestManager` 负责请求去重、超时、退避重试、网络状态监听，并与 `levelService`、`playerProgressService` 等服务层共享。
- **会话保活**：`sessionHealthChecker` 每 5 分钟检测 Supabase 会话，必要时自动刷新。
- **版本刷新**：`versionManager.handleVersionUpdate` 注入构建版本，检测更新后清除 localStorage / sessionStorage / Service Worker 缓存，配合 `virtual:pwa-register` 保持 PWA 干净。

### 🌐 在线 & 权限
- **Supabase Auth**：邮箱/密码注册、登录、重置密码，`ProtectedRoute` 保证 `/profile`、`/levels/:id`、`/settings`、`/vocabulary`、`/admin` 等私有路由安全。
- **管理面板**：`Admin.tsx` 集成 VisualLevelEditor、用户搜索、排行榜查看、系统配置（注册开关、邮箱验证、提示倍率等）。
- **数据服务**：`services/*` 将 Supabase 表（levels、user_progress、user_level_progress、vocabulary_book、system_settings 等）与前端实体解耦，所有异常统一抛出可读信息。

### 📱 体验与性能
- **PWA & 离线**：`vite-plugin-pwa` 配置独立 manifest、图标、Workbox 路由策略；`public/_redirects`、`.htaccess`、`nginx.conf.example` 分别覆盖 Netlify/Apache/Nginx SPA 场景。
- **响应式 + 动效**：Tailwind 设计系统配合 `styles/animations.css` 与 `animationOptimizer`，在大型列表（LevelSelect）和复杂布局（Admin）中保持帧率稳定。
- **网络感知**：`NetworkStatus` 顶部提示栏 + `requestManager` 自动取消队列，确保断网后立即反馈。
- **多格式导出**：`utils/exportVocabulary.ts` 使用 html2canvas + jsPDF + CSV/TXT 适配，实现生词本一键归档。

---

## 🏗 架构速览

### 技术栈

| 层次 | 组件 |
| --- | --- |
| UI & 路由 | React 19 · React Router 7 · TailwindCSS 3 · React DnD (HTML5 + Touch backend) |
| 状态管理 | Zustand 5（`persist` + `createJSONStorage`） |
| 数据访问 | Supabase JS 2.x · RequestManager（自研网络守卫） |
| 构建 & 工具 | Vite 7 · TypeScript 5.9 · vite-plugin-pwa · PostCSS |
| 测试 | Vitest + @testing-library/react + Playwright |

### 目录结构（节选）

```
├─ public/
│  ├─ icons/                   # PWA 图标
│  ├─ _redirects / .htaccess   # SPA 重写示例
│  └─ languages.json           # 可扩展语言配置
├─ src/
│  ├─ App.tsx / main.tsx       # 路由 & DnD Provider / PWA 注入
│  ├─ components/              # AppHeader、UserMenu、TutorialOverlay、TileDragLayer 等
│  ├─ routes/                  # LevelSelect, LevelPlay, LanguageSettings, VocabularyBook, Admin ...
│  ├─ store/                   # progressStore, sessionStore, vocabularyStore, languageStore, themeStore
│  ├─ services/                # levelService, playerProgressService, adminService, systemSettingsService ...
│  ├─ utils/                   # board, translation, requestManager, versionManager, animationOptimizer ...
│  ├─ constants/               # economy, levels, groupColors, languages, storage
│  ├─ contexts/                # AuthContext
│  ├─ hooks/                   # useAuth, useSimpleTouchControl, useDownloadShortcut 等
│  ├─ types/                   # levels, language, progress, vocabulary
│  └─ styles/                  # animations.css、global reset
├─ supabase/setup.sql          # 完整数据库 & RLS 初始化脚本
├─ scripts/add_lang_translations.py # 批量补全关卡翻译的辅助脚本
├─ e2e/level-select.spec.ts    # Playwright 端到端示例
└─ nginx.conf.example          # 生产部署参考
```

---

## 🔧 模块说明

### 路由与 UI
- `App.tsx`：注册公开/保护路由，统一 AppHeader + Footer 框架，并在首次加载时并行触发 `fetchLanguages`、`sessionHealthChecker`。
- `LevelSelect`：从 `levelService.fetchLevelIndex` 取数据，展示难度分级卡片、奖励、支持版本更新检测与缓存刷新。
- `LevelPlay`：组合 `WordTile`、`GroupRow`、`CompletedRow`、`TileDragLayer`，驱动 `sessionStore` 的棋盘状态、提示工具（group/theme/assemble/verify）以及 `useVocabularyStore` 的生词记录。
- `LanguageSettings`：拖拽排序释义语言、选择游戏语言，尊重 `MIN/MAX_DEFINITION_LANGUAGES` 常量并写入 `progressStore`。
- `VocabularyBook`：基于 `vocabularyStore` 提供筛选、搜索、笔记、复习计数和 TXT/PDF/CSV 导出。
- `Admin`：整合 VisualLevelEditor、用户目录、排行榜和系统设置，调用 `levelService`、`playerProgressService`、`userDirectoryService`、`systemSettingsService`。

### 状态层
- `progressStore`：负责 coins、hint 余额、关卡解锁、语言偏好、远程同步（`fetchRemoteProgress`/`persistRemoteProgress`）；支持 Debug 模式和离线回滚。
- `sessionStore`：单局状态机，含高亮状态、hint 冷却、`findMatches`、`swapTiles`、`buildCompletedGroup` 等核心算法结果，持久化于 sessionStorage。
- `vocabularyStore`：包装 `vocabularyService`，统一错误提示并提供 `getLanguages`、`getCount`、`markReviewed`。
- 其它 store：`languageStore` 缓存 `languages.json`，`themeStore` 负责系统/深浅色同步，并在 `main.tsx` 启动时立即应用。

### 服务层
- `levelService`：Supabase CRUD + 内存缓存，配合 `requestManager` 避免重复请求。
- `playerProgressService`：读写 `user_progress`、`user_level_progress`、`leaderboards`。
- `systemSettingsService` / `adminService` / `userDirectoryService` / `profileService` / `vocabularyService`：分别处理运营开关、管理员、用户目录、个人资料和生词本。
- `languageService`：从 `public/languages.json` 拉取配置，具备 Pending Promise 抑制与无缓存 fetch。

### 工具与常量
- `utils/board.ts`：所有关卡算法（智能初始布局、匹配校验、完成行建模）。
- `utils/requestManager.ts`：请求排他 + AbortController + 离线取消 + 5 分钟陈旧清理。
- `utils/versionManager.ts`：版本比较、缓存清理、Service Worker 注销。
- `constants/*`：集中定义经济系统、难度奖励、颜色主题、存储键名、语言约束。
- `styles/animations.css` + `animationOptimizer`：通过 IntersectionObserver/ResizeObserver/RAF 提升动画性能。

---

## 🎮 场景详解

- **关卡游玩**：`LevelPlay` 根据 `progressStore` 中的 languagePreferences 选择词牌文案，并在完成后调用 `completeLevel` + `upsertUserLevelProgressRecord`，同步 coins、经验、排行榜。
- **多语言设置**：`LanguageSettings` 支持拖拽排序释义语言，自动限制 1～3 种语言；`public/languages.json` 可扩展 TTS voice、字体、书写方向，配合 `scripts/add_lang_translations.py` 批量翻译关卡文本。
- **生词本**：`VocabularyBook` 可按语言过滤、全文搜索、编辑笔记，支持 TXT（带 BOM）、CSV、PDF（html2canvas + jsPDF + autotable）导出，并可直接跳转回关卡。
- **管理后台**：VisualLevelEditor 以 JSON + 画布双模式编辑 `levels` 表，内置一键上/下架、版本号管理、教程步骤多语言编辑，此外还能批量更新系统配置、调整管理员列表。
- **网络与版本保护**：`NetworkStatus` + `requestManager` 在 Offline 时立即取消请求；`sessionHealthChecker` 维持 Supabase 会话；`versionManager` 保证 PWA 更新后没有旧缓存冲突。

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- npm ≥ 9（建议使用）  
- Supabase 项目（含数据库、认证服务）或离线模式

### 本地运行
```bash
git clone https://github.com/your-username/ImaginativeVocabularyUniverse.git
cd ImaginativeVocabularyUniverse
npm install

cp .env.local.example .env.local   # 填写 Supabase URL/Key 等
npm run dev                       # 默认 http://localhost:5173
```

### 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite，本地调试（含 React Fast Refresh） |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm run preview` | 预览 `dist`，配合 Playwright |
| `npm run test` / `test:watch` | Vitest（单元 + 组件） |
| `npm run test:e2e` | Playwright（默认复用 `npm run preview`） |

调试提示：
- 使用 VSCode + Tailwind CSS IntelliSense + ESLint 插件获取原子类提示。
- React/Redux DevTools 可直接检查 Zustand store（Zustand 内置兼容）。

---

## 🔐 环境变量

`.env.local`（参考 `.env.local.example`）：

| 变量 | 说明 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 匿名密钥（客户端交互） |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | *可选*，仅在需要调用 `supabaseAdmin`（如批量脚本）时配置 |
| `VITE_APP_URL` | 前端访问地址（用于邮件链接等） |
| `VITE_DEBUG_MODE` | 开启后 `progressStore` 允许调试模式 |

> 未配置 Supabase 时，应用仍可在本地依赖浏览器存储运行，部分在线功能（同步、排行榜、管理员）会自动降级。

---

## 🌐 Supabase 集成

- `supabase/setup.sql` 一次性创建 **profiles / user_progress / user_level_progress / levels / leaderboards / admin_users / system_settings / vocabulary_book** 表、索引、RLS 策略及触发器。
- 推荐流程：
  1. 在 Supabase Dashboard ➜ SQL Editor 中执行 `setup.sql`。
  2. 按文档添加管理员账号（`admin_users`）。
  3. 在项目设置中开启邮箱登录，配置 SMTP。
- `services/*` 默认使用匿名密钥；如需后台脚本，可通过 `lib/supabaseAdmin.ts` 懒加载 Service Role 客户端。

---

## 🧪 测试与质量

| 类型 | 工具 | 范围 |
| --- | --- | --- |
| 单元/组件 | Vitest + Testing Library（`src/test/setupTests.ts`） | `utils/board` 算法、`versionManager`、关键组件 |
| 端到端 | Playwright (`e2e/level-select.spec.ts`) | 关卡选择、拖拽交互、离线提示 |
| 手动回归 | 文档建议 | 新增关卡后按提示检查匹配、提示扣费、排行榜入榜等 |

> 在 CI 中可使用 `npm run test` + `npm run test:e2e`，Playwright 默认在端口 `4173` 上复用 `npm run preview`。

---

## 📦 构建与部署

1. `npm run build` ➜ 产物位于 `dist/`，纯静态文件可部署到任意 CDN/静态托管。
2. **Netlify**：构建命令 `npm run build`，发布目录 `dist`，保留 `public/_redirects` 实现 SPA 回退。
3. **Vercel / Render / Cloudflare Pages**：同样使用 SPA 回退规则（`/* -> /index.html`）。
4. **自托管 Nginx**：参考 `nginx.conf.example`，确保开启 gzip / brotli、缓存策略以及 `try_files $uri /index.html;`。
5. **PWA 要求 HTTPS**：生产部署务必启用 HTTPS，才能正确注册 Service Worker 与推送更新。

---

## 🛠️ 工具与自动化

- `scripts/add_lang_translations.py`：扫描 `public/levels`（或自定义目录），调用 Google Translate 批量补全多语言字段，适合批量制作新关卡。
- `database/`：可放置额外 SQL 或迁移脚本（当前留空以便扩展）。
- `dev-dist/`：Vite 预构建缓存，便于分析与调优。

---

## 🔄 版本里程碑

### v1.2.1
- RequestManager/NetworkStatus 升级，断网时自动取消请求并提示，恢复后 3 秒内自动收起。
- LanguageSettings 全面升级：拖拽排序、限制语言数量、即时写入 `progressStore`，并支持从 `languages.json` 自动带出字体信息。
- VocabularyBook 支持 TXT / CSV / PDF 三种导出格式、快速搜索与笔记编辑。
- Admin 面板整合 VisualLevelEditor、排行榜、用户目录与系统设置，所有操作直接落 Supabase。

### v1.1.1
- 引入 Version Manager：比对 `VITE_APP_VERSION`，自动清理旧缓存并触发 PWA 重新注册。

### v1.1.0
- Supabase 打通：用户体系、云端进度、排行榜、管理员权限、系统开关全部上线。
- UI 迭代：Apple 风格动效、暗色模式、全局网络/同步状态。

### v1.0.0
- 核心玩法、经济系统、多语言支持、PWA 基础能力落地。

---

## 📄 许可证

项目使用 [MIT License](./LICENSE)。欢迎基于当前架构二次开发或贡献 PR，如果涉及 Supabase Schema 调整，请同步更新 `supabase/setup.sql` 与文档。

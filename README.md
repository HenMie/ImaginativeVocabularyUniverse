# 脑洞外语词场（ImaginativeVocabularyUniverse）

一款 React + Vite 打造的外语词汇分组小游戏。玩家拖动词牌组成主题行，赚取金币、解锁关卡，同时可以导入导出本地存档。

## 快速开始

```bash
npm install
npm run dev   # 启动开发服务器（默认 http://localhost:5173）
```

> Vite 7 依赖 Node.js ≥ 18，请确认本地环境满足要求。项目使用 TypeScript 与 TailwindCSS，编辑器建议安装对应插件以获得类型与样式提示。

常用脚本：

- `npm run dev`：开启热更新开发环境
- `npm run build`：类型检查 + 产出生产构建（输出到 `dist/`）
- `npm run preview`：本地预览构建产物
- `npm run test`：运行单元与组件测试（Vitest + Testing Library）
- `npm run test:e2e`：运行 Playwright 端到端脚本

## 源码结构速览

- `src/routes/LevelSelect.tsx`：关卡列表、奖励展示、备份弹窗入口
- `src/routes/LevelPlay.tsx`：关卡主界面、拖拽交互、提示系统、结算逻辑
- `src/components`：词牌、提示图层、导入导出等 UI 模块
- `src/store`：基于 Zustand 的进度、会话、语言状态管理（含本地存档）
- `src/services`：静态资源加载（关卡、语言配置）
- `src/utils/board.ts`：词牌实例化、行匹配、拖动重排等核心算法
- `public`：静态数据（语言、关卡 JSON）、静态资源

## 玩法与系统概览

- 拖拽：React DnD + 多后端（触摸与桌面）支持，同时通过 `TileDragLayer` 自定义拖拽预览。
- 词牌显示：场上最多保留 6 行（24 张）词牌，其余词牌自动进入候补队列，出现空位时即时补齐。
- 提示经济：`constants/economy.ts` 定义阶梯价格；`LevelPlay` 中按使用次数实时扣币，复盘模式（已通关关卡）自动免单。
- 进度存档：`progressStore` 持久化到 `localStorage`，默认给出金币与解锁顺序；`ImportExportModal` 支持文本/文件双格式备份。
- 教学指引：每个关卡可定义 `tutorialSteps`，第一次游玩时用 `TutorialOverlay` 弹层引导。
- 语言资源：`public/languages.json` 描述已支持语种、首选字体、TTS 配置；`languageStore` 负责全局语言切换。

## 关卡数据规范

关卡由目录 `public/levels/` 下的索引文件与若干关卡文件共同驱动。

### 1. 索引文件 `public/levels/index.json`

- `version`：索引版本号，当前为 `1`。
- `levels`：数组定义关卡顺序，每个元素对应一个 `LevelIndexEntry`。

示例片段：

```5:18:public/levels/index.json
  "levels": [
    {
      "id": "level-001",
      "name": "关卡1",
      "difficulty": "easy",
      "file": "level-001.json"
    },
    {
      "id": "level-002",
      "name": "关卡2",
      "difficulty": "medium",
      "file": "level-002.json"
    }
  ]
```

字段说明：

- `id`：唯一关卡标识（需与关卡文件内一致），用于路由与存档键。
- `name`：展示名称。
- `difficulty`：`easy | medium | hard`，影响关卡奖励（见 `constants/levels.ts`）。
- `file`：实际加载的关卡 JSON 文件名。

### 2. 关卡文件（如 `public/levels/level-001.json`）

每个关卡文件遵循 `LevelFile` 接口：

- 元数据段
  - `id`、`name`、`difficulty`：需与索引保持一致。
  - `version`：关卡数据版本（便于未来迁移）。
  - `languageCodes`：本关涉及的语言代码列表，应与 `languages.json` 中的 `code` 对齐。
  - `tutorialSteps`：可选字符串数组，定义首玩时的提示文案。
  - `board.columns`：可选，重写默认列数（默认 4；用于非 4×4 词场或特殊布局）。
- `groups`：主题分组数组，每组最终对应一行需要排列到位的四个词牌。

典型结构：

```1:41:public/levels/level-001.json
{
  "id": "level-001",
  "name": "关卡1",
  "difficulty": "easy",
  "version": 1,
  "languageCodes": ["ko", "zh"],
  "tutorialSteps": ["拖动四个词牌排成一行即可分组", "点击词牌可查看释义"],
  "groups": [
    {
      "id": "drinks",
      "category": "饮料",
      "colorPreset": "lilac",
      "tiles": [
        {
          "id": "milk",
          "languageCode": "ko",
          "text": "우유",
          "translations": { "zh": "牛奶" }
        },
        { "...": "..." }
      ]
    }
  ]
}
```

### 3. 分组与词牌字段

- `group.id`：全局唯一，作为完成记录、颜色标识的键值。
- `group.category`：显示给玩家的主题名称。
- `group.colorPreset`：引用 `constants/groupColors.ts` 中的预设 ID，会影响拖拽着色、完成行展示；如果省略，系统会按组索引自动分配颜色。

词牌 (`tiles`) 遵循 `TileDefinition`：

- `id`：组内唯一词牌标识。
- `languageCode`：原文语言代码，必须包含在本关 `languageCodes` 中。
- `text`：实际展示内容。
- `hint`：可选，显示在右侧详情面板的额外线索。
- `translations`：字典，键为语言代码，值为释义；最少提供中文释义（`"zh"`），也可以同列多语。

### 4. 关卡编写流程建议

1. 复制现有关卡 JSON，修改基础元信息与 `groups`。
2. 保持每组词牌数量 = `board.columns`（默认 4），否则行匹配逻辑会检测失败。
3. 确保所有 `languageCode` 均出现在关卡 `languageCodes` 与 `languages.json` 中。
4. 更新 `public/levels/index.json`，追加新的 `levels` 项；按目标顺序插入，并设置 `difficulty`。
5. 若新增颜色预设，在 `constants/groupColors.ts` 添加；`colorPreset` 不要引用不存在的 ID。
6. 本地运行 `npm run dev` 验证显示、拖拽、提示；必要时补充 Vitest/Playwright 覆盖。

## 测试与质量保障

- 单测覆盖 `utils/board` 等纯逻辑模块（见 `src/utils/__tests__/board.test.ts`）。
- E2E 测试脚本位于 `e2e/`，当前主要验证关卡选择流程；可按需扩展场景。
- 建议在新增关卡后至少手工演练：完成全部分组、触发提示、重新进入复盘模式，确认金币与提示成本结算符合预期。

## 构建与部署

`npm run build` 会生成纯静态产物，可直接部署到任何静态托管（如 Vercel、Netlify、GitHub Pages）。部署后需保证 `/levels/` 与 `/languages.json` 保持原始路径；所有资源通过相对路径加载。

---

如需引入团队协作，可考虑：

- 在 Git 工作流内对关卡 JSON 做 JSON Schema 校验（借助 Ajv / Zod）；
- 使用 CI 自动运行 `npm run build && npm run test && npm run test:e2e`；
- 为多语言词牌接入自动化翻译校验或占位符检查。

上面覆盖了当前项目结构与关卡数据规范，方便后续扩展。


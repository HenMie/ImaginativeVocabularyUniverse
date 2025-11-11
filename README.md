# 脑洞外语词场（ImaginativeVocabularyUniverse）

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/your-username/ImaginativeVocabularyUniverse)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-orange.svg)](https://vitejs.dev/)

一款基于 React + TypeScript + Vite 构建的外语词汇分组学习小游戏。通过拖拽词牌组成主题行来学习词汇，支持金币系统、关卡解锁、本地存档导入导出，以及多语言支持。

## ✨ 核心特性

- 🎮 **拖拽交互**：基于 React DnD 的流畅拖拽体验，支持桌面和触摸设备
- 💰 **经济系统**：金币奖励与提示消费机制，策略性使用游戏资源
- 🌍 **多语言支持**：内置韩/中/英/日四种语言，可分别选择“游戏语言”和“释义语言”组合游玩
- 💾 **本地存档**：支持进度保存和导入导出功能
- 📱 **PWA 支持**：可安装为桌面应用，支持离线使用
- 🎨 **响应式设计**：基于 TailwindCSS 的美观界面，适配各种设备
- 🔊 **TTS 语音**：内置语音合成功能，辅助发音学习

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 7

### 安装和运行

```bash
# 克隆项目
git clone https://github.com/your-username/ImaginativeVocabularyUniverse.git
cd ImaginativeVocabularyUniverse

# 安装依赖
npm install

# 启动开发服务器
npm run dev   # 默认 http://localhost:5173
```

### 可用脚本

- `npm run dev`：启动开发服务器（热重载）
- `npm run build`：类型检查并构建生产版本
- `npm run preview`：预览构建产物
- `npm run test`：运行单元测试和组件测试
- `npm run test:watch`：监视模式运行测试
- `npm run test:e2e`：运行端到端测试

## 🛠️ 技术栈

### 核心框架
- **React 19.2**：现代化的用户界面库
- **TypeScript 5.9**：类型安全的 JavaScript 超集
- **Vite 7.2**：极速的构建工具和开发服务器

### 状态管理与路由
- **Zustand 5.0**：轻量级状态管理库
- **React Router 7.9**：客户端路由解决方案

### UI 与交互
- **TailwindCSS 3.4**：实用优先的 CSS 框架
- **React DnD 16.0**：拖拽功能库
- **PostCSS + Autoprefixer**：CSS 处理工具链

### 数据处理
- **lz-string 1.5**：数据压缩库（用于存档）
- **clsx 2.1**：条件类名工具

### 测试与质量保障
- **Vitest 4.0**：快速的单元测试框架
- **Testing Library 16.x**：React 组件测试工具
- **Playwright 1.56**：端到端测试框架
- **TypeScript**：静态类型检查

### PWA 与性能
- **vite-plugin-pwa**：PWA 功能支持
- **Workbox**：Service Worker 缓存策略

## 📁 项目结构

```
src/
├── components/          # 可复用 UI 组件
│   ├── WordTile.tsx    # 词牌组件
│   ├── GroupRow.tsx    # 分组行组件
│   ├── TileDragLayer.tsx # 拖拽预览层
│   ├── ImportExportModal.tsx # 导入导出弹窗
│   └── TutorialOverlay.tsx # 教学引导遮罩
├── routes/             # 页面路由组件
│   ├── LevelSelect.tsx # 关卡选择页面
│   └── LevelPlay.tsx   # 关卡游戏页面
├── store/              # Zustand 状态管理
│   ├── progressStore.ts # 进度和金币状态
│   ├── sessionStore.ts  # 游戏会话状态
│   └── languageStore.ts # 语言设置状态
├── services/           # 外部服务
│   ├── levelService.ts # 关卡数据加载
│   └── languageService.ts # 语言配置加载
├── utils/              # 工具函数
│   ├── board.ts        # 游戏逻辑核心算法
│   ├── progressCodec.ts # 存档编解码
│   └── animationOptimizer.ts # 动画性能优化
├── constants/          # 常量配置
│   ├── economy.ts      # 经济系统配置
│   ├── levels.ts       # 关卡奖励配置
│   ├── groupColors.ts  # 分组颜色预设
│   └── storage.ts      # 存储键名配置
└── types/              # TypeScript 类型定义
    ├── levels.ts       # 关卡相关类型
    ├── language.ts     # 语言相关类型
    └── progress.ts     # 进度相关类型

public/
├── levels/             # 关卡数据文件（20个关卡）
│   ├── index.json      # 关卡索引文件
│   └── level-*.json    # 各关卡具体数据
├── languages.json      # 多语言配置文件
└── icons/              # PWA 应用图标

e2e/                   # Playwright 端到端测试
└── level-select.spec.ts # 关卡选择流程测试
```

## 🎮 游戏机制

### 核心玩法
- **拖拽分组**：通过拖拽词牌将相同主题的词汇排成一行完成分组
- **词牌管理**：游戏区域最多显示 6 行（24 张）词牌，超出部分进入候补队列
- **自动补充**：完成分组出现空位时，候补词牌自动补充到游戏区域
- **行匹配算法**：实时检测行内词牌是否属于同一分组，自动标记完成状态

### 经济系统
- **金币奖励**：完成关卡或分组获得金币，根据难度等级给予不同奖励
- **提示消费**：使用提示功能需要消费金币，采用阶梯式价格机制
- **复盘免单**：已通关关卡在复盘模式下使用提示免费
- **存档金币**：金币数量会保存到本地进度中

### 进度管理
- **关卡解锁**：按顺序解锁关卡，支持难度渐进设计
- **本地存档**：使用 localStorage 持久化游戏进度
- **导入导出**：支持文本格式和文件格式的存档备份恢复
- **多语言存档**：存档兼容不同语言设置

### 教学系统
- **新手引导**：每个关卡可配置专门的教学步骤
- **渐进式提示**：首次游玩时通过弹层引导操作流程
- **上下文提示**：根据当前游戏状态提供相关帮助信息

### 语言支持
- **多语言配置**：内置韩语、中文、英语、日语支持，每个关卡可配置支持的语言列表
- **原生多语言数据**：主题分类和词汇文本直接以多语言对象形式存储，支持灵活的语言切换
- **TTS 语音**：集成 Web Speech API 实现词汇朗读
- **字体优化**：为不同语言配置最佳显示字体
- **RTL 支持**：预留从右到左语言的显示支持

## 📊 项目统计

### 当前数据规模
- **关卡数量**：20 个精心设计的关卡
- **难度分布**：
  - 简单关卡：10 个
  - 中等关卡：6 个
  - 困难关卡：4 个
- **支持语言**：韩语、中文、英语、日语
- **词牌总数**：800+ 个词汇条目
- **主题分组**：涵盖日常生活、学习、工作等多个领域

### 代码质量
- **TypeScript 覆盖率**：100%
- **单测覆盖**：核心游戏逻辑
- **E2E 测试**：关键用户流程
- **PWA 就绪**：支持离线使用和应用安装

## 📋 关卡数据规范

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

每个关卡文件遵循 `LevelFile` 接口（版本 2）：

- 元数据段
  - `id`、`difficulty`：需与索引保持一致。
  - `version`：关卡数据版本，当前为 `2`。
  - `language`：数组，定义本关支持的语言代码（如 `["ko", "zh", "en", "ja"]`）。
  - `tutorialSteps`：可选数组，每个元素为多语言对象，定义首玩时的提示文案。
  - `board.columns`：可选，重写默认列数（默认 4；用于非 4×4 词场或特殊布局）。
- `groups`：主题分组数组，每组最终对应一行需要排列到位的四个词牌。

典型结构：

```1:72:public/levels/level-001.json
{
  "id": "level-001",
  "difficulty": "easy",
  "version": 2,
  "language": ["ko", "zh", "en", "ja"],
  "tutorialSteps": [
    {
      "ko": "카드를 네 장 일렬로 드래그하면 그룹이 완성돼요。",
      "zh": "拖动四个词牌排成一行即可分组。",
      "en": "Drag four tiles into a row to form a group.",
      "ja": "タイルを4枚一列にドラッグするとグループになります。"
    },
    {
      "ko": "타일을 탭하면 뜻을 볼 수 있어요。",
      "zh": "点击词牌可查看释义。",
      "en": "Tap a tile to view its definition.",
      "ja": "タイルをタップすると意味を確認できます。"
    }
  ],
  "groups": [
    {
      "id": "drinks",
      "category": {
        "ko": "음료",
        "zh": "饮料",
        "en": "drinks",
        "ja": "飲み物"
      },
      "colorPreset": "lilac",
      "tiles": [
        {
          "id": "milk",
          "text": {
            "ko": "우유",
            "zh": "牛奶",
            "en": "milk",
            "ja": "牛乳"
          }
        }
      ]
    }
  ]
}
```

### 3. 分组与词牌字段

- `group.id`：全局唯一，作为完成记录、颜色标识的键值。
- `group.category`：多语言对象，键为语言代码（如 `ko`、`zh`、`en`、`ja`），值为对应语言的主题名称。必须包含 `language` 数组中声明的所有语言。
- `group.colorPreset`：引用 `constants/groupColors.ts` 中的预设 ID，会影响拖拽着色、完成行展示；如果省略，系统会按组索引自动分配颜色。

词牌 (`tiles`) 遵循 `TileDefinition`：

- `id`：组内唯一词牌标识。
- `text`：多语言对象，键为语言代码，值为对应语言的词汇文本。必须包含 `language` 数组中声明的所有语言。
- `hint`：可选，多语言对象，显示在右侧详情面板的额外线索。

### 4. 关卡编写流程建议

1. 复制现有关卡 JSON，修改基础元信息与 `groups`。
2. 保持每组词牌数量 = `board.columns`（默认 4），否则行匹配逻辑会检测失败。
3. 确保所有语言代码均出现在关卡的 `language` 数组和 `public/languages.json` 中。
4. 为每个 `category` 和 `text` 提供完整的多语言映射，包含 `language` 数组中声明的所有语言。
5. `tutorialSteps` 如提供，每个步骤也需包含完整的多语言映射。
6. 更新 `public/levels/index.json`，追加新的 `levels` 项；按目标顺序插入，并设置 `difficulty`。
7. 若新增颜色预设，在 `constants/groupColors.ts` 添加；`colorPreset` 不要引用不存在的 ID。
8. 本地运行 `npm run dev` 验证显示、拖拽、提示；必要时补充 Vitest/Playwright 覆盖。

## 🧪 测试策略

### 单元测试
```bash
npm run test          # 运行所有测试
npm run test:watch    # 监视模式运行测试
```

- **核心逻辑测试**：覆盖 `utils/board.ts` 中的游戏算法
- **组件测试**：使用 React Testing Library 测试 UI 组件
- **工具函数测试**：验证数据处理和状态管理逻辑

### 端到端测试
```bash
npm run test:e2e      # 运行 Playwright 测试
```

- **关卡选择流程**：验证用户从主页进入关卡的完整流程
- **拖拽交互**：测试词牌拖拽和分组功能
- **存档功能**：验证进度保存和导入导出

### 手动测试建议
新增关卡后建议进行以下手动测试：
1. ✅ 完成全部分组验证匹配逻辑
2. ✅ 触发提示功能验证金币扣除
3. ✅ 重新进入已通关关卡验证复盘模式
4. ✅ 测试存档导入导出功能
5. ✅ 验证多语言切换和显示

## 🚀 构建与部署

### 本地构建
```bash
npm run build         # 生产构建
npm run preview       # 预览构建结果
```

构建产物位于 `dist/` 目录，为纯静态文件，可部署到任何静态托管服务。

### 推荐的部署平台

#### Vercel
1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 自动部署和 HTTPS

#### Netlify
1. 连接 Git 仓库
2. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
3. 重定向规则（SPA 支持）：
   ```text
   /*    /index.html   200
   ```

#### GitHub Pages
```bash
# 安装 gh-pages
npm install --save-dev gh-pages

# 添加到 package.json scripts
"deploy": "npm run build && gh-pages -d dist"
```

### 部署注意事项
- 🔸 确保 `/levels/` 和 `/languages.json` 路径可访问
- 🔸 所有资源使用相对路径加载
- 🔸 PWA 功能需要 HTTPS 环境
- 🔸 建议启用 Gzip 压缩提高加载速度

## 🔧 开发指南

### 开发环境配置
1. **IDE 推荐**：VS Code + 以下插件
   - TypeScript and JavaScript Language Features
   - Tailwind CSS IntelliSense
   - ES7+ React/Redux/React-Native snippets
   - Auto Rename Tag

2. **代码规范**
   - 使用 ESLint 和 Prettier（项目中已配置）
   - 遵循 TypeScript 严格模式
   - 组件使用函数式写法 + Hooks

3. **调试技巧**
   - React Developer Tools 浏览器扩展
   - Redux DevTools（查看 Zustand 状态）
   - Vite 热重载和错误覆盖

### 添加新关卡
1. 复制现有关卡文件模板
2. 修改 `id`、`difficulty`、`language` 等元信息
3. 配置 `groups` 和 `tiles` 数据，确保所有 `category` 和 `text` 包含完整的多语言映射
4. 如需要，添加 `tutorialSteps` 多语言提示
5. 更新 `public/levels/index.json` 添加新关卡条目（包含 `name` 字段用于显示）
6. 运行测试验证功能正常

### 扩展新语言
1. 在 `public/languages.json` 中添加语言配置
2. 更新所有关卡文件的 `language` 数组，添加新语言代码
3. 为所有关卡的 `category`、`text`、`tutorialSteps` 补充新语言的翻译
4. 测试字体显示和 TTS 功能
5. 更新语言切换界面

## 🤝 贡献指南

### 团队协作建议
- **Git 工作流**：使用 Feature Branch + Pull Request
- **代码审查**：所有 PR 需要至少一人审查
- **自动化检查**：CI 运行 `npm run build && npm run test && npm run test:e2e`
- **JSON 校验**：为关卡数据添加 JSON Schema 校验

### 提交规范
```bash
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建过程或辅助工具的变动
```

---

**开始你的词汇学习之旅吧！** 🚀📚

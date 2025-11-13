import { useState } from 'react'
import type { GroupDefinition, TileDefinition, Difficulty } from '../types/levels'
import type { TranslationMap } from '../types/language'
import { GROUP_COLOR_PRESETS } from '../constants/groupColors'
import { DIFFICULTY_CONFIG } from '../constants/levels'

interface VisualLevelEditorProps {
  id: string
  difficulty: Difficulty
  languages: string[]
  version: number
  isPublished: boolean
  groups: GroupDefinition[]
  tutorialSteps?: TranslationMap[]
  onIdChange: (id: string) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onLanguagesChange: (languages: string[]) => void
  onVersionChange: (version: number) => void
  onIsPublishedChange: (isPublished: boolean) => void
  onGroupsChange: (groups: GroupDefinition[]) => void
  onTutorialStepsChange: (steps: TranslationMap[]) => void
  disabled?: boolean
}

export function VisualLevelEditor({
  id,
  difficulty,
  languages,
  version,
  isPublished,
  groups,
  tutorialSteps = [],
  onIdChange,
  onDifficultyChange,
  onLanguagesChange,
  onVersionChange,
  onIsPublishedChange,
  onGroupsChange,
  onTutorialStepsChange,
  disabled = false,
}: VisualLevelEditorProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const availableLanguages = [
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
  ]

  const handleLanguageToggle = (langCode: string) => {
    if (languages.includes(langCode)) {
      if (languages.length > 1) {
        onLanguagesChange(languages.filter((l) => l !== langCode))
      }
    } else {
      onLanguagesChange([...languages, langCode])
    }
  }

  const handleAddGroup = () => {
    const newGroup: GroupDefinition = {
      id: `group-${Date.now()}`,
      category: languages.reduce((acc, lang) => ({ ...acc, [lang]: '' }), {}),
      colorPreset: GROUP_COLOR_PRESETS[groups.length % GROUP_COLOR_PRESETS.length]?.id,
      tiles: [],
    }
    onGroupsChange([...groups, newGroup])
    setExpandedGroupId(newGroup.id)
  }

  const handleRemoveGroup = (groupId: string) => {
    onGroupsChange(groups.filter((g) => g.id !== groupId))
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null)
    }
  }

  const handleUpdateGroup = (groupId: string, updates: Partial<GroupDefinition>) => {
    onGroupsChange(
      groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    )
  }

  const handleAddTile = (groupId: string) => {
    const newTile: TileDefinition = {
      id: `tile-${Date.now()}`,
      text: languages.reduce((acc, lang) => ({ ...acc, [lang]: '' }), {}),
    }
    handleUpdateGroup(groupId, {
      tiles: [...(groups.find((g) => g.id === groupId)?.tiles ?? []), newTile],
    })
  }

  const handleRemoveTile = (groupId: string, tileId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group) {
      handleUpdateGroup(groupId, {
        tiles: group.tiles.filter((t) => t.id !== tileId),
      })
    }
  }

  const handleUpdateTile = (
    groupId: string,
    tileId: string,
    updates: Partial<TileDefinition>,
  ) => {
    const group = groups.find((g) => g.id === groupId)
    if (group) {
      handleUpdateGroup(groupId, {
        tiles: group.tiles.map((t) => (t.id === tileId ? { ...t, ...updates } : t)),
      })
    }
  }

  const handleUpdateTranslation = (
    obj: TranslationMap,
    lang: string,
    value: string,
  ): TranslationMap => {
    return { ...obj, [lang]: value }
  }

  return (
    <div className="space-y-6">
      {/* 基础信息 */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
          关卡 ID
          <input
            type="text"
            value={id}
            disabled={disabled}
            onChange={(e) => onIdChange(e.target.value)}
            className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20 dark:disabled:bg-slate-700/50"
            placeholder="level-001"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
          难度
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
            className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20 cursor-pointer"
          >
            {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
              <option key={key} value={key} className="py-2">
                {config.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
          版本号
          <input
            type="number"
            value={version}
            onChange={(e) => onVersionChange(Number(e.target.value))}
            className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
            min="1"
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => onIsPublishedChange(e.target.checked)}
            className="h-5 w-5 rounded-lg border-2 border-slate-300 text-primary transition-smooth focus:ring-4 focus:ring-primary/20 dark:border-slate-600 dark:bg-dark-surface cursor-pointer"
          />
          发布关卡
        </label>
      </div>

      {/* 语言选择 */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          支持的语言 (至少选择一种)
        </label>
        <div className="flex flex-wrap gap-2.5">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageToggle(lang.code)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-soft transition-smooth hover-scale-sm ${
                languages.includes(lang.code)
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-medium dark:from-dark-primary dark:to-dark-primary'
                  : 'border-2 border-slate-200/80 bg-white/80 text-slate-600 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-300 dark:hover:border-dark-primary/50 dark:hover:bg-slate-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* 词汇分组 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            词汇分组 ({groups.length})
          </h4>
          <button
            type="button"
            onClick={handleAddGroup}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
          >
            + 添加分组
          </button>
        </div>

        <div className="space-y-3">
          {groups.map((group, groupIndex) => {
            const isExpanded = expandedGroupId === group.id
            const colorPreset = GROUP_COLOR_PRESETS.find((p) => p.id === group.colorPreset)

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {/* 分组头部 */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg border-2"
                      style={{
                        backgroundColor: colorPreset?.background ?? '#E2E8F0',
                        borderColor: colorPreset?.border ?? '#CBD5E1',
                      }}
                    />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {group.category[languages[0]] || '未命名分组'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {group.tiles.length} 个词汇 · {group.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveGroup(group.id)
                      }}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                      删除
                    </button>
                    <svg
                      className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* 分组详情 */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    {/* 分组 ID */}
                    <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                      分组 ID
                      <input
                        type="text"
                        value={group.id}
                        onChange={(e) => handleUpdateGroup(group.id, { id: e.target.value })}
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                    </label>

                    {/* 颜色预设 */}
                    <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                      颜色主题
                      <div className="mt-2 grid grid-cols-5 gap-2">
                        {GROUP_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleUpdateGroup(group.id, { colorPreset: preset.id })}
                            className={`flex h-12 items-center justify-center rounded-xl border-2 transition-all ${
                              group.colorPreset === preset.id
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-transparent hover:border-slate-300'
                            }`}
                            style={{ backgroundColor: preset.background }}
                            title={preset.id}
                          >
                            <div
                              className="h-6 w-6 rounded-full"
                              style={{ backgroundColor: preset.accent }}
                            />
                          </button>
                        ))}
                      </div>
                    </label>

                    {/* 分组类别名称 (多语言) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        分组类别名称
                      </label>
                      {languages.map((lang) => (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="w-12 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {lang.toUpperCase()}
                          </span>
                          <input
                            type="text"
                            value={group.category[lang] || ''}
                            onChange={(e) =>
                              handleUpdateGroup(group.id, {
                                category: handleUpdateTranslation(group.category, lang, e.target.value),
                              })
                            }
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            placeholder={`输入${lang}类别名称`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* 词汇列表 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          词汇列表 ({group.tiles.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddTile(group.id)}
                          className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5 dark:border-dark-primary dark:text-dark-primary dark:hover:bg-dark-primary/10"
                        >
                          + 添加词汇
                        </button>
                      </div>

                      <div className="space-y-2">
                        {group.tiles.map((tile, tileIndex) => (
                          <div
                            key={tile.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-700"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                词汇 #{tileIndex + 1} · {tile.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTile(group.id, tile.id)}
                                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                              >
                                删除
                              </button>
                            </div>

                            {/* 词汇 ID */}
                            <div className="mb-2">
                              <input
                                type="text"
                                value={tile.id}
                                onChange={(e) =>
                                  handleUpdateTile(group.id, tile.id, { id: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100"
                                placeholder="tile-id"
                              />
                            </div>

                            {/* 词汇文本 (多语言) */}
                            <div className="space-y-1.5">
                              {languages.map((lang) => (
                                <div key={lang} className="flex items-center gap-2">
                                  <span className="w-10 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {lang.toUpperCase()}
                                  </span>
                                  <input
                                    type="text"
                                    value={tile.text[lang] || ''}
                                    onChange={(e) =>
                                      handleUpdateTile(group.id, tile.id, {
                                        text: handleUpdateTranslation(tile.text, lang, e.target.value),
                                      })
                                    }
                                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100"
                                    placeholder={`${lang}文本`}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* 提示 (可选) */}
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                                添加提示 (可选)
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {languages.map((lang) => (
                                  <div key={lang} className="flex items-center gap-2">
                                    <span className="w-10 text-xs font-medium text-slate-500 dark:text-slate-400">
                                      {lang.toUpperCase()}
                                    </span>
                                    <input
                                      type="text"
                                      value={tile.hint?.[lang] || ''}
                                      onChange={(e) =>
                                        handleUpdateTile(group.id, tile.id, {
                                          hint: handleUpdateTranslation(
                                            tile.hint || {},
                                            lang,
                                            e.target.value,
                                          ),
                                        })
                                      }
                                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100"
                                      placeholder={`${lang}提示`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        ))}

                        {group.tiles.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                            暂无词汇,点击上方按钮添加
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {groups.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                暂无分组,点击上方按钮添加第一个分组
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


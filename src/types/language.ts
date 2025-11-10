export type TranslationMap = Record<string, string>

export interface LanguageConfig {
  code: string
  name: string
  nativeName: string
  direction?: 'ltr' | 'rtl'
  /**
   * 推荐字体或字体族，按优先级排列
   */
  preferredFonts?: string[]
  /**
   * 浏览器语音朗读配置
   */
  tts?: {
    voiceId?: string
    rate?: number
    pitch?: number
  }
  /**
   * 是否为基于语素的书写系统（决定 tile 默认字号）
   */
  syllabary?: boolean
}


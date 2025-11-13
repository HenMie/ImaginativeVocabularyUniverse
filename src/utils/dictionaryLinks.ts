/**
 * 词典链接工具
 * 为不同语言的单词生成对应的在线词典链接
 */

/**
 * 获取语言的中文名称
 * @param languageCode 语言代码 (ko, ja, en等)
 * @returns 语言的中文名称
 */
export const getLanguageName = (languageCode: string): string => {
  const languageNames: Record<string, string> = {
    ko: '韩语',
    ja: '日语',
    en: '英语',
    zh: '中文',
    fr: '法语',
    de: '德语',
    es: '西班牙语',
    ru: '俄语',
    it: '意大利语',
    pt: '葡萄牙语',
    ar: '阿拉伯语',
  }

  return languageNames[languageCode] || languageCode.toUpperCase()
}

/**
 * 获取指定语言单词的词典链接
 * @param word 要查询的单词
 * @param language 语言代码 (ko, ja, en等)
 * @returns 词典URL
 */
export const getDictionaryUrl = (word: string, language: string): string => {
  const encodedWord = encodeURIComponent(word)

  const dictionaryUrls: Record<string, string> = {
    // 韩语 - 使用 Naver 韩中词典
    ko: `https://korean.dict.naver.com/kozhdict/#/search?query=${encodedWord}`,

    // 日语 - 使用 Jisho (日英词典,但有中文释义)
    ja: `https://www.jisho.org/search/${encodedWord}`,

    // 英语 - 使用剑桥英汉词典
    en: `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodedWord}`,

    // 中文 - 使用汉典
    zh: `https://www.zdic.net/hans/${encodedWord}`,

    // 法语 - 使用 Reverso
    fr: `https://www.reverso.net/translationresults.aspx?lang=FR&sourcetext=${encodedWord}&direction=french-chinese`,

    // 德语 - 使用 Dict.cc
    de: `https://www.dict.cc/?s=${encodedWord}`,

    // 西班牙语 - 使用 SpanishDict
    es: `https://www.spanishdict.com/translate/${encodedWord}`,

    // 俄语 - 使用 Reverso
    ru: `https://www.reverso.net/translationresults.aspx?lang=RU&sourcetext=${encodedWord}&direction=russian-chinese`,

    // 意大利语 - 使用 Reverso
    it: `https://www.reverso.net/translationresults.aspx?lang=IT&sourcetext=${encodedWord}&direction=italian-chinese`,

    // 葡萄牙语 - 使用 Reverso
    pt: `https://www.reverso.net/translationresults.aspx?lang=PT&sourcetext=${encodedWord}&direction=portuguese-chinese`,

    // 阿拉伯语 - 使用 Reverso
    ar: `https://www.reverso.net/translationresults.aspx?lang=AR&sourcetext=${encodedWord}&direction=arabic-chinese`,
  }

  // 如果找到对应语言的词典,返回专用词典链接;否则使用 Google 翻译作为后备
  return (
    dictionaryUrls[language] ||
    `https://translate.google.com/?sl=${language}&tl=zh-CN&text=${encodedWord}`
  )
}

/**
 * 获取词典名称
 * @param language 语言代码
 * @returns 词典名称
 */
export const getDictionaryName = (language: string): string => {
  const dictionaryNames: Record<string, string> = {
    ko: 'Naver 韩中词典',
    ja: 'Jisho 日语词典',
    en: '剑桥英汉词典',
    zh: '汉典',
    fr: 'Reverso 法语词典',
    de: 'Dict.cc 德语词典',
    es: 'SpanishDict 西语词典',
    ru: 'Reverso 俄语词典',
    it: 'Reverso 意语词典',
    pt: 'Reverso 葡语词典',
    ar: 'Reverso 阿语词典',
  }

  return dictionaryNames[language] || 'Google 翻译'
}


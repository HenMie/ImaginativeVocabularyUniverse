/**
 * 生词本导出工具
 * 支持导出为 TXT 和 PDF 格式
 */

import type { VocabularyEntry } from '../types/vocabulary'

/**
 * 导出为 TXT 格式
 * @param vocabulary 生词列表
 * @param language 可选的语言筛选
 */
export const exportToTxt = (vocabulary: VocabularyEntry[], language?: string): void => {
  const filtered = language ? vocabulary.filter((v) => v.language === language) : vocabulary

  if (filtered.length === 0) {
    alert('没有可导出的生词')
    return
  }

  // 生成 TXT 内容
  const header = '单词\t中文释义\t分类\t来源关卡\t添加时间\n'
  const content =
    header +
    filtered
      .map((entry) => {
        const category = entry.groupCategory || '-'
        const levelId = entry.levelId || '-'
        const addedDate = new Date(entry.addedAt).toLocaleDateString('zh-CN')
        return `${entry.word}\t${entry.translation}\t${category}\t${levelId}\t${addedDate}`
      })
      .join('\n')

  // 创建并下载文件
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' }) // 添加 BOM 以支持中文
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const fileName = `生词本_${language || '全部'}_${new Date().toISOString().split('T')[0]}.txt`
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出为 PDF 格式
 * 使用 html2canvas 和 jsPDF 库生成 PDF，完美支持中文字符
 * @param vocabulary 生词列表
 * @param language 可选的语言筛选
 */
export const exportToPdf = async (
  vocabulary: VocabularyEntry[],
  language?: string,
): Promise<void> => {
  const filtered = language ? vocabulary.filter((v) => v.language === language) : vocabulary

  if (filtered.length === 0) {
    alert('没有可导出的生词')
    return
  }

  try {
    // 动态导入所需库
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // 创建临时 HTML 容器
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '794px' // A4 宽度 (像素)
    container.style.padding = '40px'
    container.style.backgroundColor = '#ffffff'
    container.style.fontFamily = 'Arial, "Microsoft YaHei", "SimHei", sans-serif'

    // 生成 HTML 内容
    const languageText = language ? `语言: ${language.toUpperCase()}` : '语言: 全部'
    const exportTime = new Date().toLocaleString('zh-CN')

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; margin: 0 0 10px 0; color: #333;">我的生词本</h1>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">${languageText}</p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">导出时间: ${exportTime}</p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">共 ${filtered.length} 个单词</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #3b82f6; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center; width: 40px;">#</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 120px;">单词</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 180px;">释义</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center; width: 100px;">分类</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center; width: 80px;">来源</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center; width: 100px;">添加时间</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((entry, index) => {
              const category = entry.groupCategory || '-'
              const levelId = entry.levelId || '-'
              const addedDate = new Date(entry.addedAt).toLocaleDateString('zh-CN')
              const bgColor = index % 2 === 0 ? '#ffffff' : '#f5f7fa'
              return `
                <tr style="background-color: ${bgColor};">
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${entry.word}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${entry.translation}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${category}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${levelId}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${addedDate}</td>
                </tr>
              `
            })
            .join('')}
        </tbody>
      </table>
    `

    document.body.appendChild(container)

    // 使用 html2canvas 将 HTML 转换为 canvas
    const canvas = await html2canvas(container, {
      scale: 2, // 提高清晰度
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    // 移除临时容器
    document.body.removeChild(container)

    // 创建 PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210 // A4 宽度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // 如果内容超过一页，需要分页
    const pageHeight = 297 // A4 高度 (mm)
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // 保存 PDF
    const fileName = `生词本_${language || '全部'}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)
  } catch (error) {
    console.error('PDF 导出失败:', error)
    alert('PDF 导出失败，请确保已安装 html2canvas 和 jspdf 库')
  }
}

/**
 * 导出为 CSV 格式(可用于 Excel)
 * @param vocabulary 生词列表
 * @param language 可选的语言筛选
 */
export const exportToCsv = (vocabulary: VocabularyEntry[], language?: string): void => {
  const filtered = language ? vocabulary.filter((v) => v.language === language) : vocabulary

  if (filtered.length === 0) {
    alert('没有可导出的生词')
    return
  }

  // 生成 CSV 内容
  const header = '单词,中文释义,语言,分类,来源关卡,添加时间,复习次数\n'
  const content =
    header +
    filtered
      .map((entry) => {
        const category = entry.groupCategory || ''
        const levelId = entry.levelId || ''
        const addedDate = new Date(entry.addedAt).toLocaleDateString('zh-CN')
        return `"${entry.word}","${entry.translation}","${entry.language}","${category}","${levelId}","${addedDate}",${entry.reviewCount}`
      })
      .join('\n')

  // 创建并下载文件
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const fileName = `生词本_${language || '全部'}_${new Date().toISOString().split('T')[0]}.csv`
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


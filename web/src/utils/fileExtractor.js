// utils/fileExtractor.js — 浏览器端文件文本提取（PDF/DOCX/MD/TXT）
// 所有提取在浏览器端完成，不上传原始文件
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// 设置 PDF.js worker（Vite 环境下使用本地 worker）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/** 支持的文件扩展名 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt']

/** 从 File 对象提取纯文本，返回统一的 { text, fileName, fileType, charCount } 结构 */
export async function extractText(file) {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`不支持的文件格式: ${ext}，请使用 PDF、DOCX、MD 或 TXT`)
  }

  let text = ''

  if (ext === '.pdf') {
    text = await extractPDF(file)
  } else if (ext === '.docx') {
    text = await extractDOCX(file)
  } else {
    text = await readAsText(file)
  }

  if (!text.trim()) {
    throw new Error('无法提取文本内容，文件可能为空或为扫描件（纯图片 PDF 不支持）')
  }

  return {
    text: text.trim(),
    fileName: file.name,
    fileType: ext.replace('.', ''),
    charCount: text.trim().length
  }
}

/** 读文件为 base64（用于上传原始二进制到文件服务） */
export async function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 同时提取文本和 base64 编码原始文件 */
export async function extractWithBinary(file) {
  const textResult = await extractText(file)
  const base64 = await readAsBase64(file)
  return { ...textResult, base64 }
}

/** PDF 文本提取 */
async function extractPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageTexts = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    pageTexts.push(pageText)
  }

  return pageTexts.join('\n')
}

/** DOCX 文本提取 */
function extractDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: e.target.result })
        resolve(result.value)
      } catch (err) {
        reject(new Error('DOCX 解析失败: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** 纯文本 / Markdown 文件读取 */
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

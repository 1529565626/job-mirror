// services/api.js — HTTP 请求封装（fetch ~18 行，零依赖）
const BASE_URL = 'http://localhost:3099'

/** 统一请求函数，自动拼 BaseURL + JSON 序列化 */
async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, opts)

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Unknown error')
    throw new Error(`[${res.status}] ${msg}`)
  }

  return res.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),

  /** 上传二进制数据（base64 编码的 JSON payload，用于保存原始文件） */
  upload: (path, body) => request('PUT', path, body)
}

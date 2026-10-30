export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
// Uploaded files are stored as /uploads/... on the API server; any other value (https://..., /img/...) is used as is.
export const mediaUrl = (p) => (p && p.startsWith('/uploads') ? API + p : p || '')

async function request(path, opts = {}) {
  let res
  try { res = await fetch(`${API}${path}`, opts) } catch { const e = new Error('Cannot reach the server. Check your connection and try again.'); e.status = 0; throw e }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.message || 'Something went wrong. Please try again.'); e.status = res.status; throw e }
  return data
}
export const apiGet = (path, signal) => request(path, { signal })
export const apiPost = (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const apiForm = (path, form) => request(path, { method: 'POST', body: form })

export const TOKEN = 'rgx_token'
export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
// Uploaded files come back as /uploads/...; anything else (e.g. /img/hero.jpg, https://...) is used as is.
export const fileUrl = (p) => (p && p.startsWith('/uploads') ? BASE + p : p || '')

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}; const t = localStorage.getItem(TOKEN)
  if (t) headers.Authorization = `Bearer ${t}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && !path.startsWith('/auth/login')) { localStorage.removeItem(TOKEN); window.location.href = '/admin/login' }
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}
export async function openResume(id) {
  const res = await fetch(`${BASE}/api/admin/applications/${id}/resume`, { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN)}` } })
  if (!res.ok) return alert('Could not open the resume')
  window.open(URL.createObjectURL(await res.blob()), '_blank')
}

// Upload with progress (fetch cannot report upload progress, XMLHttpRequest can).
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest(); x.open('POST', `${BASE}/api/admin/media`)
    x.setRequestHeader('Authorization', `Bearer ${localStorage.getItem(TOKEN)}`)
    x.timeout = 15 * 60 * 1000
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    x.onload = () => {
      let d = {}; try { d = JSON.parse(x.responseText) } catch { /* not JSON */ }
      if (x.status === 401) { localStorage.removeItem(TOKEN); window.location.href = '/admin/login' }
      x.status < 300 ? resolve(d) : reject(new Error(d.message || 'Upload failed'))
    }
    x.onerror = () => reject(new Error('Network error during upload'))
    x.ontimeout = () => reject(new Error('The upload timed out'))
    const fd = new FormData(); fd.append('files', file); x.send(fd)
  })
}

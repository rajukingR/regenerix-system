import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api.js'

// detail may arrive as an object or as a JSON string; never let a bad value crash the dashboard
const parse = (d) => { if (d && typeof d === 'object') return d; try { return JSON.parse(d) || {} } catch { return {} } }
export const target = (n) => {
  const d = parse(n.detail)
  if (n.message_type === 'appointment_booking') return d.appointment_id ?? d.id ? `/admin/appointments?open=${d.appointment_id ?? d.id}` : '/admin/appointments'
  if (n.message_type === 'job_application') return d.application_id ?? d.id ? `/admin/applications?open=${d.application_id ?? d.id}` : '/admin/applications'
  return '/admin'
}
const ago = (v) => { const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000); if (Number.isNaN(s)) return ''; if (s < 60) return 'Just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return new Date(v).toLocaleDateString() }
const ICON = { appointment_booking: '📅', job_application: '📄' }

export default function NotificationBell() {
  const nav = useNavigate(); const [open, setOpen] = useState(false); const [items, setItems] = useState([]); const [unread, setUnread] = useState(0); const [err, setErr] = useState('')
  const busy = useRef(false); const box = useRef(null)
  const load = useCallback(async () => {
    if (busy.current) return; busy.current = true // never two requests at once
    try { const d = await api('/admin/notifications?limit=20'); setItems(d.notifications); setUnread(d.unread_count); setErr('') } catch (e) { setErr(e.message) } finally { busy.current = false }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 20000), onEvt = () => load(), onVis = () => document.visibilityState === 'visible' && load()
    window.addEventListener('NEW_NOTIFICATION', onEvt); document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); window.removeEventListener('NEW_NOTIFICATION', onEvt); document.removeEventListener('visibilitychange', onVis) }
  }, [load])
  useEffect(() => { const out = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', out); return () => document.removeEventListener('mousedown', out) }, [])

  const go = async (n) => {
    if (!n.is_read) { try { await api(`/admin/notifications/${n.id}/read`, { method: 'PATCH' }); setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))); setUnread((u) => Math.max(0, u - 1)) } catch { /* still navigate */ } }
    setOpen(false); nav(target(n))
  }
  const readAll = async () => { try { await api('/admin/notifications/read-all', { method: 'PATCH' }); setItems((l) => l.map((x) => ({ ...x, is_read: 1 }))); setUnread(0) } catch (e) { setErr(e.message) } }

  return (<div className="relative" ref={box}>
    <button onClick={() => { setOpen(!open); if (!open) load() }} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm hover:bg-mist">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" /></svg>
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && (<div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-ink/10">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2>{unread > 0 && <button className="text-xs text-teal hover:underline" onClick={readAll}>Mark all as read</button>}</div>
      {err && <p className="bg-red-50 px-4 py-2 text-xs text-red-700">{err}</p>}
      <ul className="max-h-96 overflow-y-auto">{items.map((n) => (<li key={n.id}><button onClick={() => go(n)} className={`flex w-full gap-3 border-b border-ink/5 px-4 py-3 text-left hover:bg-mist ${n.is_read ? '' : 'bg-teal/5'}`}>
        <span className="text-lg" aria-hidden>{ICON[n.message_type] || '🔔'}</span>
        <span className="min-w-0 flex-1"><span className={`block text-sm ${n.is_read ? 'text-ink/70' : 'font-semibold'}`}>{n.message}</span>
          {parse(n.detail).customer_name || parse(n.detail).candidate_name ? <span className="block truncate text-xs text-ink/60">{parse(n.detail).customer_name || parse(n.detail).candidate_name}{parse(n.detail).job_title ? ` · ${parse(n.detail).job_title}` : ''}</span> : null}
          <span className="block text-xs text-ink/50">{ago(n.created_at)}</span></span>
        {!n.is_read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-label="Unread" />}</button></li>))}
        {!items.length && !err && <li className="px-4 py-10 text-center text-sm text-ink/50">No notifications yet.</li>}</ul></div>)}
  </div>)
}

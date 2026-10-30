import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from './api.js'
import { Pager, btn, btn2, inp } from './Fields.jsx'

export const STATUS = { pending: 'Pending', confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' }
const TONE = { pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-green-100 text-green-800', rescheduled: 'bg-blue-100 text-blue-800', cancelled: 'bg-red-100 text-red-700', completed: 'bg-teal/15 text-teal-dark', no_show: 'bg-ink/10 text-ink/70' }
export const Badge = ({ s, map = STATUS }) => <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[s] || 'bg-ink/10'}`}>{map[s] || s}</span>
const t12 = (t) => { const [h, m] = String(t).split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString()
const F0 = { q: '', status: '', service: '', team_id: '', date_from: '', date_to: '' }

export default function Appointments() {
  const [sp, setSp] = useSearchParams(); const [f, setF] = useState(F0); const [applied, setApplied] = useState(F0); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([]); const [team, setTeam] = useState([])
  const [sel, setSel] = useState(null); const [rs, setRs] = useState(null); const [slots, setSlots] = useState(null); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false)

  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/appointments?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { api('/admin/services').then(setServices).catch(() => {}); api('/admin/team').then(setTeam).catch(() => {}) }, [])
  const view = useCallback(async (id) => { try { setSel((await api(`/admin/appointments/${id}`)).data); setRs(null); setNote('') } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } }, [sp, setSp, view]) // opened from a notification
  useEffect(() => { if (!rs?.date) { setSlots(null); return undefined } let live = true; setSlots(null); api(`/public/appointments/slots?date=${rs.date}`).then((d) => live && setSlots(d.slots)).catch(() => live && setSlots([])); return () => { live = false } }, [rs?.date])

  const act = async (body) => { setBusy(true); setErr(''); try { const r = await api(`/admin/appointments/${sel.id}`, { method: 'PUT', body: { ...body, note } }); setSel(r.data); setRs(null); setNote(''); load() } catch (e) { setErr(e.message) } setBusy(false) }
  const del = async () => { if (window.confirm('Delete this appointment permanently?')) { await api(`/admin/appointments/${sel.id}`, { method: 'DELETE' }); setSel(null); load() } }
  const search = (e) => { e.preventDefault(); setPage(1); setApplied(f) }
  const Btn = ({ s, children, tone }) => <button className={`${btn2} ${tone || ''}`} disabled={busy || sel.status === s} onClick={() => (s === 'cancelled' ? window.confirm('Cancel this appointment? The time slot will be released.') && act({ status: s }) : act({ status: s }))}>{children}</button>

  return (<div><h1 className="mb-5 text-2xl">Appointments</h1>
    <form onSubmit={search} className="mb-5 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <input className={inp} placeholder="Search name, email, phone, reference" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search" />
      <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select className={inp} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} aria-label="Service"><option value="">All services</option>{services.map((s) => <option key={s.id}>{s.name}</option>)}</select>
      <select className={inp} value={f.team_id} onChange={(e) => setF({ ...f, team_id: e.target.value })} aria-label="Specialist"><option value="">All specialists</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <label className="text-xs text-ink/60">From<input type="date" className={inp} value={f.date_from} onChange={(e) => setF({ ...f, date_from: e.target.value })} /></label>
      <label className="text-xs text-ink/60">To<input type="date" className={inp} value={f.date_to} onChange={(e) => setF({ ...f, date_to: e.target.value })} /></label>
      <div className="flex items-end gap-2 lg:col-span-2"><button className={btn}>Search</button><button type="button" className={btn2} onClick={() => { setF(F0); setApplied(F0); setPage(1) }}>Reset</button></div></form>
    {err && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{err} <button className="underline" onClick={load}>Retry</button></p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b border-ink/10 text-xs uppercase text-ink/60"><tr>{['Reference', 'Patient', 'Contact', 'Service / specialist', 'Appointment', 'Booked', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{res.data.map((a) => (<tr key={a.id} className="border-b border-ink/5 last:border-0"><td className="px-4 py-3 font-mono text-xs">{a.reference}</td><td className="px-4 py-3 font-medium">{a.name}</td><td className="px-4 py-3 text-xs">{a.phone}<br />{a.email}</td>
        <td className="px-4 py-3">{a.service || '—'}{a.team_name && <span className="block text-xs text-ink/50">{a.team_name}</span>}</td><td className="whitespace-nowrap px-4 py-3">{a.appointment_date}<span className="block text-xs text-ink/60">{t12(a.appointment_time)}</span></td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{String(a.created_at).slice(0, 10)}</td><td className="px-4 py-3"><Badge s={a.status} /></td><td className="px-4 py-3 text-right"><button className={btn2} onClick={() => view(a.id)}>View</button></td></tr>))}
        {!res.data.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink/50">{loading ? 'Loading…' : 'No appointments found.'}</td></tr>}</tbody></table></div>
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />

    {sel && (<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setSel(null)}><div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl space-y-5 rounded-2xl bg-white p-6">
      <div className="flex items-start justify-between"><div><h2 className="text-xl">{sel.name}</h2><p className="font-mono text-xs text-ink/60">{sel.reference}</p></div><Badge s={sel.status} /></div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{[['Phone', sel.phone], ['Email', sel.email], ['Service', sel.service], ['Specialist', sel.team_name], ['Date', sel.appointment_date], ['Time', t12(sel.appointment_time)], ['Booked on', String(sel.created_at).replace('T', ' ').slice(0, 16)]].map(([k, v]) => <div key={k}><dt className="text-xs text-ink/50">{k}</dt><dd>{v || '—'}</dd></div>)}
        <div className="sm:col-span-2"><dt className="text-xs text-ink/50">Reason</dt><dd className="whitespace-pre-wrap">{sel.reason || '—'}</dd></div></dl>
      <div><label className="text-xs text-ink/60">Note for the history (optional)<input className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="mt-3 flex flex-wrap gap-2"><Btn s="confirmed">Confirm</Btn><button className={btn2} disabled={busy} onClick={() => setRs({ date: '', time: '' })}>Reschedule</button><Btn s="completed">Mark completed</Btn><Btn s="no_show">No-show</Btn><Btn s="cancelled" tone="text-red-600">Cancel</Btn><button className={`${btn2} ml-auto text-red-600`} onClick={del}>Delete</button></div></div>
      {rs && (<div className="rounded-lg bg-mist p-4"><label className="text-xs text-ink/60">New date<input type="date" className={inp} min={new Date().toISOString().slice(0, 10)} value={rs.date} onChange={(e) => setRs({ date: e.target.value, time: '' })} /></label>
        {rs.date && (slots === null ? <p className="mt-2 text-sm">Checking availability…</p> : !slots.length ? <p className="mt-2 text-sm">No slots on this date.</p> : <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((s) => <button key={s.time} disabled={!s.available} onClick={() => setRs({ ...rs, time: s.time })} className={`rounded-md border px-2 py-1.5 text-xs ${rs.time === s.time ? 'border-teal bg-teal text-white' : s.available ? 'border-ink/20 bg-white' : 'bg-field text-ink/30 line-through'}`}>{t12(s.time)}</button>)}</div>)}
        <div className="mt-3 flex gap-2"><button className={btn} disabled={busy || !rs.date || !rs.time} onClick={() => act({ appointment_date: rs.date, appointment_time: rs.time })}>Save new time</button><button className={btn2} onClick={() => setRs(null)}>Cancel</button></div></div>)}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div><h3 className="mb-2 text-sm font-semibold">History</h3><ul className="space-y-2 text-sm">{sel.history.map((h) => <li key={h.id} className="flex gap-3"><span className="w-32 shrink-0 text-xs text-ink/50">{String(h.created_at).replace('T', ' ').slice(0, 16)}</span><span><b>{STATUS[h.action] || h.action}</b>{h.note ? ` — ${h.note}` : ''}</span></li>)}</ul></div>
      <div className="text-right"><button className={btn2} onClick={() => setSel(null)}>Close</button></div></div></div>)}
  </div>)
}

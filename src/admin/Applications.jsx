import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, openResume } from './api.js'
import { Pager, btn, btn2, inp } from './Fields.jsx'
import { Badge } from './Appointments.jsx'

const STATUS = { new: 'New', under_review: 'Under review', shortlisted: 'Shortlisted', interview: 'Interview scheduled', selected: 'Selected', rejected: 'Rejected' }
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString()
const F0 = { q: '', job_id: '', status: '', date_from: '', date_to: '' }

export default function Applications() {
  const [sp, setSp] = useSearchParams(); const [f, setF] = useState(F0); const [applied, setApplied] = useState(F0); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [jobs, setJobs] = useState([]); const [sel, setSel] = useState(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/applications?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { api('/admin/jobs').then(setJobs).catch(() => {}) }, [])
  const view = useCallback(async (id) => { try { setSel((await api(`/admin/applications/${id}`)).data) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } }, [sp, setSp, view]) // opened from a notification
  const setStatus = async (a, status) => { try { await api(`/admin/applications/${a.id}`, { method: 'PUT', body: { status } }); if (sel?.id === a.id) setSel({ ...sel, status }); load() } catch (e) { setErr(e.message) } }
  const del = async (a) => { if (window.confirm('Delete this application and its resume permanently?')) { await api(`/admin/applications/${a.id}`, { method: 'DELETE' }); setSel(null); load() } }
  const search = (e) => { e.preventDefault(); setPage(1); setApplied(f) }
  const Sel = ({ a }) => <select className="rounded border border-ink/20 px-2 py-1 text-xs" aria-label="Status" value={a.status} onChange={(e) => setStatus(a, e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>

  return (<div><h1 className="mb-5 text-2xl">Job applications</h1>
    <form onSubmit={search} className="mb-5 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <input className={inp} placeholder="Search name or email" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Search" />
      <select className={inp} value={f.job_id} onChange={(e) => setF({ ...f, job_id: e.target.value })} aria-label="Job"><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
      <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <div className="flex items-end gap-2"><button className={btn}>Search</button><button type="button" className={btn2} onClick={() => { setF(F0); setApplied(F0); setPage(1) }}>Reset</button></div>
      <label className="text-xs text-ink/60">Applied from<input type="date" className={inp} value={f.date_from} onChange={(e) => setF({ ...f, date_from: e.target.value })} /></label>
      <label className="text-xs text-ink/60">Applied to<input type="date" className={inp} value={f.date_to} onChange={(e) => setF({ ...f, date_to: e.target.value })} /></label></form>
    {err && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{err} <button className="underline" onClick={load}>Retry</button></p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b border-ink/10 text-xs uppercase text-ink/60"><tr>{['Applicant', 'Email', 'Mobile', 'Job', 'Applied', 'Resume', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{res.data.map((a) => (<tr key={a.id} className="border-b border-ink/5 last:border-0"><td className="px-4 py-3 font-medium">{a.name}</td><td className="px-4 py-3">{a.email}</td><td className="px-4 py-3">{a.phone}</td><td className="px-4 py-3">{a.job_title || <span className="text-ink/40">General</span>}</td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{String(a.created_at).slice(0, 10)}</td><td className="px-4 py-3">{a.has_resume ? <button className={btn2} onClick={() => openResume(a.id)}>Open</button> : '—'}</td><td className="px-4 py-3"><Sel a={a} /></td><td className="px-4 py-3 text-right"><button className={btn2} onClick={() => view(a.id)}>View</button></td></tr>))}
        {!res.data.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink/50">{loading ? 'Loading…' : 'No applications found.'}</td></tr>}</tbody></table></div>
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {sel && (<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setSel(null)}><div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-xl space-y-4 rounded-2xl bg-white p-6">
      <div className="flex items-start justify-between"><div><h2 className="text-xl">{sel.name}</h2><p className="text-sm text-ink/60">{sel.job_title || 'General application'}</p></div><Badge s={sel.status} map={STATUS} /></div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{[['Email', sel.email], ['Mobile', sel.phone], ['Experience', sel.experience], ['Applied', String(sel.created_at).replace('T', ' ').slice(0, 16)]].map(([k, v]) => <div key={k}><dt className="text-xs text-ink/50">{k}</dt><dd>{v || '—'}</dd></div>)}
        <div className="sm:col-span-2"><dt className="text-xs text-ink/50">Cover letter</dt><dd className="whitespace-pre-wrap">{sel.cover_letter || '—'}</dd></div></dl>
      <div className="flex flex-wrap items-center gap-3"><Sel a={sel} />{sel.has_resume && <button className={btn} onClick={() => openResume(sel.id)}>Open / download resume{sel.resume_name ? ` (${sel.resume_name})` : ''}</button>}<button className={`${btn2} ml-auto text-red-600`} onClick={() => del(sel)}>Delete</button></div>
      <div className="text-right"><button className={btn2} onClick={() => setSel(null)}>Close</button></div></div></div>)}
  </div>)
}

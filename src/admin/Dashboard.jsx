import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { RESOURCES } from './resources.js'

const Card = ({ to, label, big, sub }) => (<Link to={to} className="rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm text-ink/60">{label}</p><p className="mt-1 text-3xl text-teal">{big}</p>{sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}</Link>)

export default function Dashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api('/admin/dashboard').then(setD).catch((e) => setErr(e.message)) }, [])
  if (err) return <p className="rounded bg-red-50 p-3 text-red-700">{err}</p>
  if (!d) return <p>Loading…</p>
  return (<div><h1 className="mb-6 text-2xl">Dashboard</h1>
    <h2 className="mb-3 text-sm uppercase tracking-wide text-ink/50">Inbox</h2>
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card to="/admin/inbox/messages" label="New messages" big={d.inbox.messages} /><Card to="/admin/appointments" label="Pending appointments" big={d.inbox.appointments} /><Card to="/admin/applications" label="New applications" big={d.inbox.applications} /><Card to="/admin/inbox/subscribers" label="Subscribers" big={d.inbox.subscribers} /><Card to="/admin/media" label="Media files" big={d.media} /></div>
    <h2 className="mb-3 text-sm uppercase tracking-wide text-ink/50">Content</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(d.content).map(([k, v]) => <Card key={k} to={`/admin/${k}`} label={RESOURCES[k]?.title || k} big={v.total} sub={`${v.active} active · ${v.total - v.active} hidden`} />)}</div></div>)
}

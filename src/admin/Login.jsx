import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { TOKEN, api } from './api.js'
import { btn, inp } from './Fields.jsx'

export default function Login() {
  const nav = useNavigate(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  if (localStorage.getItem(TOKEN)) return <Navigate to="/admin" replace />
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const r = await api('/auth/login', { method: 'POST', body: f }); localStorage.setItem(TOKEN, r.token); nav('/admin') } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (<main className="grid min-h-screen place-items-center bg-mist p-4"><form onSubmit={go} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-lg">
    <h1 className="text-2xl text-teal">Regenerix Admin</h1><p className="text-sm text-ink/60">Sign in to manage the website.</p>
    <label className="block text-sm font-semibold">Email<input type="email" required autoComplete="username" className={`${inp} mt-1`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
    <label className="block text-sm font-semibold">Password<input type="password" required autoComplete="current-password" className={`${inp} mt-1`} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <button className={`${btn} w-full`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></main>)
}

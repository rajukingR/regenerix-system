import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { TOKEN } from './api.js'
import { CONTENT, RESOURCES } from './resources.js'
import NotificationBell from './NotificationBell.jsx'

const link = ({ isActive }) => `block rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-white/15 font-semibold' : 'text-white/75 hover:bg-white/10'}`
const H = ({ children }) => <p className="mb-1 mt-5 px-3 text-[11px] uppercase tracking-wider text-white/40">{children}</p>

export default function AdminLayout() {
  const nav = useNavigate()
  if (!localStorage.getItem(TOKEN)) return <Navigate to="/admin/login" replace />
  const out = () => { localStorage.removeItem(TOKEN); nav('/admin/login') }
  return (<div className="min-h-screen bg-[#F6F8F5] md:flex">
    <aside className="bg-ink p-4 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto">
      <Link to="/admin" className="block px-3 py-2 font-display text-lg">Regenerix Admin</Link>
      <nav aria-label="Admin"><NavLink end to="/admin" className={link}>Dashboard</NavLink>
        <H>Content</H>{CONTENT.map((k) => <NavLink key={k} to={`/admin/${k}`} className={link}>{RESOURCES[k].title}</NavLink>)}
        <H>Inbox</H><NavLink to="/admin/appointments" className={link}>Appointments</NavLink><NavLink to="/admin/applications" className={link}>Job applications</NavLink>{[['messages', 'Messages'], ['subscribers', 'Subscribers']].map(([k, l]) => <NavLink key={k} to={`/admin/inbox/${k}`} className={link}>{l}</NavLink>)}
        <H>Site</H><NavLink to="/admin/media" className={link}>Media library</NavLink><NavLink to="/admin/settings" className={link}>Settings &amp; account</NavLink></nav>
      <div className="mt-6 space-y-1 border-t border-white/15 pt-4 text-sm"><a className="block px-3 py-1.5 text-white/75 hover:text-white" href="/" target="_blank" rel="noreferrer">View website ↗</a><button className="block w-full px-3 py-1.5 text-left text-white/75 hover:text-white" onClick={out}>Log out</button></div>
    </aside>
    <main className="min-w-0 flex-1 p-4 md:p-8"><div className="mb-6 flex justify-end"><NotificationBell /></div><Outlet /></main></div>)
}

import { ArrowUpRight, ChevronDown, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'wouter'

export function Brand({ compact = false }) {
  return <Link href="/" className="flex items-center gap-2.5 text-inherit no-underline">
    <img src="/logo.png" alt="Link logo" className="h-9 w-auto"/>
    {!compact && <span className="text-[24px] font-bold tracking-[-.06em]">link</span>}
  </Link>
}

export function Header({ user, workspace, workspaces = [], selectWorkspace, role, setRole, roleCanOwn, domain, setDomain, signOut, manageWorkspaces }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="sticky top-0 z-40 border-b border-[hsl(var(--line))] bg-[hsl(var(--canvas)/.94)] backdrop-blur-xl">
    <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-4 px-4 sm:px-7">
      <Brand/>
      <div className="hidden h-7 w-px bg-[hsl(var(--line))] md:block"/>
      {workspace && <label className="hidden items-center gap-2 text-xs font-semibold md:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--learner))]"/>
        {workspaces.length>1?<select aria-label="Workspace" value={workspace.id} onChange={e=>selectWorkspace(e.target.value)} className="max-w-40 bg-transparent text-xs font-bold outline-none">{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>:<span className="max-w-36 truncate">{workspace.name}</span>}
      </label>}
      <div className="ml-auto flex items-center gap-2">
        {workspace && <select aria-label="Knowledge domain" value={domain} onChange={e=>setDomain(e.target.value)} className="focus-ring surface hidden h-9 max-w-40 rounded-lg px-2 text-xs font-semibold sm:block">
          <option value="culinary">Culinary SOPs</option><option value="technology">Tech onboarding</option><option value="support">Support SOPs</option>
        </select>}
        <div className="surface flex h-9 items-center rounded-lg p-1">
          <button type="button" onClick={()=>setRole('owner')} disabled={!roleCanOwn} title={!roleCanOwn?'Owner access is restricted to workspace owners':''} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${role==='owner'?'bg-[hsl(var(--owner)/.18)] owner-color':'muted'} ${!roleCanOwn?'cursor-not-allowed opacity-40':''}`}>Owner</button>
          <button type="button" onClick={()=>setRole('learner')} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${role==='learner'?'bg-[hsl(var(--learner)/.15)] learner-color':'muted'}`}>Learn</button>
        </div>
        <div className="relative">
          <button type="button" onClick={()=>setMenuOpen(!menuOpen)} className="focus-ring flex items-center gap-2 rounded-lg px-1.5 py-1 text-left">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${role==='owner'?'bg-[hsl(var(--owner)/.2)] owner-color':'bg-[hsl(var(--learner)/.18)] learner-color'}`}>{(user?.name||user?.email||'U').slice(0,1).toUpperCase()}</span>
            <span className="hidden max-w-32 sm:block"><span className="block truncate text-[11px] font-bold">{user?.name||user?.email||'Signed in'}</span><span className="block text-[10px] muted">{role==='owner'?'Workspace owner':'Team member'}</span></span>
            <ChevronDown size={13} className="hidden muted sm:block"/>
          </button>
          {menuOpen && <div className="surface absolute right-0 top-12 z-50 w-52 rounded-xl p-2 shadow-2xl">
            <div className="px-3 py-2 text-xs muted">{user?.email}</div>
            <button type="button" onClick={()=>{setMenuOpen(false);manageWorkspaces()}} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-[hsl(var(--surface-raised))]">Create or join workspace <ArrowUpRight size={14}/></button>
            <button type="button" onClick={()=>{setMenuOpen(false);signOut()}} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-[hsl(var(--surface-raised))]">Sign out <ArrowUpRight size={14}/></button>
          </div>}
        </div>
      </div>
    </div>
    {workspace && <div className="flex gap-2 overflow-x-auto border-t border-[hsl(var(--line))] px-4 py-2 sm:hidden">
      <span className="shrink-0 rounded-full bg-[hsl(var(--surface-raised))] px-3 py-1 text-[10px] font-bold muted">DOMAIN</span>
      {['culinary','technology','support'].map(d=><button key={d} onClick={()=>setDomain(d)} className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold capitalize ${domain===d?'bg-[hsl(var(--owner)/.17)] owner-color':'muted'}`}>{d}</button>)}
    </div>}
  </header>
}

export function Eyebrow({ icon: Icon = Sparkles, children, color = 'owner' }) {
  return <div className={`mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] ${color==='owner'?'owner-color':'learner-color'}`}><Icon size={13}/>{children}</div>
}

export function PageTitle({ eyebrow, title, detail, color = 'owner', icon }) {
  return <div className="mb-7"><Eyebrow color={color} icon={icon}>{eyebrow}</Eyebrow><h1 className="serif text-2xl font-extrabold tracking-[-.055em] sm:text-[32px]">{title}</h1>{detail&&<p className="mt-2 max-w-2xl text-sm leading-6 muted">{detail}</p>}</div>
}

export function EmptyState({ icon: Icon=ShieldCheck, title, detail }) {
  return <div className="surface flex min-h-48 flex-col items-center justify-center rounded-2xl px-6 py-10 text-center"><span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--surface-raised))] muted"><Icon size={19}/></span><h3 className="text-sm font-bold">{title}</h3><p className="mt-2 max-w-sm text-xs leading-5 muted">{detail}</p></div>
}

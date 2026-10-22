import { useState } from 'react'
import { ArrowRight, Check, KeyRound, Layers3, LoaderCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { request } from '../api'
import { Brand, EmptyState } from '../components/Brand'

export default function Onboarding({ me, reloadMe, onBack }) {
  const [mode,setMode]=useState('create')
  const [name,setName]=useState('')
  const [code,setCode]=useState('')
  const [seed,setSeed]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const pending=me?.workspaces?.filter(w=>w.status==='pending')||[]
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');setSuccess('')
    try {
      if(mode==='create') { await request('/workspaces',{method:'POST',body:{name:name.trim(),seedSamples:seed}});setSuccess('Workspace created. Your starter library is ready.'); }
      else { const result=await request('/requests',{method:'POST',body:{code:code.trim()}});setSuccess(result.message||'Request submitted. An owner will review your access.'); }
      await reloadMe()
    } catch(err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="min-h-[100dvh] px-4 py-7 sm:px-8">
    <header className="mx-auto flex max-w-6xl items-center justify-between"><Brand/>{onBack?<button onClick={onBack} className="text-xs font-bold owner-color">Back to workspace</button>:<span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] muted"><ShieldCheck size={14} className="owner-color"/>Workspace setup</span>}</header>
    <div className="mx-auto grid max-w-6xl gap-10 py-12 md:grid-cols-[.9fr_1.1fr] md:items-start md:py-20">
      <div className="fade-up"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--owner)/.14)] owner-color"><Layers3 size={21}/></div><h1 className="max-w-lg text-4xl font-extrabold leading-[1.05] tracking-[-.07em] sm:text-5xl">Knowledge has a place to live.</h1><p className="mt-5 max-w-md text-sm leading-7 muted">Create your company learning space, or join one with an owner’s access code. Membership is checked by the workspace—not this screen.</p>
        <div className="mt-9 space-y-3">{[['Curate','Manage SOPs and review source material.'],['Ground','Inspect retrieval instead of guessing.'],['Teach','Help the team practice to a shared standard.']].map(([a,b])=><div key={a} className="flex gap-3"><span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-[hsl(var(--learner)/.14)] learner-color"><Check size={11}/></span><div><div className="text-xs font-bold">{a}</div><div className="mt-1 text-[11px] muted">{b}</div></div></div>)}</div>
      </div>
      <div className="surface fade-up stagger-1 rounded-2xl p-5 sm:p-8">
        <div className="flex rounded-xl bg-[hsl(var(--surface-raised))] p-1"><button onClick={()=>{setMode('create');setError('');setSuccess('')}} className={`flex-1 rounded-lg px-3 py-3 text-xs font-extrabold ${mode==='create'?'bg-[hsl(var(--canvas))] owner-color':'muted'}`}>Create a workspace</button><button onClick={()=>{setMode('join');setError('');setSuccess('')}} className={`flex-1 rounded-lg px-3 py-3 text-xs font-extrabold ${mode==='join'?'bg-[hsl(var(--canvas))] learner-color':'muted'}`}>Request access</button></div>
        {success?<div className="py-9"><EmptyState icon={Check} title={success} detail={mode==='join'?'Your request will remain pending until a workspace owner reviews it. You can refresh this page to check membership status.':'Your workspace is ready. Refresh to open your control center.'}/><button onClick={reloadMe} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--owner))] px-4 py-3 text-xs font-extrabold text-[#20251e]"><RefreshCw size={14}/> Refresh membership</button></div>:<form onSubmit={submit} className="pt-7">
          <div className="mb-6"><div className="text-lg font-extrabold tracking-[-.04em]">{mode==='create'?'Start with a clean foundation':'Join your company workspace'}</div><div className="mt-1 text-xs muted">{mode==='create'?'You will be the owner of this new workspace.':'A workspace owner must approve your request.'}</div></div>
          {mode==='create'?<><label className="mb-2 block text-[11px] font-bold">Workspace name</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Northstar Kitchen" className="focus-ring surface h-12 w-full rounded-lg px-4 text-sm outline-none placeholder:text-[hsl(var(--muted))]"/>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--line))] p-4"><input type="checkbox" checked={seed} onChange={e=>setSeed(e.target.checked)} className="mt-1 accent-amber-500"/><span><span className="block text-xs font-bold">Include 30 sample SOPs</span><span className="mt-1 block text-[10px] leading-5 muted">Ten clearly marked examples in culinary, technology and support. Useful to explore; never presented as your company policy.</span></span></label></>:<><label className="mb-2 block text-[11px] font-bold">Workspace join code</label><div className="relative"><KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 muted"/><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Paste the code shared by your owner" className="focus-ring surface h-12 w-full rounded-lg pl-11 pr-4 text-sm outline-none placeholder:text-[hsl(var(--muted))]"/></div></>}
          {error&&<div role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</div>}
          <button disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--owner))] text-xs font-extrabold text-[#20251e] disabled:opacity-60">{busy?<><LoaderCircle size={15} className="animate-spin"/>Working…</>:<>{mode==='create'?'Create workspace':'Send access request'}<ArrowRight size={15}/></>}</button>
          {pending.length>0&&<div className="mt-6 border-t border-[hsl(var(--line))] pt-5"><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest muted"><Users size={13}/>Pending requests</div>{pending.map(w=><div key={w.id} className="flex items-center justify-between py-2 text-xs"><span>{w.name}</span><span className="rounded-full bg-[hsl(var(--owner)/.13)] px-2 py-1 text-[9px] owner-color">Awaiting approval</span></div>)}</div>}
        </form>}
      </div>
    </div>
  </main>
}

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChefHat, Code2, Copy, FileText, Headphones, LockKeyhole, Mail, ShieldCheck, Upload, Users, X } from 'lucide-react';
import './FieldGuideSetup.css';

const steps = [
  ['Make it yours', 'A few details. A place to belong.'],
  ['Find your field', 'Choose your starting point.'],
  ['Bring your first SOP', 'Knowledge worth passing on.'],
  ['Open the door', 'A code for your people.'],
];
const domains = [
  { name: 'Culinary', title: 'The kitchen line', detail: 'Prep, service & the close-down.', icon: ChefHat, sample: 'Kitchen close-down procedure.pdf', color: '#e8ad78' },
  { name: 'Technology', title: 'The first commit', detail: 'Setup, shipping & good engineering habits.', icon: Code2, sample: 'Local development setup.pdf', color: '#ccd5e9' },
  { name: 'Customer support', title: 'The support desk', detail: 'First responses, escalations & human answers.', icon: Headphones, sample: 'Customer escalation procedure.pdf', color: '#dce0b8' },
];

function Handbook({ company, domain }: { company: string; domain: number }) {
  return <div className="fgs-book-wrap"><div className="fgs-book" style={{ background: domains[domain].color }}>
    <div className="fgs-mono">The company field guide</div>
    <h3>{company || 'Your company'},<br/><em>by the book.</em></h3>
    <p>A guide to the way we work.</p>
    <svg viewBox="0 0 120 74" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15c17-5 28-3 42 5 14-8 25-10 42-5v44c-17-4-28-2-42 6-14-8-25-10-42-6V15Z"/><path d="M60 20v45M23 12l-7-1-4 45 6 3m86-45 5-3 4 45-11 3M28 25c9-1 16 0 23 4m-23 5c9-1 16 0 23 4m-23 5c9-1 16 0 23 4m18-18c7-4 14-5 23-4m-23 13c7-4 14-5 23-4m-23 13c7-4 14-5 23-4"/><path d="m76 10 9-8 5 6-9 8M39 64l-3 6m65-2 7 2"/></svg>
    <div className="fgs-book-foot"><span>{domains[domain].name} / 001</span><span>Owner’s edition</span></div>
  </div><span className="fgs-pencil">Your knowledge.<br/>A new chapter.</span></div>;
}

export function FieldGuideSetup() {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [size, setSize] = useState('2–10 people');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState(0);
  const [file, setFile] = useState<{ name: string; detail: string } | null>(null);
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invited, setInvited] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [login, setLogin] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const current = domains[domain];
  const go = (next: number) => { setStep(next); setFurthest(Math.max(furthest, next)); setError(''); };
  const handleFile = (item?: File) => {
    if (!item) return;
    if (!/\.(pdf|docx|txt)$/i.test(item.name)) { setError('Choose a PDF, DOCX or TXT file to continue.'); return; }
    if (item.size > 20 * 1024 * 1024) { setError('That file is a little large. Try one under 20 MB.'); return; }
    setFile({ name: item.name, detail: `${Math.max(1, Math.round(item.size / 1024))} KB · Ready for your workspace` }); setError('');
  };
  const code = `${(slug || 'FIELD').replace(/-/g, '').slice(0, 4).toUpperCase()}–7K2P`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setError('Clipboard access is unavailable. Select and copy the code above.'); }
  };
  return <main className="fgs"><div className="fgs-shell">
    <header className="fgs-header"><div className="fgs-brand"><img src="/__mockup/images/link-hat.png" alt=""/>link</div><div className="fgs-header-right"><span className="fgs-mono">Good beginnings, right this way.</span><button onClick={() => { setLogin(!login); setLoginSent(false); }}>{login ? 'Back to setup' : 'Already have a workspace?'}</button></div></header>
    <div className="fgs-layout">
      <aside className="fgs-aside"><div className="fgs-mono">The owner’s handbook / Getting started</div><h1>Every good team<br/>starts with<br/><em>a shared page.</em></h1><p>Give what you know a place to live.<br/>We’ll help you take it from here.</p>
        <nav className="fgs-steps" aria-label="Workspace setup">{steps.map(([title, detail], index) => <button className={`fgs-step ${step === index ? 'active' : ''} ${index < step ? 'done' : ''}`} key={title} onClick={() => { go(index); setComplete(false); setLogin(false); }} disabled={index > furthest} aria-current={step === index ? 'step' : undefined}><span className="fgs-stepnum">{index < step ? <Check size={13}/> : `0${index + 1}`}</span><span><strong>{title}</strong><small>{detail}</small></span></button>)}</nav>
        <Handbook company={company} domain={domain}/>
      </aside>
      <section className="fgs-paper" aria-label="Workspace setup form"><div className="fgs-paper-top"><span className="fgs-mono">{login ? 'Welcome back' : complete ? 'Your next chapter' : `Chapter 0${step + 1} / ${steps[step][0]}`}</span><span>{login ? 'Your knowledge is right here.' : `0${step + 1} of 04`}</span></div>
        {login ? <form className="fgs-form" onSubmit={e => { e.preventDefault(); setLoginSent(true); }}><h2>Pick up where you left off.</h2><p className="fgs-description">Enter your work email to request a sign-in link.</p><label className="fgs-field">Work email<input required type="email" placeholder="you@company.com"/></label>{loginSent && <div className="fgs-callout"><Mail size={17}/><span>This is a design preview. No email was sent. In your connected workspace, a secure sign-in link would arrive here.</span></div>}<div className="fgs-actions"><button type="button" className="fgs-back" onClick={() => setLogin(false)}><ArrowLeft size={14}/>Back to setup</button><button className="fgs-primary">Request a sign-in link<ArrowRight size={14}/></button></div></form>
        : complete ? <div className="fgs-form"><div className="fgs-mono" style={{ marginBottom: 18 }}><CheckCheck size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}/>Setup complete</div><h2>Your field guide is open.</h2><p className="fgs-description">Welcome to {company}. You’ve laid the groundwork for a better first day.</p><div className="fgs-dashboard"><h3>{company}’s workspace</h3><div className="fgs-review"><span>{current.name} field guide</span><BookOpen size={17}/></div><div className="fgs-review"><span>1 source document ready for review</span><FileText size={17}/></div><div className="fgs-review"><span>{invited.length} invitation{invited.length !== 1 ? 's' : ''} prepared</span><Users size={17}/></div><p>Your next step: review your SOP and shape your team’s first learning path.</p></div><p className="fgs-notice">Interactive preview only. Your information stays in this session; no workspace, uploads or invitations are sent to a server.</p><div className="fgs-actions"><button className="fgs-back" onClick={() => setComplete(false)}><ArrowLeft size={14}/>Back to invitations</button><button className="fgs-primary" onClick={() => { setComplete(false); go(2); }}>Review your SOP<ArrowRight size={14}/></button></div></div>
        : <form ref={formRef} className="fgs-form" key={step} onSubmit={e => { e.preventDefault(); if (step === 2 && !file) { setError('Add your SOP or choose the sample below to continue.'); return; } if (step < 3) go(step + 1); else setComplete(true); }}>
          {step === 0 && <><h2>Let’s make this your place.</h2><p className="fgs-description">A private workspace for your people, your procedures,<br/>and the things that make your company yours.</p><div className="fgs-fields">
            <label className="fgs-field fgs-full">Company name<input required value={company} placeholder="e.g. Juniper Kitchen" autoComplete="organization" onChange={e => { setCompany(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }}/></label>
            <label className="fgs-field">Your name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Rivera" autoComplete="name"/></label>
            <label className="fgs-field">Work email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@juniper.co" autoComplete="email"/></label>
            <label className="fgs-field fgs-full">Team size<select value={size} onChange={e => setSize(e.target.value)}><option>Just me, for now</option><option>2–10 people</option><option>11–30 people</option><option>31–100 people</option><option>More than 100 people</option></select></label>
            <label className="fgs-field fgs-full">Your workspace address<div className="fgs-address"><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} placeholder="your-company" onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}/><span>.link.workspace</span></div><small>A little home for your handbook. You can change this later.</small></label>
          </div><div className="fgs-callout"><ShieldCheck size={17}/><span>You’ll be the workspace owner. Only people you approve can access your company’s knowledge.</span></div></>}
          {step === 1 && <><h2>Where does your story start?</h2><p className="fgs-description">Pick the field closest to your work. We’ll tailor your starting materials—not put you in a box.</p><div className="fgs-domains" role="radiogroup" aria-label="Training domain">{domains.map((item, index) => { const Icon = item.icon; return <button type="button" role="radio" aria-checked={domain === index} className={`fgs-domain ${domain === index ? 'selected' : ''}`} key={item.name} onClick={() => { setDomain(index); if (file?.detail.includes('sample')) setFile(null); }}><Icon/><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="fgs-radio">{domain === index && <Check size={11}/>}</span></button>; })}</div><div className="fgs-callout"><BookOpen size={17}/><span><strong>A head start, not a blank page.</strong><br/>10 {current.name.toLowerCase()} sample SOPs are included. Your own procedures always take the lead.</span></div></>}
          {step === 2 && <><h2>A document is a good start.</h2><p className="fgs-description">Bring one procedure your team should know. A closing checklist, a setup guide, a way of doing things.</p>{!file ? <><label className="fgs-upload" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}><Upload size={27}/><strong>Your first page goes here.</strong><p>Drop an SOP here, or choose a file below.<br/>PDF, DOCX or TXT · up to 20 MB</p><input type="file" accept=".pdf,.docx,.txt" onChange={e => handleFile(e.target.files?.[0])} aria-label="Upload your first SOP"/></label><div className="fgs-or">Or find your starting point</div><button type="button" className="fgs-sample" onClick={() => { setFile({ name: current.sample, detail: `${current.name} sample · 4 pages · Ready for review` }); setError(''); }}><FileText size={23}/><span><strong>Try a {current.name.toLowerCase()} sample</strong><small>{current.sample.replace('.pdf', '')}</small></span><ArrowRight size={16}/></button></> : <><div className="fgs-file"><FileText size={27}/><div><strong>{file.name}</strong><p>{file.detail}</p></div><button className="fgs-iconbutton" type="button" onClick={() => setFile(null)} aria-label="Remove document"><X size={17}/></button></div><h3 className="fgs-note-title">From the page to the practice.</h3><div className="fgs-outcomes"><div><Check size={14}/>A step-by-step learning module</div><div><Check size={14}/>A quiz to check what’s understood</div><div><Check size={14}/>Source-grounded answers from your assistant</div></div><p className="fgs-notice">These are your next steps, not generated results. You’ll review materials before your team sees them.</p></>}<div className="fgs-callout"><LockKeyhole size={16}/><span>Your SOP stays in your workspace. Nothing is published to your team until you review it.</span></div></>}
          {step === 3 && <><h2>Good knowledge travels.</h2><p className="fgs-description">{company} has a place to begin. Share this code with your team so they can find their way in.</p><div className="fgs-code"><span className="fgs-mono">Your workspace join code</span><strong>{code}</strong><button type="button" className="fgs-primary" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Code copied' : 'Copy join code'}</button></div><div className="fgs-review"><span><strong style={{ display: 'block', marginBottom: 5 }}>Approve people before they enter</strong><small>Join requests come to you. Your knowledge stays private.</small></span><button type="button" className="fgs-toggle" role="switch" aria-label="Require owner approval" aria-checked={approved} onClick={() => setApproved(!approved)}/></div><label className="fgs-field" style={{ marginTop: 20 }}>Or prepare an email invitation<div className="fgs-invite"><input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/><button type="button" className="fgs-primary" onClick={() => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setError('Enter a valid teammate email first.'); return; } setInvited([...new Set([...invited, inviteEmail])]); setInviteEmail(''); setError(''); }}>Add invitation<ArrowRight size={13}/></button></div></label>{invited.map(address => <div className="fgs-review" key={address}><span>{address} · Ready to invite</span><button type="button" className="fgs-iconbutton" aria-label={`Remove ${address}`} onClick={() => setInvited(invited.filter(value => value !== address))}><X size={13}/></button></div>)}<p className="fgs-notice">Preview mode · Invitations are prepared here, not emailed. You can invite more people later.</p></>}
          {error && <p className="fgs-error" role="alert">{error}</p>}
          <div className="fgs-actions">{step === 0 ? <small>About 3 minutes.<br/>Yours to make your own.</small> : <button type="button" className="fgs-back" onClick={() => go(step - 1)}><ArrowLeft size={14}/>Previous chapter</button>}<button className="fgs-primary" type="submit">{['Find your field', 'Bring your first SOP', 'Create workspace', 'Open your workspace'][step]}<ArrowRight size={15}/></button></div>
        </form>}
        <div className="fgs-bottom"><LockKeyhole size={12}/>{step === 3 ? 'Your people. Your permission. Your way.' : 'Private by workspace. Grounded in your knowledge.'}</div>
      </section>
    </div>
    <footer className="fgs-footer"><span><BookOpen size={13}/>A field guide to the way you work.</span><span>Link / Company knowledge, passed on properly.</span></footer>
  </div></main>;
}

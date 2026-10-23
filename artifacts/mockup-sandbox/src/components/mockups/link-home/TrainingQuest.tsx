import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCheck, ChefHat, ChevronRight, ClipboardCheck, Code2, Compass, FileText, Flag, Hash, Headphones, KeyRound, LockKeyhole, MessageCircle, Send, ShieldCheck, Sparkles, UserCheck, Users, X } from 'lucide-react';
import './_training-quest.css';

const domains = [
  { name: 'Culinary SOPs', icon: ChefHat, title: 'A great shift starts before service.', description: 'From opening the kitchen to the final handoff, give every new team member a clear way to learn your standards.', topics: ['Kitchen readiness', 'Food safety', 'Service routines'], lesson: 'The pre-service checklist', color: '#b5c983' },
  { name: 'Tech onboarding', icon: Code2, title: 'Less setup limbo. More first commits.', description: 'Make your tools, team conventions, and development workflows a path new teammates can actually follow.', topics: ['Environment setup', 'Code review', 'Release workflows'], lesson: 'Your first pull request', color: '#c5b6dd' },
  { name: 'Customer support', icon: Headphones, title: 'Build confidence on both sides of the conversation.', description: 'Help new support teammates practice your policies, escalation paths, and the voice your customers know.', topics: ['Ticket triage', 'Escalations', 'Customer conversations'], lesson: 'A thoughtful first response', color: '#f6bd88' },
];
const journey = [
  { icon: Hash, title: 'Join with a code', text: 'Your team shares the way in. Enter your workspace code.' },
  { icon: UserCheck, title: 'Get the green light', text: 'An owner approves your request. Your space stays private.' },
  { icon: BookOpen, title: 'Learn the ropes', text: 'Work through modules built around your company’s SOPs.' },
  { icon: ClipboardCheck, title: 'Put it into practice', text: 'Check your knowledge with quizzes and practice sandboxes.' },
  { icon: MessageCircle, title: 'Ask along the way', text: 'Get source-cited answers from your workspace assistant.' },
  { icon: Flag, title: 'Ready for the real thing', text: 'Bring what you’ve learned to the work in front of you.' },
];
const ownerSteps = [
  ['Create your workspace', 'A private home for the way your company works.', Compass],
  ['Add your SOPs', 'Bring the documents your team actually relies on.', FileText],
  ['Share your join code', 'Give new interns a clear starting point.', KeyRound],
  ['Approve your interns', 'You decide who gets access to your workspace.', Users],
  ['Set up your assistant', 'Choose its source documents and set its boundaries.', ShieldCheck],
] as const;

function Brand() {
  return <a href="#" className="tq-brand" aria-label="Link home"><img src="/__mockup/images/link-hat.png" alt="" />link</a>;
}

export function TrainingQuest() {
  const [domainIndex, setDomainIndex] = useState(0);
  const [activeMarker, setActiveMarker] = useState(2);
  const [dialog, setDialog] = useState<'create' | 'join' | 'signin' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const domain = domains[domainIndex];
  const DomainIcon = domain.icon;
  const open = (mode: 'create' | 'join' | 'signin') => { setSubmitted(false); setDialog(mode); };
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDialog(null); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [dialog]);

  return <main className="tq min-h-[100dvh]">
    <section className="tq-hero">
      <header className="tq-wrap"><div className="tq-nav"><Brand /><nav className="tq-links" aria-label="Main navigation"><a href="#journey">The journey</a><a href="#for-teams">For your team</a><button className="tq-text-link" style={{ textDecoration: 'none' }} onClick={() => open('signin')}>Sign in</button><button className="tq-btn" onClick={() => open('create')}>Create a workspace <ArrowRight size={14} /></button></nav></div></header>
      <div className="tq-wrap tq-hero-inner">
        <div className="tq-reveal"><div className="tq-eyebrow">A little guidance. A lot of possibility.</div><h1>From new here.<br />To <em>got this.</em></h1><p className="tq-intro">Turn your company’s SOPs into a learning adventure. A clear path for new teammates. A trusted guide at every step. All grounded in how <b>you</b> work.</p><div className="tq-actions"><button className="tq-btn" onClick={() => open('create')}>Create a workspace <ArrowRight size={16} /></button><button className="tq-text-link" onClick={() => open('join')}>I already have access</button></div><div className="tq-note"><LockKeyhole size={12} /> Private workspaces. Your documents. Your rules.</div></div>
        <div className="tq-map" aria-label="Illustrative learner journey. Select a checkpoint to explore.">
          <div className="tq-map-paper" />
          <svg className="route" viewBox="0 0 520 470" fill="none" aria-hidden="true"><path d="M88 402 C210 415 245 328 125 300 C-5 270 54 176 155 155 C250 132 365 120 389 216 C418 324 258 384 367 359 C490 330 462 112 401 66" stroke="#25332b" strokeWidth="26" strokeLinecap="round" opacity=".08" /><path d="M88 402 C210 415 245 328 125 300 C-5 270 54 176 155 155 C250 132 365 120 389 216 C418 324 258 384 367 359 C490 330 462 112 401 66" stroke="#fff8e9" strokeWidth="19" strokeLinecap="round" /><path d="M88 402 C210 415 245 328 125 300 C-5 270 54 176 155 155 C250 132 365 120 389 216 C418 324 258 384 367 359 C490 330 462 112 401 66" stroke="#25332b" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" /><path d="M244 58l8 12-17-1zM41 142l9-16 8 16zM246 265l12-19 12 19zM440 415l11-18 10 18z" fill="#819663" /><path d="M247 71v10M50 142v10M258 265v10M451 415v10" stroke="#25332b" strokeWidth="2" /><circle cx="300" cy="112" r="5" fill="#f56c42" /><circle cx="239" cy="414" r="4" fill="#f56c42" /></svg>
          <span className="tq-map-label">YOUR NEXT CHAPTER STARTS HERE</span>
          {[['Join your team', 'One code. You’re on your way.'], ['You’re approved', 'A warm welcome awaits.'], ['Learn + practice', 'Small steps. Real know-how.'], ['Check your knowledge', 'Make the learning stick.'], ['Ask your guide', 'Answers with a source.']].map(([title, sub], index) => <button key={title} className={`tq-map-marker m${index + 1} ${activeMarker === index ? 'selected' : ''}`} onClick={() => setActiveMarker(index)} aria-pressed={activeMarker === index}><span className="num">{index < activeMarker ? <Check size={15} /> : `0${index + 1}`}</span><span><b>{title}</b><small>{sub}</small></span></button>)}
          <div className="tq-destination"><Flag size={18} style={{ margin: '0 auto 4px' }} /><b>Ready, set, go.</b><small>THE CONFIDENCE TO DO IT</small></div><Sparkles className="tq-map-star" size={33} strokeWidth={1.3} /><img className="tq-map-hat" src="/__mockup/images/link-hat.png" alt="" />
        </div>
      </div>
    </section>
    <div className="tq-wrap tq-strip"><span><FileText size={17} /> Your SOPs, made learnable</span><span><ShieldCheck size={17} /> Answers you can trace</span><span><Users size={17} /> Owners stay in control</span><span><BookOpen size={17} /> 30 sample SOPs included</span></div>

    <section className="tq-wrap tq-section tq-scroll" id="journey">
      <div className="tq-section-head"><div><div className="tq-eyebrow">For the new person on the team</div><h2>No more “where do I start?”</h2></div><p className="tq-sub">A path to follow, room to practice, and a guide that knows your company’s way of doing things.</p></div>
      <div className="tq-journey">{journey.map((step, index) => <article className="tq-step" key={step.title}><div className="tq-step-circle"><step.icon size={20} strokeWidth={1.6} /></div><small>CHECKPOINT 0{index + 1}</small><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
    </section>

    <section className="tq-domain-section" id="for-teams"><div className="tq-wrap tq-section tq-scroll">
      <div className="tq-section-head"><div><div className="tq-eyebrow">Different work. Same sense of direction.</div><h2>Find your team’s terrain.</h2></div><p className="tq-sub">Start with 30 sample SOPs across three domains—10 for each. Then make the learning your own.</p></div>
      <div className="tq-domain-tabs" role="tablist" aria-label="Training domains">{domains.map((d, i) => <button key={d.name} id={`tq-tab-${i}`} aria-controls="tq-domain-panel" role="tab" aria-selected={domainIndex === i} className={`tq-tab ${domainIndex === i ? 'active' : ''}`} onClick={() => setDomainIndex(i)}><d.icon size={16} />{d.name}</button>)}</div>
      <div id="tq-domain-panel" role="tabpanel" aria-labelledby={`tq-tab-${domainIndex}`} className="tq-domain-content"><div className="tq-domain-art" style={{ background: domain.color }}><div className="tq-domain-card" key={domainIndex}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><DomainIcon size={31} strokeWidth={1.5} /><span>SAMPLE MODULE</span></div><h3>{domain.lesson}</h3><div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10 }}><CheckCheck size={15} /> Read it. Try it. Make it yours.</div><div className="tq-progress"><i /></div><div style={{ fontSize: 9, display: 'flex', justifyContent: 'space-between' }}><span style={{ letterSpacing: 0, fontWeight: 500 }}>Your next step</span><ArrowRight size={14} /></div></div></div><div className="tq-domain-copy"><div className="tq-eyebrow">{domain.name}</div><h3>{domain.title}</h3><p>{domain.description}</p><ul>{domain.topics.map(t => <li key={t}>{t}</li>)}</ul><button className="tq-text-link" onClick={() => open('create')}>Build your team’s path <ArrowRight size={13} style={{ display: 'inline', marginLeft: 8 }} /></button></div></div>
    </div></section>

    <section className="tq-wrap tq-section tq-owner-grid tq-scroll" id="owners"><div><div className="tq-eyebrow">For the person showing the way</div><h2>You know the work.<br />You set the path.</h2><p className="tq-sub">You don’t need another binder nobody opens. Give your knowledge a home, invite your interns, and keep the important decisions in your hands.</p><button className="tq-btn orange" style={{ marginTop: 24 }} onClick={() => open('create')}>Let’s set up your workspace <ArrowRight size={15} /></button><div className="tq-note"><LockKeyhole size={12} /> Access is by invitation and owner approval.</div></div><div className="tq-owner-list">{ownerSteps.map(([title, text, Icon], index) => <article className="tq-owner-item" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div><Icon size={19} strokeWidth={1.5} /></article>)}</div></section>

    <section className="tq-ai-section"><div className="tq-wrap tq-section tq-ai-grid tq-scroll"><div className="tq-chat"><div className="tq-chat-head"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Compass size={19} /> Your Link assistant</span><small>ILLUSTRATIVE EXAMPLE</small></div><div className="tq-chat-question">What should I check before the kitchen opens?</div><div className="tq-chat-answer"><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, marginBottom: 9 }}><Sparkles size={14} /> Example answer</div>Start with your station checklist: confirm surfaces are clean, check equipment is ready, and review your prep list before service.<div className="tq-source"><FileText size={17} /><div><b>Opening the kitchen · §2</b><br /><span style={{ fontSize: 9 }}>Sample SOP citation</span></div><ChevronRight size={15} style={{ marginLeft: 'auto' }} /></div></div><div style={{ borderTop: '1px solid #25332b26', marginTop: 21, paddingTop: 15, fontSize: 10, display: 'flex', justifyContent: 'space-between', color: '#7a806e' }}><span>A guide, not a guess.</span><Send size={13} /></div></div><div><div className="tq-eyebrow">A guide with its feet on the ground</div><h2>Not the internet’s answer.<br />Your company’s answer.</h2><p className="tq-sub">The Link assistant answers only from your workspace’s documents and cites the source SOP. So “why do we do it this way?” has a place to land.</p><div className="tq-ai-rule"><FileText size={18} /> Every answer has a source to follow.</div><div className="tq-ai-rule"><ShieldCheck size={18} /> No supporting source? No made-up answer.</div></div></div></section>

    <section className="tq-bottom"><div className="tq-eyebrow">Every great teammate starts somewhere</div><h2>Give them a better<br />first chapter.</h2><p>Your knowledge. Their confidence. One clear path forward.</p><button className="tq-btn" onClick={() => open('create')}>Create a workspace <ArrowRight size={16} /></button><div style={{ marginTop: 19 }}><button className="tq-text-link" onClick={() => open('join')}>Joining a team? Start with your code <ArrowRight size={12} style={{ display: 'inline', marginLeft: 6 }} /></button></div></section>
    <footer className="tq-wrap tq-footer"><div><Brand /><p>Company knowledge. A way forward.</p></div><div className="tq-footer-links"><a href="#journey">The journey</a><a href="#owners">For owners</a><button className="tq-text-link" style={{ padding: 0, fontSize: 11 }} onClick={() => open('signin')}>Sign in</button></div><p>Private by workspace.<br />Grounded in your company’s documents.</p></footer>

    {dialog && <div className="tq-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><section className="tq-dialog" role="dialog" aria-modal="true" aria-labelledby="tq-dialog-title"><button className="tq-close" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={21} /></button><div className="tq-eyebrow">Your next chapter</div>{submitted ? <><h2 id="tq-dialog-title">{dialog === 'join' ? 'Your path starts here.' : dialog === 'create' ? 'A good beginning.' : 'Welcome back.'}</h2><p>This is a homepage preview. In Link, this step takes you to {dialog === 'join' ? 'your workspace access request for owner approval' : dialog === 'create' ? 'workspace creation and SOP setup' : 'your secure sign-in'}.</p><button className="tq-btn" onClick={() => setDialog(null)}>Keep exploring <ArrowRight size={15} /></button></> : <><h2 id="tq-dialog-title">{dialog === 'create' ? 'Set your team’s path.' : dialog === 'join' ? 'Find your team.' : 'Back for your next step?'}</h2><p>{dialog === 'create' ? 'Start with a private workspace for your company’s know-how.' : dialog === 'join' ? 'Have a join code? Your workspace owner will approve your access before you begin.' : 'Return to your company’s learning workspace.'}</p><form onSubmit={e => { e.preventDefault(); setSubmitted(true); }}><label htmlFor="tq-entry">{dialog === 'join' ? 'Workspace join code' : 'Work email'}</label><input autoFocus id="tq-entry" type={dialog === 'join' ? 'text' : 'email'} required placeholder={dialog === 'join' ? 'Enter your code' : 'you@yourcompany.com'} /><button className="tq-btn" type="submit">{dialog === 'join' ? 'Request access' : dialog === 'create' ? 'Start your workspace' : 'Continue to sign in'}<ArrowRight size={15} /></button></form><div className="tq-note">Interactive concept preview · no account will be created.</div></>}</section></div>}
  </main>;
}

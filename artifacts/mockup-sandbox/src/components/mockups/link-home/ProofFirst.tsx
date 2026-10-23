import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChefHat, ChevronRight, CircleHelp, Code2, FileText, Headphones, LockKeyhole, MessageSquare, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Users, X, Zap } from "lucide-react";
import "./_proof-first.css";

const examples = [
  { tab: "Culinary", domain: "Culinary SOPs", question: "What do I do if a delivery arrives damaged?", answer: "Keep the damaged items separate. Photograph the damage, record it on the delivery log, and notify the shift lead before accepting the delivery.", title: "Receiving a delivery", id: "KIT-004", section: "02 / CHECK & RECORD", passage: "Separate damaged items from the rest of the delivery. Photograph the damage and record it on the delivery log. Notify the shift lead before accepting any affected goods.", sub: "02. Inspect the delivery", intro: "Check each delivery against the purchase order.", icon: ChefHat, description: "From the first delivery to the last close. Make your kitchen’s standards part of every shift." },
  { tab: "Tech", domain: "Tech onboarding", question: "Can I merge my first pull request myself?", answer: "Not yet. Your first pull request needs a review from your onboarding buddy. Once all required checks pass and your buddy approves, they will merge it with you.", title: "Your first pull request", id: "ENG-007", section: "03 / REVIEW & MERGE", passage: "Your onboarding buddy must review your first pull request. All required checks must pass before merging. After approval, your buddy will walk you through the merge.", sub: "03. Request a review", intro: "Open a draft pull request when your changes are ready.", icon: Code2, description: "Give new teammates a route through your tooling, code reviews, and the way your team ships." },
  { tab: "Support", domain: "Customer support", question: "What if a customer asks for an exception?", answer: "Don’t promise an exception. Add the customer’s request and relevant context to the ticket, then escalate it to the support lead for a decision.", title: "Handling policy exceptions", id: "SUP-003", section: "04 / ESCALATION", passage: "Do not promise policy exceptions to customers. Document the request and its context in the ticket, then escalate to the support lead. The lead will confirm the next action.", sub: "04. Escalate with context", intro: "Listen to the customer and confirm you understand the request.", icon: Headphones, description: "Teach the tone, policies, and judgment calls that turn a new hire into a trusted voice." },
];
const ownerSteps = [
  ["Create your workspace", "A private home for your company’s knowledge and people."],
  ["Add your SOPs", "Bring your own documents or start with sample procedures."],
  ["Share the join code", "Invite interns into the right training domain."],
  ["Approve your interns", "You decide who gets access. Nobody slips through."],
  ["Set up the assistant", "Define its persona and boundaries. Confirm jobs when ready."],
];
const internSteps = [
  ["Join with a code", "Use the workspace code shared by your team lead."],
  ["Wait for approval", "Your owner approves your request before you get access."],
  ["Learn by doing", "Work through modules, quizzes, and practice sandboxes."],
  ["Ask. Then check.", "Get answers from your company’s SOPs, with the source attached."],
];
const controlTabs = [
  { label: "People & approvals", icon: Users },
  { label: "Your source documents", icon: FileText },
  { label: "Assistant boundaries", icon: SlidersHorizontal },
  { label: "Owner-confirmed compute", icon: Zap },
];

export function ProofFirst() {
  const [domain, setDomain] = useState(0);
  const [sourceActive, setSourceActive] = useState(false);
  const [control, setControl] = useState(0);
  const [approved, setApproved] = useState<string[]>([]);
  const [journey, setJourney] = useState<"owner" | "intern">("owner");
  const [modal, setModal] = useState<"create" | "signin" | "join" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [computeConfirmed, setComputeConfirmed] = useState(false);
  const [persona, setPersona] = useState("A patient, practical mentor. Answer only from approved workspace documents. Always cite the source.");
  const [personaSaved, setPersonaSaved] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const example = examples[domain];
  const steps = journey === "owner" ? ownerSteps : internSteps;
  const openModal = (type: "create" | "signin" | "join") => { setSubmitted(false); setModal(type); };
  const inspectSource = () => { setSourceActive(true); window.setTimeout(() => setSourceActive(false), 1300); };
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
      if (event.key === "Tab") {
        const items = modalRef.current?.querySelectorAll<HTMLElement>("button, input, a");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [modal]);
  const Brand = () => <span className="pf-brand"><img src="/__mockup/images/link-hat.png" alt="" />link</span>;

  return <main className="proof-first">
    <section className="pf-hero">
      <header className="pf-nav pf-wrap">
        <a href="#" aria-label="Link home"><Brand /></a>
        <nav className="pf-nav-links" aria-label="Main navigation">
          <a href="#pf-proof">The proof</a><a href="#pf-control">Your control</a><a href="#pf-how">How it works</a>
        </nav>
        <div className="pf-nav-actions"><button className="pf-text-btn" onClick={() => openModal("signin")}>Sign in</button><button className="pf-btn" onClick={() => openModal("create")}>Create a workspace <ArrowUpRight size={14}/></button></div>
      </header>
      <div className="pf-wrap">
        <div className="pf-hero-copy pf-entrance">
          <div className="pf-eyebrow"><span className="pf-dot" />Your knowledge. Not an educated guess.</div>
          <h1>Don’t just give answers.<br/><em>Show where they came from.</em></h1>
          <p>Turn your company’s SOPs into training that sticks.<br/>A mentor for your team. A source behind every answer.</p>
          <div className="pf-hero-actions"><button className="pf-btn pf-btn-orange" onClick={() => openModal("create")}>Create a workspace <ArrowRight size={15}/></button><button className="pf-text-btn" onClick={() => openModal("join")}>I already have access <ArrowUpRight size={13}/></button></div>
        </div>
        <div className="pf-product" id="pf-proof">
          <div className="pf-product-top">
            <div className="pf-product-title"><Sparkles size={15}/> The answer. And the evidence.</div>
            <div className="pf-tabs" role="tablist" aria-label="Sample training domain">{examples.map((item, i) => <button key={item.tab} role="tab" aria-selected={domain === i} onClick={() => { setDomain(i); setSourceActive(false); }}>{item.tab}</button>)}</div>
            <span className="pf-sample"><span className="pf-dot"/>Interactive sample</span>
          </div>
          <div className="pf-product-body" key={domain}>
            <div className="pf-chat">
              <div className="pf-panel-label"><MessageSquare size={11}/>01 / Ask your assistant</div>
              <div className="pf-question"><span className="pf-avatar">AL</span><p>{example.question}</p></div>
              <div className="pf-answer"><span className="pf-assistant-symbol"><Sparkles size={13}/></span><div><div className="pf-answer-name">Link assistant</div><p className="pf-answer-text">{example.answer}<button aria-label="Highlight cited SOP passage" onClick={inspectSource}>1</button></p><button className="pf-cite" onClick={inspectSource}><FileText size={11}/>{example.title}<ArrowUpRight size={10}/></button></div></div>
            </div>
            <div className="pf-source">
              <div className="pf-source-header"><div className="pf-panel-label"><BookOpen size={11}/>02 / Check the source</div><span className="pf-live">Cited passage</span></div>
              <div className={`pf-doc ${sourceActive ? "pf-source-active" : ""}`}>
                <div className="pf-doc-id">SAMPLE SOP · {example.id}</div><h3>{example.title}</h3><p className="pf-doc-muted">{example.intro}</p>
                <p className="pf-doc-passage"><strong>{example.sub}</strong><br/>{example.passage}</p>
                <div className="pf-doc-bottom"><span>{example.section}</span><span>[1]</span></div>
              </div>
            </div>
          </div>
          <div className="pf-product-bottom"><span><ShieldCheck size={11}/> Company documents in. Grounded answers out.</span><span>Illustrative answer & SOP · not operational guidance</span></div>
        </div>
        <div className="pf-hero-note"><LockKeyhole size={11}/>Private by workspace. Permissioned by you. Traceable by your team.</div>
      </div>
    </section>

    <section className="pf-section pf-wrap pf-reveal" id="pf-domains">
      <div className="pf-section-head"><div><div className="pf-eyebrow"><span className="pf-dot"/>Different work. The same standard.</div><h2 className="pf-heading">Teach the way<br/>your company works.</h2></div><p>A busy kitchen. A new developer’s first week. A tricky support ticket. Your procedures deserve more than a binder nobody opens.</p></div>
      <div className="pf-domains">{examples.map((item, i) => <article className="pf-domain" key={item.domain}><div className="pf-domain-num">0{i+1} / {item.tab.toUpperCase()}</div><item.icon className="pf-domain-icon" size={27} strokeWidth={1.4}/><h3>{item.domain}</h3><p>{item.description}</p><button onClick={() => { setDomain(i); document.getElementById("pf-proof")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Try the {item.tab.toLowerCase()} example <ArrowRight size={13}/></button></article>)}</div>
      <div className="pf-included"><BookOpen size={13}/><strong>30 sample SOPs included.</strong> 10 per domain. Make them your own.</div>
    </section>

    <section className="pf-control" id="pf-control"><div className="pf-wrap pf-control-grid">
      <div><div className="pf-eyebrow">The owner’s control room</div><h2 className="pf-heading">Your standards.<br/>Your people.<br/>Your call.</h2><p className="pf-control-description">Useful AI needs clear boundaries. You choose the knowledge, approve the people, and decide when the heavy lifting happens.</p><div className="pf-control-menu" role="tablist" aria-label="Workspace controls">{controlTabs.map((item, i) => <button key={item.label} role="tab" aria-selected={control === i} onClick={() => setControl(i)}><item.icon size={15}/>{item.label}<ChevronRight size={13}/></button>)}</div></div>
      <div className="pf-control-window"><div className="pf-window-top"><span><Settings2 size={13}/> Workspace controls</span><span className="pf-owner-tag">OWNER VIEW · SAMPLE</span></div>
        <div className="pf-window-content" key={control}>
          {control === 0 && <><h3>Good people. Permission first.</h3><p>Join codes open a request. You open the door.</p>{[{name:"Alex Lin",initials:"AL",domain:"Culinary SOPs"},{name:"Morgan Reed",initials:"MR",domain:"Customer support"}].map(person => <div className="pf-person-row" key={person.name}><span className="pf-avatar">{person.initials}</span><div className="pf-person-info"><strong>{person.name}</strong><small>{person.domain} · Sample access request</small></div><button disabled={approved.includes(person.name)} onClick={() => setApproved([...approved, person.name])}>{approved.includes(person.name) ? <><CheckCheck size={11}/>Approved</> : <><Check size={11}/>Approve</>}</button></div>)}<div className="pf-window-foot"><LockKeyhole size={11}/>No workspace access until the owner approves.</div></>}
          {control === 1 && <><h3>The source of truth starts here.</h3><p>Add and curate the documents your team learns from.</p>{examples.map(item => <div className="pf-person-row" key={item.id}><FileText size={18} color="#ad6749"/><div className="pf-person-info"><strong>{item.title}</strong><small>{item.id} · Illustrative sample SOP</small></div><span className="pf-live">Sample</span></div>)}<div className="pf-window-foot"><ShieldCheck size={11}/>Your company’s documents. Not the open internet.</div></>}
          {control === 2 && <><h3>A mentor with boundaries.</h3><p>Set how the assistant speaks, and what it can use.</p><div className="pf-setting"><label htmlFor="pf-persona">Assistant persona · sample setting</label><textarea id="pf-persona" value={persona} onChange={e => { setPersona(e.target.value); setPersonaSaved(false); }} style={{width:"100%",minHeight:93,border:"none",background:"transparent",resize:"vertical",font:"inherit",color:"inherit"}}/></div><button className="pf-btn" onClick={() => setPersonaSaved(true)}>{personaSaved ? "Saved in this preview" : "Save sample persona"}<Check size={12}/></button><div className="pf-window-foot"><ShieldCheck size={11}/>No supporting document? No invented answer.</div></>}
          {control === 3 && <><h3>Nothing runs behind your back.</h3><p>GPU indexing and fine-tuning require owner confirmation.</p><div className="pf-setting"><label>Sample indexing job</label>Workspace document index<br/><strong>{computeConfirmed ? "Owner confirmation recorded · demo only" : "Awaiting owner confirmation"}</strong></div><button className="pf-btn" onClick={() => setComputeConfirmed(!computeConfirmed)}>{computeConfirmed ? "Reset sample" : "Confirm sample job"}<Zap size={12}/></button><div className="pf-window-foot"><CircleHelp size={11}/>Preview only. No GPU job is run or usage fabricated.</div></>}
        </div>
      </div>
    </div></section>

    <section className="pf-section pf-wrap pf-reveal" id="pf-how">
      <div className="pf-journey-head"><div><div className="pf-eyebrow"><span className="pf-dot"/>A clear path, on both sides</div><h2 className="pf-heading">From “where do I start?”<br/>to “I’ve got this.”</h2></div><div className="pf-journey-tabs" role="tablist" aria-label="Choose your role"><button role="tab" aria-selected={journey === "owner"} onClick={() => setJourney("owner")}>For owners</button><button role="tab" aria-selected={journey === "intern"} onClick={() => setJourney("intern")}>For interns</button></div></div>
      <div className={`pf-steps ${journey === "intern" ? "pf-four" : ""}`} key={journey}>{steps.map(([title, text], i) => <article className="pf-step" key={title}><div className="pf-step-num">0{i+1}</div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="pf-final"><div className="pf-wrap pf-final-inner"><div><h2 className="pf-heading">The way you work,<br/>ready for the next person.</h2><p>Start with your SOPs. Build a team that knows why.</p></div><button className="pf-btn" onClick={() => openModal("create")}>Create a workspace<ArrowUpRight size={16}/></button></div></section>
    <footer className="pf-footer pf-wrap"><div className="pf-footer-brand"><a href="#" aria-label="Link home"><Brand/></a><small>Company knowledge, made learnable.</small></div><div className="pf-footer-links"><a href="#pf-how">How it works</a><button className="pf-text-btn" style={{fontSize:10,padding:0}} onClick={() => openModal("signin")}>Sign in<ArrowUpRight size={11}/></button></div><small>Link · Private knowledge. Shared understanding.</small></footer>
    {modal && <div className="pf-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-dialog-title" ref={modalRef}><button className="pf-modal-close" onClick={() => setModal(null)} aria-label="Close dialog"><X size={19}/></button><Brand/>{submitted ? <><h2 id="pf-dialog-title">You’ve seen the first step.</h2><p>This is an interactive homepage concept. Your information hasn’t been sent or stored. In Link, this step would {modal === "create" ? "create your private workspace and take you to SOP setup" : modal === "join" ? "send an access request to your workspace owner" : "sign you into your workspace"}.</p><button className="pf-btn" onClick={() => setModal(null)}>Back to the homepage<ArrowRight size={14}/></button></> : <><h2 id="pf-dialog-title">{modal === "create" ? "Make your knowledge teachable." : modal === "join" ? "Your team’s knowledge starts here." : "Welcome back."}</h2><p>{modal === "create" ? "Your own workspace. Your own standards. Let’s start with the basics." : modal === "join" ? "Enter the join code from your owner. They’ll approve your access before you begin." : "Sign in to get back to your company’s workspace."}</p><form onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>{modal === "create" && <><label htmlFor="pf-name">Workspace name</label><input id="pf-name" required placeholder="e.g. Juniper Kitchen"/></>}<label htmlFor="pf-email">Work email</label><input id="pf-email" type="email" required placeholder="you@company.com"/>{modal === "join" ? <><label htmlFor="pf-code">Workspace join code</label><input id="pf-code" required placeholder="Enter your join code"/></> : modal === "signin" ? <><label htmlFor="pf-password">Password</label><input id="pf-password" type="password" required placeholder="Your password"/></> : null}<button className="pf-btn pf-btn-orange" type="submit">{modal === "create" ? "Create a workspace" : modal === "join" ? "Request access" : "Sign in"}<ArrowRight size={14}/></button></form><p className="pf-modal-note">Interactive preview only. No account will be created.</p>{modal !== "join" && <button className="pf-text-btn" onClick={() => openModal("join")}>Have a join code? Request access<ArrowUpRight size={12}/></button>}</>}</div></div>}
  </main>;
}

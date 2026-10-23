import { useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronDown, ClipboardCheck, FileText, KeyRound, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react';
import './_fieldguide.css';

const chapters = [
  { name: 'The kitchen line', category: 'Culinary SOPs', caption: 'Good habits. Every service.', short: 'Culinary', title: 'Closing the kitchen', document: 'Kitchen close-down procedure', code: 'KITCHEN / 008', excerpt: 'Clean and sanitise each workstation. Label and store ingredients according to the storage procedure. Complete the closing checklist before signing off.', module: 'A close-down you can count on', quiz: 'Put the closing steps in order', practice: 'Walk through a sample kitchen close', question: 'What should I do before signing off at close?', answer: 'Clean and sanitise your workstation, label and store ingredients following the storage procedure, then complete the closing checklist.', source: 'Kitchen close-down procedure · §3' },
  { name: 'The first commit', category: 'Tech onboarding', caption: 'Less guessing. More building.', short: 'Tech', title: 'From setup to first commit', document: 'Local development setup', code: 'ENGINEERING / 003', excerpt: 'Request repository access from your team lead. Configure your local environment using the approved setup guide. Run the test suite before opening your first pull request.', module: 'Your local environment, ready', quiz: 'Check your first-PR readiness', practice: 'Rehearse the first-commit workflow', question: 'What do I check before opening my first PR?', answer: 'Configure your local environment using the approved setup guide, then run the test suite before opening your first pull request.', source: 'Local development setup · §2' },
  { name: 'The support desk', category: 'Customer support', caption: 'A human answer. A clear next step.', short: 'Support', title: 'A confident first response', document: 'Customer escalation procedure', code: 'SUPPORT / 006', excerpt: 'Acknowledge the customer’s concern. Record the issue and the troubleshooting steps already taken. Pass unresolved account issues to the designated team lead.', module: 'Know when to bring in help', quiz: 'Choose the right escalation route', practice: 'Work through a sample customer case', question: 'Where should an unresolved account issue go?', answer: 'Record the issue and the troubleshooting steps already taken, then pass the unresolved account issue to the designated team lead.', source: 'Customer escalation procedure · §4' },
];

const ownerSteps = [
  ['Make it yours', 'Create a private workspace for the way your company works.'],
  ['Bring your SOPs', 'Add your documents. Start with samples if you need a hand.'],
  ['Invite the team', 'Share your workspace’s join code with your interns.'],
  ['Open the door', 'Review requests and approve the people who belong.'],
  ['Set the boundaries', 'Set up your assistant and keep its knowledge in your control.'],
];
const internSteps = [
  ['Use your code', 'Join the right workspace with the code your manager shared.'],
  ['Get approved', 'Your owner reviews your request before you get access.'],
  ['Learn by doing', 'Work through modules, take quizzes and try practice sandboxes.'],
  ['Ask, then trace', 'Ask the assistant a question and follow the citation to its source.'],
];

function ChapterArt({ kind }: { kind: number }) {
  return <svg className="fg-art" viewBox="0 0 280 160" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 0 ? <>
      <ellipse cx="139" cy="134" rx="98" ry="9" fill="currentColor" opacity=".07" stroke="none"/>
      <path d="M66 88h143l-13 41H80L66 88Z" fill="#f3d4a9"/><path d="M59 85h158M89 96l5 22m85-22-5 22M106 81v-8m24 8V69m25 12v-7m24 7v-9"/>
      <path d="M82 78c-6-21 10-22 4-39m46 27c-8-18 12-25 3-42m42 41c-7-17 11-24 5-36" opacity=".6"/>
      <path d="m205 90 30-23c8-5 13 3 7 9l-29 26M62 92l-18-9c-7-3-11 3-5 7l29 14"/>
      <path d="m42 126 25-46M39 123l6 4m-3-45 10-18m-5 20 10-18m-5 20 10-18M41 81c5 5 10 7 15 4M216 126l12-25m-8 9 10 4"/>
      <path d="m102 137 52 3 40-3" opacity=".5"/>
    </> : kind === 1 ? <>
      <ellipse cx="139" cy="136" rx="96" ry="8" fill="currentColor" opacity=".07" stroke="none"/>
      <path d="M64 31h145v95H64z" fill="#e7e9ee"/><path d="M70 37h133v81H70zM64 126l-21 12h185l-19-12M117 134h39"/>
      <path d="m112 66-15 13 15 12m48-25 15 13-15 12m-18-32-11 39" strokeWidth="2.5"/>
      <path d="M70 47h133m-125-5h2m5 0h2m5 0h2M219 103h24v28h-24zM243 107h7v13h-7M226 94c-6-9 7-11 1-19"/>
      <path d="M37 112V83m-8 8 8-8 8 8m-16 14 8-8 8 8M36 114h16"/>
    </> : <>
      <ellipse cx="143" cy="137" rx="94" ry="8" fill="currentColor" opacity=".07" stroke="none"/>
      <path d="M82 98V72a54 54 0 0 1 108 0v27" strokeWidth="7"/><path d="M82 61a55 55 0 0 1 108 0" stroke="#f7f2df" strokeWidth="2"/>
      <rect x="73" y="77" width="23" height="38" rx="8" fill="#f0edd9"/><rect x="175" y="77" width="23" height="38" rx="8" fill="#f0edd9"/>
      <path d="M185 114c0 17-16 17-39 17"/><rect x="131" y="127" width="21" height="8" rx="4" fill="currentColor"/>
      <path d="M113 65h43v29h-20l-11 10V94h-12V65Z" fill="#f0edd9"/><path d="M122 76h25m-25 7h17"/>
      <path d="m45 64 9 5m-6-22 8 8m159 13 10-5m-12-9 7-8M66 128l8-4"/>
    </>}
  </svg>;
}

function Brand() {
  return <a href="#" className="fg-brand" aria-label="Link homepage"><img src="/__mockup/images/link-hat.png" alt=""/><span>link</span></a>;
}

export function FieldGuide() {
  const [selected, setSelected] = useState(0);
  const [role, setRole] = useState<'owner' | 'intern'>('owner');
  const [citationOpen, setCitationOpen] = useState(false);
  const chapter = chapters[selected];
  const selectChapter = (index: number) => {
    setSelected(index);
    setCitationOpen(false);
    document.getElementById('fg-inside')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  };

  return <main className="fg">
    <div className="fg-wrap">
      <header className="fg-nav">
        <Brand/>
        <nav className="fg-navlinks" aria-label="Main navigation">
          <a className="fg-nav-extra" href="#fg-chapters">The field guides</a>
          <a className="fg-nav-extra" href="#fg-how">How it works</a>
          <a href="/sign-in">Sign in</a>
          <a href="/sign-up" className="fg-btn">Create a workspace <ArrowRight size={14}/></a>
        </nav>
      </header>

      <section className="fg-hero">
        <div className="fg-eyebrow fg-mono fg-enter">Company knowledge. Passed on properly.</div>
        <div className="fg-intro">
          <h1 className="fg-serif fg-enter">The way you work.<br/><em>A guide to learning it.</em></h1>
          <div className="fg-hero-copy fg-enter fg-delay">
            <p>From the kitchen line to the first line of code.<br/>Turn your company’s SOPs into training people can practise, ask about, and put to work.</p>
            <div className="fg-hero-actions">
              <a href="/sign-up" className="fg-btn">Create a workspace <ArrowRight size={14}/></a>
              <a className="fg-access" href="/sign-in">I already have access</a>
            </div>
          </div>
        </div>

        <div id="fg-chapters" className="fg-chapters fg-enter fg-delay-2">
          {chapters.map((item, index) => <button key={item.name} className="fg-chapter" onClick={() => selectChapter(index)} aria-label={`Explore ${item.category}`}>
            <div className="fg-chapter-top fg-mono"><span>Field guide / 0{index + 1}</span><ArrowRight size={15}/></div>
            <h2 className="fg-serif">{item.name}</h2>
            <p>{item.caption}</p>
            <ChapterArt kind={index}/>
            <div className="fg-chapter-bottom"><span>{item.category}</span><span>Open the chapter <ArrowRight size={11} style={{ display:'inline', marginLeft:5 }}/></span></div>
          </button>)}
        </div>
        <div className="fg-below">
          <span><BookOpen size={14}/>30 sample SOPs included. 10 for each domain.</span>
          <span>Your knowledge. Your team. Your way.</span>
        </div>
      </section>

      <section className="fg-section fg-reveal" id="fg-inside" style={{ scrollMarginTop:25 }}>
        <div className="fg-chapter-heading">
          <div><div className="fg-mono">01 — From the handbook to the hands-on</div><h2 className="fg-title fg-serif">A document is a start.<br/><em>Knowing what to do is the point.</em></h2></div>
          <p className="fg-smallcopy">Give the procedures you’ve already written a second life: as modules, quizzes and a place to practise.</p>
        </div>
        <div className="fg-tabs" role="tablist" aria-label="Training examples">
          {chapters.map((item,index) => <button role="tab" id={`fg-tab-${index}`} aria-controls="fg-training-panel" aria-selected={selected===index} key={item.short} onClick={() => { setSelected(index); setCitationOpen(false); }}>{item.category}</button>)}
        </div>
        <div className="fg-demo" id="fg-training-panel" role="tabpanel" aria-labelledby={`fg-tab-${selected}`}>
          <div className="fg-document">
            <div className="fg-document-header"><span className="fg-mono">Your source document</span><FileText size={18}/></div>
            <h3 className="fg-serif">{chapter.document}</h3>
            <div className="fg-mono">{chapter.code} · Sample SOP</div>
            <p><mark>{chapter.excerpt}</mark></p>
            <small>Illustrative excerpt. Use your own approved procedures.</small>
          </div>
          <div className="fg-training">
            <span className="fg-mono">Becomes a learning path <ArrowRight size={12} style={{ display:'inline', marginLeft:5 }}/></span>
            <h3 className="fg-serif">{chapter.title}</h3>
            <div className="fg-training-item"><BookOpen size={19}/><div><strong>{chapter.module}</strong><p>A focused, step-by-step learning module</p></div><span>Learn</span></div>
            <div className="fg-training-item"><ClipboardCheck size={19}/><div><strong>{chapter.quiz}</strong><p>A quiz to check what’s understood</p></div><span>Check</span></div>
            <div className="fg-training-item"><KeyRound size={19}/><div><strong>{chapter.practice}</strong><p>A sandbox to put knowledge into practice</p></div><span>Try</span></div>
            <p className="fg-note">Sample training path · shown for illustration</p>
          </div>
        </div>
      </section>

      <section className="fg-section fg-source-section fg-reveal" id="fg-assistant">
        <div className="fg-source-copy">
          <div className="fg-mono">02 — A mentor with a reference page</div>
          <h2 className="fg-title fg-serif">Not the internet’s answer.<br/><em>Your company’s answer.</em></h2>
          <p>The Link assistant answers only from your workspace’s documents, with citations back to the source SOP. So “how do we do this?” has a place to go—and an answer you can trace.</p>
          <div className="fg-rule"><ShieldCheck size={17}/>No source? No invented answer.</div>
        </div>
        <div className="fg-assistant">
          <div className="fg-assistant-head"><strong><MessageSquare size={16}/>Ask Link</strong><span className="fg-mono">Illustrative sample</span></div>
          <div className="fg-question">{chapter.question}</div>
          <div className="fg-mono">Link · Example grounded answer</div>
          <p className="fg-answer">{chapter.answer} <sup>[1]</sup></p>
          <button className="fg-citation" onClick={() => setCitationOpen(!citationOpen)} aria-expanded={citationOpen} aria-controls="fg-citation-excerpt"><FileText size={15}/><span>[1] {chapter.source}</span><ChevronDown size={14} style={{ transform:citationOpen?'rotate(180deg)':undefined }}/></button>
          {citationOpen && <div id="fg-citation-excerpt" className="fg-excerpt"><strong>Sample source excerpt</strong><br/>{chapter.excerpt}</div>}
          <p className="fg-note">Answers depend on the approved materials in your workspace.</p>
        </div>
      </section>
    </div>

    <section className="fg-journey" id="fg-how">
      <div className="fg-wrap fg-section fg-reveal">
        <div className="fg-chapter-heading">
          <div><div className="fg-mono">03 — A place for everyone. Boundaries for a reason.</div><h2 className="fg-title fg-serif">You know the way.<br/><em>Help them find their feet.</em></h2></div>
          <p className="fg-smallcopy">Owners shape the workspace.<br/>Interns get a clear path in.<br/>Your company’s knowledge stays in its own space.</p>
        </div>
        <div className="fg-roles" role="tablist" aria-label="Choose your workspace role"><button role="tab" aria-selected={role==='owner'} onClick={() => setRole('owner')}>For owners & team leads</button><button role="tab" aria-selected={role==='intern'} onClick={() => setRole('intern')}>For interns & new starters</button></div>
        <div className="fg-steps" style={role==='intern'?{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}:undefined}>
          {(role==='owner'?ownerSteps:internSteps).map(([title,body],index) => <article key={title}><span className="fg-step-number">{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
        <div className="fg-rule" style={{marginTop:32,paddingTop:22,borderTop:'1px solid var(--line)'}}><LockKeyhole size={14}/>Private by workspace. Access approved by you.</div>
      </div>
    </section>

    <div className="fg-wrap">
      <section className="fg-closing fg-reveal">
        <div className="fg-mono">Less “read the binder.” More “I’ve got this.”</div>
        <h2 className="fg-serif">Make what you know<br/><em>something they can learn.</em></h2>
        <p>Bring your own SOPs, or find your starting point in 30 included samples.</p>
        <a href="/sign-up" className="fg-btn">Create your workspace <ArrowRight size={15}/></a>
        <div className="fg-rule" style={{justifyContent:'center', marginTop:20,fontSize:10}}><Check size={12}/>Your documents. Your standards. A better first day.</div>
      </section>
      <footer className="fg-footer"><Brand/><p>A field guide to the way you work.</p><p>Link · Company knowledge, made useful. <a href="#fg-chapters" aria-label="Back to field guides" style={{ marginLeft:20 }}>Back to the guides <ArrowDown size={11} style={{display:'inline',transform:'rotate(180deg)'}}/></a></p></footer>
    </div>
  </main>;
}

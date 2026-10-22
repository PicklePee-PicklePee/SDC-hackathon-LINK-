import { useEffect, useRef } from 'react'

export function WorkerLogs({ logs }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [logs])
  return <div ref={ref} aria-label="Live worker log" className="max-h-52 overflow-auto rounded-xl bg-[#101613] p-4 font-mono text-[10px] leading-6 text-[#c5d0c9]">
    {logs.map((line, i) => <div key={i}><span className="mr-3 text-[#65756b]">{String(i + 1).padStart(2, '0')}</span>{line}</div>)}
  </div>
}

export function LossCurve({ history }) {
  const values = history.filter(p => Number.isFinite(p.step) && Number.isFinite(p.loss))
  if (!values.length) return null
  const minStep = Math.min(...values.map(p => p.step))
  const maxStep = Math.max(...values.map(p => p.step))
  const minLoss = Math.min(...values.map(p => p.loss))
  const maxLoss = Math.max(...values.map(p => p.loss))
  const padding = Math.max((maxLoss - minLoss) * 0.15, 0.01)
  const low = Math.max(0, minLoss - padding), high = maxLoss + padding
  const x = p => 48 + (p.step - minStep) / (maxStep - minStep || 1) * 374
  const y = p => 130 - (p.loss - low) / (high - low) * 104
  return <div className="mt-4">
    <div className="text-[10px] font-bold muted">Training loss · reported worker samples</div>
    <svg viewBox="0 0 450 166" role="img" aria-label={`Training loss by step, ${values.length} reported samples`} className="mt-2 w-full owner-color">
      <path d="M48 20V130H428" fill="none" stroke="currentColor" opacity=".25" />
      <text x="3" y="30" fill="currentColor" fontSize="10">{high.toFixed(3)}</text>
      <text x="3" y="130" fill="currentColor" fontSize="10">{low.toFixed(3)}</text>
      <text x="48" y="150" fill="currentColor" fontSize="10">{minStep}</text>
      <text x="405" y="150" fill="currentColor" fontSize="10">{maxStep}</text>
      <text x="210" y="163" fill="currentColor" fontSize="10">Training step</text>
      <polyline points={values.map(p => `${x(p)},${y(p)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
      {values.length < 10 && values.map((p, i) => <circle key={i} cx={x(p)} cy={y(p)} r="2.5" fill="currentColor"><title>Step {p.step}: loss {p.loss}</title></circle>)}
    </svg>
  </div>
}

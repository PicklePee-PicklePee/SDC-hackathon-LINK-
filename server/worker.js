import { serverlessHealth, serverlessRequest } from './runpod-serverless.js'

export function workerMode() {
  return process.env.RUNPOD_WORKER_MODE || 'pod'
}
export function workerConfigured() {
  return Boolean(process.env.RUNPOD_WORKER_URL && (workerMode() === 'serverless' ? process.env.RUNPOD_API_KEY : process.env.RUNPOD_WORKER_TOKEN))
}
export async function workerRequest(path, body, timeout = 30000) {
  if (!workerConfigured()) {
    const err = new Error('RunPod worker is not connected. Configure RUNPOD_WORKER_URL and the access secret: RUNPOD_API_KEY for Serverless, or RUNPOD_WORKER_TOKEN for a Pod. See the setup guide.')
    err.status = 503; throw err
  }
  if (workerMode() === 'serverless') return serverlessRequest(path, body, timeout)
  if (workerMode() !== 'pod') throw Object.assign(new Error('RUNPOD_WORKER_MODE must be pod or serverless.'), { status: 503 })
  let base
  try { base = new URL(process.env.RUNPOD_WORKER_URL) }
  catch { throw Object.assign(new Error('Set a valid HTTPS worker service URL.'), { status: 503 }) }
  if (base.protocol !== 'https:') throw Object.assign(new Error('RunPod worker URL must use HTTPS.'), { status: 503 })
  try {
    const response = await fetch(`${base.href.replace(/\/$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${process.env.RUNPOD_WORKER_TOKEN}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
    const data = await response.json()
    if (!response.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : 'Worker rejected the operation.'
      throw Object.assign(new Error(detail.slice(0, 500)), { status: response.status === 401 ? 503 : response.status })
    }
    return data
  } catch (error) {
    if (error.status) throw error
    throw Object.assign(new Error('The RunPod worker is unreachable or timed out. Check the running Pod and its exposed HTTPS service.'), { status: 503 })
  }
}
export async function connection({ verify = false } = {}) {
  const info = { configured: workerConfigured(), connected: false, verified: false, mode: workerMode(), workerUrl: process.env.RUNPOD_WORKER_URL || null, health: null, error: null, setupGuide: '/docs/runpod-setup.md' }
  if (!info.configured) { info.error = 'Worker URL and access token have not been configured on the server.'; return info }
  try {
    info.health = workerMode() === 'serverless' && !verify
      ? await serverlessHealth()
      : await workerRequest('/health', undefined, workerMode() === 'serverless' ? 120000 : 10000)
    info.connected = ['ready', 'endpoint-reachable'].includes(info.health.status)
    info.verified = info.health.status === 'ready'
  }
  catch (error) { info.error = error.message }
  return info
}

export function workerConfigured() {
  return Boolean(process.env.RUNPOD_WORKER_URL && process.env.RUNPOD_WORKER_TOKEN)
}
export async function workerRequest(path, body, timeout = 30000) {
  if (!workerConfigured()) {
    const err = new Error('RunPod worker is not connected. Install the Pod worker and configure RUNPOD_WORKER_URL and RUNPOD_WORKER_TOKEN in server secrets.')
    err.status = 503; throw err
  }
  const base = new URL(process.env.RUNPOD_WORKER_URL)
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
export async function connection() {
  const info = { configured: workerConfigured(), connected: false, workerUrl: process.env.RUNPOD_WORKER_URL || null, health: null, error: null, setupGuide: '/docs/runpod-setup.md' }
  if (!info.configured) { info.error = 'Worker URL and access token have not been configured on the server.'; return info }
  try { info.health = await workerRequest('/health', undefined, 10000); info.connected = info.health.status === 'ready' }
  catch (error) { info.error = error.message }
  return info
}

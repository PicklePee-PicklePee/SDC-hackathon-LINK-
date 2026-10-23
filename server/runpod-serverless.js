const protocol = 'link-worker-v1'
const fail = (status, message) => Object.assign(new Error(message), { status })

export function serverlessBase(value) {
  let url
  try { url = new URL(value) } catch { throw fail(503, 'Set a valid RunPod Serverless endpoint URL.') }
  if (url.origin !== 'https://api.runpod.ai' || url.username || url.password || url.search || url.hash ||
      !/^\/v2\/[a-zA-Z0-9_-]+(?:\/(?:run|runsync))?\/?$/.test(url.pathname)) {
    throw fail(503, 'Use https://api.runpod.ai/v2/ENDPOINT_ID for the custom Link Serverless worker, not an Ollama worker.')
  }
  return `${url.origin}${url.pathname.replace(/\/(?:run|runsync)\/?$/, '').replace(/\/$/, '')}`
}

async function request(path, body, timeout = 30000) {
  const base = serverlessBase(process.env.RUNPOD_WORKER_URL)
  if (!process.env.RUNPOD_API_KEY) throw fail(503, 'RunPod Serverless requires RUNPOD_API_KEY in server secrets.')
  try {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
      redirect: 'error',
    })
    if (!response.ok) {
      // Do not echo provider bodies: they may contain request data or credentials.
      throw fail(response.status === 401 || response.status === 403 ? 503 : response.status,
        `RunPod API returned HTTP ${response.status}. Check endpoint access and configuration. No job submission is retried automatically.`)
    }
    return await response.json()
  } catch (error) {
    if (error.status) throw error
    throw fail(503, 'RunPod did not return a usable response. A submitted request may still be running; check RunPod Requests before submitting again.')
  }
}

function output(data, workspaceId) {
  const result = data.output
  if (result?.protocol !== protocol || (workspaceId && result.workspaceId !== workspaceId) || !result.data) {
    throw fail(502, 'Endpoint did not return the custom Link worker protocol or matching workspace. Replace the Ollama template with the Link worker image.')
  }
  return result.data
}

async function cancelInteractive(id) {
  try {
    await request(`/cancel/${encodeURIComponent(id)}`, {}, 5000)
    return 'Cancellation was requested.'
  } catch {
    return 'Cancellation was attempted but could not be confirmed.'
  }
}

export async function serverlessHealth() {
  const health = await request('/health', undefined, 10000)
  if (!health.workers || !health.jobs) throw fail(502, 'RunPod endpoint returned an invalid health response.')
  return { status: 'endpoint-reachable', workers: health.workers, jobs: health.jobs,
    gpu: null, capabilities: [], warning: 'API authentication succeeded. The custom worker, CUDA, and models are NOT verified. GPU verification is a separate billable request.' }
}

export async function serverlessRequest(path, body, timeout = 30000) {
  if (path === '/jobs') {
    const payload = { input: { operation: body.action, ...body }, policy: { executionTimeout: 3600000, ttl: 86400000 } }
    if (Buffer.byteLength(JSON.stringify(payload)) > 9500000) throw fail(413, 'Serverless job payload exceeds the safe 9.5 MB request limit.')
    const result = await request('/run', payload)
    if (typeof result.id !== 'string') throw fail(502, 'RunPod did not return a job ID. Check RunPod Requests before submitting again.')
    return { id: result.id, workspaceId: body.workspaceId, action: body.action, status: 'IN_QUEUE',
      logs: [], lossHistory: [], gpu: null, epoch: null, loss: null }
  }
  if (path.startsWith('/jobs/')) {
    const url = new URL(path, 'https://link.invalid')
    const id = decodeURIComponent(url.pathname.slice('/jobs/'.length))
    const wid = url.searchParams.get('workspaceId')
    const result = await request(`/status/${encodeURIComponent(id)}`)
    let progress = result.output
    if (typeof progress === 'string') { try { progress = JSON.parse(progress) } catch { progress = null } }
    const snapshot = progress?.protocol === protocol && progress.workspaceId === wid ? progress.data : {}
    if (result.status === 'COMPLETED') {
      const completed = output(result, wid)
      if (completed.workerError) return { id, status: 'FAILED', error: completed.workerError }
      if (!['COMPLETED', 'FAILED'].includes(completed.status)) throw fail(502, 'Custom worker returned an invalid terminal job state.')
      return { ...completed, id }
    }
    if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(result.status)) {
      return { ...snapshot, id, status: 'FAILED', error: `RunPod job ${result.status}. Inspect worker logs for details.`,
        elapsedSeconds: Number.isFinite(result.executionTime) ? result.executionTime / 1000 : null }
    }
    if (!['IN_QUEUE', 'IN_PROGRESS'].includes(result.status)) throw fail(502, 'RunPod returned an unknown job state.')
    return { ...snapshot, id, status: result.status,
      elapsedSeconds: snapshot.elapsedSeconds ?? (Number.isFinite(result.executionTime) ? result.executionTime / 1000 : null) }
  }
  const operation = { '/health': 'health', '/search': 'search', '/chat': 'chat' }[path]
  if (!operation) throw fail(400, 'Unsupported Serverless worker operation.')
  // Interactive operations are also billable jobs. Submit once; only poll the returned ID.
  const started = await request('/run', { input: { ...body, operation },
    policy: { executionTimeout: 120000, ttl: 300000 } })
  if (typeof started.id !== 'string') throw fail(502, 'RunPod did not return a job ID. Check RunPod Requests before submitting again.')
  const deadline = Date.now() + timeout
  let result = started
  try {
    while (['IN_QUEUE', 'IN_PROGRESS'].includes(result.status) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, Math.min(1500, deadline - Date.now())))
      const remaining = deadline - Date.now()
      if (remaining <= 0) break
      result = await request(`/status/${encodeURIComponent(started.id)}`, undefined, Math.min(10000, remaining))
    }
  } catch (error) {
    const cancellation = await cancelInteractive(started.id)
    throw fail(error.status || 503,
      `RunPod ${operation} request ${started.id} could not be monitored. ${cancellation} Check RunPod Requests before retrying; the job may still be running.`)
  }
  if (result.status === 'COMPLETED') {
    const data = output(result, body?.workspaceId)
    if (data.workerError) throw fail(data.statusCode || 502, data.workerError)
    return data
  }
  if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(result.status)) throw fail(502, `RunPod ${operation} job ${result.status}. Inspect the worker logs.`)
  // Best effort cancellation, never re-submit on a timeout.
  const cancellation = await cancelInteractive(started.id)
  throw fail(504, `RunPod request ${started.id} exceeded the wait limit. ${cancellation} Check RunPod Requests before retrying.`)
}

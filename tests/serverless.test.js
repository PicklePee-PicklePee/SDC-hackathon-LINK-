import test from 'node:test'
import assert from 'node:assert/strict'
import { serverlessBase, serverlessRequest } from '../server/runpod-serverless.js'
import { connection, workerRequest } from '../server/worker.js'

const wid = '00000000-0000-4000-8000-000000000001'
const wrapped = data => ({ protocol: 'link-worker-v1', workspaceId: wid, data })
let calls
const originalFetch = global.fetch
test.beforeEach(() => {
  process.env.RUNPOD_WORKER_MODE = 'serverless'
  process.env.RUNPOD_WORKER_URL = 'https://api.runpod.ai/v2/test-endpoint/run'
  process.env.RUNPOD_API_KEY = 'synthetic-test-only-not-a-real-key'
  calls = []
})
test.afterEach(() => { global.fetch = originalFetch })
function respond(callback) {
  global.fetch = async (url, options) => {
    calls.push({ url, ...options, payload: options.body ? JSON.parse(options.body) : null })
    const value = callback(calls.at(-1))
    return { ok: true, status: 200, json: async () => value }
  }
}
test('Serverless URL validation normalizes submission URLs and rejects credential-bearing or unrelated URLs', () => {
  assert.equal(serverlessBase('https://api.runpod.ai/v2/example/runsync/'), 'https://api.runpod.ai/v2/example')
  for (const url of ['not a url', 'http://api.runpod.ai/v2/x', 'https://evil.invalid/v2/x', 'https://api.runpod.ai/v2/x?key=secret', 'https://user:pass@api.runpod.ai/v2/x']) {
    assert.throws(() => serverlessBase(url), /URL|Use https/)
  }
})
test('Automatic connection checks only GET provider health and never claim GPU verification', async () => {
  respond(() => ({ workers: { idle: 0 }, jobs: { inQueue: 0 } }))
  const result = await connection()
  assert.equal(result.connected, true)
  assert.equal(result.verified, false)
  assert.equal(result.health.gpu, null)
  assert.match(result.health.warning, /NOT verified/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].url, 'https://api.runpod.ai/v2/test-endpoint/health')
  assert.equal(calls[0].headers.Authorization, 'Bearer synthetic-test-only-not-a-real-key')
})
test('Indexing submits once with the custom operation and explicit timeout policy', async () => {
  respond(() => ({ id: 'provider-job-1', status: 'IN_QUEUE' }))
  const result = await workerRequest('/jobs', { action: 'index', workspaceId: wid, documents: [] })
  assert.equal(result.id, 'provider-job-1')
  assert.equal(result.gpu, null)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].payload.input.operation, 'index')
  assert.equal(calls[0].payload.policy.executionTimeout, 3600000)
  assert.match(calls[0].url, /\/run$/)
})
test('Progress telemetry and final chunk counts are read without submitting new compute', async () => {
  respond(() => ({ status: 'IN_PROGRESS', output: JSON.stringify(wrapped({ loss: 1.25, epoch: 1, logs: ['real log'] })) }))
  const progress = await serverlessRequest(`/jobs/remote-id?workspaceId=${wid}`)
  assert.equal(progress.loss, 1.25)
  assert.deepEqual(progress.logs, ['real log'])
  respond(() => ({ status: 'COMPLETED', output: wrapped({ status: 'COMPLETED', chunkCounts: { doc: 3 } }) }))
  const result = await serverlessRequest(`/jobs/remote-id?workspaceId=${wid}`)
  assert.deepEqual(result.chunkCounts, { doc: 3 })
  assert.ok(calls.every(c => c.method === 'GET'))
})
test('Mismatched workspace outputs and Ollama outputs are rejected', async () => {
  for (const output of [{ message: { content: 'Ollama answer' } }, { ...wrapped({ status: 'COMPLETED' }), workspaceId: 'another-tenant' }]) {
    respond(() => ({ status: 'COMPLETED', output }))
    await assert.rejects(serverlessRequest(`/jobs/remote?workspaceId=${wid}`), /protocol or matching workspace/)
  }
})
test('Provider terminal failures and custom validation failures do not become successes', async () => {
  for (const status of ['FAILED', 'TIMED_OUT', 'CANCELLED']) {
    respond(() => ({ status, executionTime: 1234 }))
    const result = await serverlessRequest(`/jobs/remote?workspaceId=${wid}`)
    assert.equal(result.status, 'FAILED')
    assert.match(result.error, new RegExp(status))
  }
  respond(() => ({ status: 'COMPLETED', output: wrapped({ workerError: 'Volume missing', statusCode: 503 }) }))
  assert.equal((await serverlessRequest(`/jobs/remote?workspaceId=${wid}`)).status, 'FAILED')
})
test('Search forwards exact revision filters and validates the returned protocol', async () => {
  respond(() => ({ id: 'search-job', status: 'COMPLETED', output: wrapped({ matches: [] }) }))
  const documents = [{ id: 'doc', revision: 2 }]
  assert.deepEqual(await serverlessRequest('/search', { workspaceId: wid, query: 'Test', documents }), { matches: [] })
  assert.deepEqual(calls[0].payload.input.documents, documents)
  assert.equal(calls[0].payload.input.operation, 'search')
})
test('Cited chat uses the custom protocol and preserves the document fingerprint inputs', async () => {
  const answer = { answer: 'Follow the SOP [1].', citations: [{ datasetId: 'doc', revision: 2, score: 0.8, text: 'SOP' }] }
  respond(() => ({ id: 'chat-job', status: 'COMPLETED', output: wrapped(answer) }))
  const documents = [{ id: 'doc', revision: 2 }]
  assert.deepEqual(await serverlessRequest('/chat', { workspaceId: wid, documents, allDocuments: documents, question: 'How?' }), answer)
  assert.deepEqual(calls[0].payload.input.allDocuments, documents)
})
test('Billable diagnostic explicitly submits the custom health operation', async () => {
  respond(() => ({ id: 'diagnostic', status: 'COMPLETED', output: { protocol: 'link-worker-v1', workspaceId: null, data: { status: 'ready', gpu: { name: 'Synthetic GPU fixture' } } } }))
  const result = await connection({ verify: true })
  assert.equal(result.verified, true)
  assert.equal(calls[0].payload.input.operation, 'health')
})
test('Network and authentication errors never retry submissions or echo provider secrets', async () => {
  let attempts = 0
  global.fetch = async () => { attempts++; throw new Error('private data') }
  await assert.rejects(serverlessRequest('/jobs', { action: 'pipeline', workspaceId: wid }), /may still be running/)
  assert.equal(attempts, 1)
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ detail: 'private key' }) })
  await assert.rejects(serverlessRequest('/jobs', { action: 'index', workspaceId: wid }), error => error.status === 503 && !error.message.includes('private key'))
})

test('Interactive polling failures cancel the accepted job once and preserve its ID', async () => {
  respond(call => {
    if (call.url.endsWith('/run')) return { id: 'accepted-diagnostic', status: 'IN_QUEUE' }
    if (call.url.includes('/status/')) throw new Error('private transport details')
    assert.ok(call.url.endsWith('/cancel/accepted-diagnostic'))
    return { id: 'accepted-diagnostic', status: 'CANCELLED' }
  })
  await assert.rejects(serverlessRequest('/health'), error => {
    assert.equal(error.status, 503)
    assert.match(error.message, /accepted-diagnostic/)
    assert.match(error.message, /Cancellation was requested/)
    assert.ok(!error.message.includes('private transport details'))
    return true
  })
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), [
    '/v2/test-endpoint/run',
    '/v2/test-endpoint/status/accepted-diagnostic',
    '/v2/test-endpoint/cancel/accepted-diagnostic',
  ])
})

test('Failed cancellation after an interactive polling error remains explicitly unconfirmed', async () => {
  respond(call => {
    if (call.url.endsWith('/run')) return { id: 'unconfirmed-job', status: 'IN_QUEUE' }
    throw new Error('unavailable')
  })
  await assert.rejects(serverlessRequest('/chat', { workspaceId: wid }), error =>
    error.status === 503 && /unconfirmed-job/.test(error.message) &&
    /could not be confirmed/.test(error.message) && /may still be running/.test(error.message))
  assert.equal(calls.filter(call => call.url.endsWith('/run')).length, 1)
  assert.equal(calls.filter(call => call.url.endsWith('/cancel/unconfirmed-job')).length, 1)
})

test('An expired interactive wait cancels without starting a last-millisecond status request', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 })
  respond(call => {
    if (call.url.endsWith('/run')) return { id: 'expired-diagnostic', status: 'IN_QUEUE' }
    assert.ok(call.url.endsWith('/cancel/expired-diagnostic'))
    return { id: 'expired-diagnostic', status: 'CANCELLED' }
  })
  const rejected = assert.rejects(serverlessRequest('/health', undefined, 1000), error =>
    error.status === 504 && /expired-diagnostic/.test(error.message) &&
    /Cancellation was requested/.test(error.message))
  await new Promise(resolve => setImmediate(resolve))
  t.mock.timers.tick(1000)
  await rejected
  assert.equal(calls.length, 2)
  assert.ok(calls.every(call => call.method === 'POST'))
})

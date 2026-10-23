import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { api } from '../server/api.js'
import { pool, query } from '../server/db.js'
import { DOMAINS, sampleDocuments, quizzes, gradeSandbox } from '../server/content.js'

// Identity fixtures exist only in this isolated test listener, never the application.
const prefix = `link-test-${randomUUID()}`
const users = { owner: `${prefix}-owner`, member: `${prefix}-member`, outsider: `${prefix}-outsider` }
const workspaceIds = []
let server, base
async function call(user, path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' }
  if (user) headers['X-Test-Identity'] = users[user]
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, data: await response.json() }
}
test.before(async () => {
  // Explicitly disable real GPU connections in this process. Tests must not incur compute.
  process.env.RUNPOD_WORKER_URL = ''
  process.env.RUNPOD_WORKER_TOKEN = ''
  process.env.RUNPOD_API_KEY = ''
  process.env.RUNPOD_WORKER_MODE = 'pod'
  for (const [name, id] of Object.entries(users)) await query('INSERT INTO link_users(id,name,email) VALUES($1,$2,$3)', [id, `Test ${name}`, `${name}@example.invalid`])
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const id = req.get('X-Test-Identity')
    req.auth = Object.assign(() => ({ userId: Object.values(users).includes(id) ? id : null, tokenType: 'session_token' }), { [Symbol.for('@clerk/express.auth')]: true })
    next()
  })
  app.use(api)
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }))
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
test.after(async () => {
  await new Promise(resolve => server?.close(resolve))
  // Clean up synthetic activity without touching real workspaces.
  for (const wid of workspaceIds) await query('DELETE FROM link_workspaces WHERE id=$1', [wid])
  for (const id of Object.values(users)) await query('DELETE FROM link_users WHERE id=$1', [id])
  await pool.end()
})
let wid, code, other
test('Unauthenticated API access is rejected', async () => {
  assert.equal((await call(null, '/me')).status, 401)
})
test('Creating a workspace persists an owner and 30 labeled SOPs', async () => {
  const result = await call('owner', '/workspaces', 'POST', { name: 'Synthetic training workspace', seedSamples: true })
  assert.equal(result.status, 201)
  wid = result.data.id; workspaceIds.push(wid)
  const bootstrap = await call('owner', `/w/${wid}/bootstrap`)
  assert.equal(bootstrap.data.role, 'owner')
  assert.equal(bootstrap.data.stats.documents, 30)
  assert.equal(bootstrap.data.stats.members, 1)
  code = bootstrap.data.workspace.joinCode
  assert.ok(code.length >= 24)
  for (const domain of DOMAINS) {
    const docs = await call('owner', `/w/${wid}/datasets?domain=${domain}`)
    assert.equal(docs.data.length, 10)
    assert.ok(docs.data.every(d => d.sample && d.text.includes('SAMPLE') && d.status === 'pending'))
  }
})
test('Other users cannot access a workspace or escalate by creating their own', async () => {
  assert.equal((await call('outsider', `/w/${wid}/bootstrap`)).status, 403)
  const created = await call('outsider', '/workspaces', 'POST', { name: 'Separate synthetic tenant', seedSamples: false })
  assert.equal(created.status, 201); other = created.data.id; workspaceIds.push(other)
  assert.equal((await call('outsider', `/w/${wid}/datasets`)).status, 403)
  assert.equal((await call('owner', `/w/${other}/datasets`)).status, 403)
})
test('Membership stays pending until owner approval, then is member-only', async () => {
  assert.equal((await call('member', '/requests', 'POST', { code: 'nonexistent' })).status, 404)
  assert.equal((await call('member', '/requests', 'POST', { code })).status, 200)
  assert.equal((await call('member', `/w/${wid}/modules`)).status, 403)
  const members = await call('owner', `/w/${wid}/members`)
  assert.equal(members.data.find(m => m.id === users.member).status, 'pending')
  assert.equal((await call('owner', `/w/${wid}/members/${users.member}`, 'PATCH', { status: 'approved' })).status, 200)
  const bootstrap = await call('member', `/w/${wid}/bootstrap`)
  assert.equal(bootstrap.data.role, 'member')
  assert.equal(bootstrap.data.workspace.joinCode, undefined)
  assert.equal(bootstrap.data.workspace.systemPrompt, undefined)
  for (const path of ['datasets', 'members', 'connection', 'jobs']) assert.equal((await call('member', `/w/${wid}/${path}`)).status, 403)
  assert.equal((await call('member', `/w/${wid}/settings`, 'PATCH', { systemPrompt: 'Unauthorized change', temperature: 0 })).status, 403)
  assert.equal((await call('owner', `/w/${wid}/members/${users.owner}`, 'PATCH', { status: 'rejected' })).status, 404)
})
test('Dataset create/edit/delete is persisted, tenant-scoped, and revisioned', async () => {
  const created = await call('owner', `/w/${wid}/datasets`, 'POST', { title: 'Test procedure', domain: 'technology', text: 'This is a synthetic procedure for testing document persistence.' })
  assert.equal(created.status, 201)
  const id = created.data.id
  assert.equal(created.data.revision, 1)
  assert.equal((await call('outsider', `/w/${other}/datasets/${id}`, 'PATCH', { title: 'Forbidden', domain: 'technology', text: 'Unauthorized tenant update attempt.' })).status, 404)
  const updated = await call('owner', `/w/${wid}/datasets/${id}`, 'PATCH', { title: 'Updated procedure', domain: 'technology', text: 'Revised synthetic procedure with an additional validation step.' })
  assert.equal(updated.data.revision, 2)
  assert.equal(updated.data.status, 'pending')
  assert.equal((await call('owner', `/w/${wid}/datasets`, 'POST', { title: 'Bad', domain: 'unknown', text: 'Invalid domain content.' })).status, 400)
  assert.equal((await call('owner', `/w/${wid}/datasets/${id}`, 'DELETE')).status, 200)
  assert.equal((await call('owner', `/w/${wid}/datasets/${id}`, 'DELETE')).status, 404)
})
test('Guardrails persist and enforce numeric limits', async () => {
  assert.equal((await call('owner', `/w/${wid}/settings`, 'PATCH', { systemPrompt: 'Answer only from current company context.', temperature: 0.4 })).status, 200)
  assert.equal((await call('owner', `/w/${wid}/bootstrap`)).data.workspace.temperature, 0.4)
  assert.equal((await call('owner', `/w/${wid}/settings`, 'PATCH', { systemPrompt: 'Answer from approved company context.', temperature: 2 })).status, 400)
})
test('Sequential modules cannot be completed out of order and progress is user-scoped', async () => {
  const path = `/w/${wid}`
  const before = await call('member', `${path}/modules?domain=technology`)
  assert.deepEqual(before.data.map(m => m.status), ['in-progress', 'locked', 'locked'])
  assert.equal((await call('member', `${path}/modules/technology-2/complete`, 'POST')).status, 409)
  assert.equal((await call('member', `${path}/modules/technology-1/complete`, 'POST')).status, 200)
  const after = await call('member', `${path}/modules?domain=technology`)
  assert.deepEqual(after.data.map(m => m.status), ['completed', 'in-progress', 'locked'])
  const owner = await call('owner', `${path}/modules?domain=technology`)
  assert.equal(owner.data[0].status, 'in-progress')
})
test('Quiz answers are hidden before submission, graded on server, and recorded in analytics', async () => {
  const quiz = await call('member', `/w/${wid}/quiz?domain=culinary`)
  assert.equal(quiz.data.questions.length, 5)
  assert.ok(quiz.data.questions.every(q => q.correct === undefined && q.explanation === undefined))
  assert.equal((await call('member', `/w/${wid}/quiz`, 'POST', { domain: 'culinary', answers: [0] })).status, 400)
  const answer = await call('member', `/w/${wid}/quiz`, 'POST', { domain: 'culinary', answers: quizzes.culinary.map(q => q.correct) })
  assert.equal(answer.data.score, 100)
  assert.equal(answer.data.results.length, 5)
  const team = await call('owner', `/w/${wid}/members`)
  const learner = team.data.find(m => m.id === users.member)
  assert.equal(learner.quizScore, 100)
  assert.equal(learner.modulesCompleted, 1)
  assert.equal(learner.groundingMatch, null)
})
test('All domain sandboxes validate realistic sample gates and reject malformed inputs', async () => {
  for (const domain of DOMAINS) {
    const config = await call('member', `/w/${wid}/sandbox?domain=${domain}`)
    const values = Object.fromEntries(config.data.fields.map(f => [f.key, f.value]))
    const score = await call('member', `/w/${wid}/sandbox`, 'POST', { domain, values })
    assert.equal(score.data.score, 100)
    assert.equal((await call('member', `/w/${wid}/sandbox`, 'POST', { domain, values: {} })).status, 400)
  }
  assert.ok(gradeSandbox('technology', { coverage: 20, lines: 1000, approvals: 0, critical: 5 }).corrections.length === 4)
})
test('Disconnected GPU explicitly fails and does not invent jobs, answers, or vector matches', async () => {
  const connection = await call('owner', `/w/${wid}/connection`)
  assert.equal(connection.data.configured, false)
  assert.equal(connection.data.connected, false)
  assert.equal(connection.data.health, null)
  for (const [route, body, user] of [
    ['jobs', { action: 'pipeline', computeApproved: true }, 'owner'],
    ['search', { query: 'How much salt?' }, 'owner'],
    ['chat', { message: 'How much salt?', domain: 'culinary' }, 'member'],
  ]) {
    const result = await call(user, `/w/${wid}/${route}`, 'POST', body)
    assert.equal(result.status, 503)
    assert.match(result.data.error, /not connected/)
  }
  assert.equal((await call('owner', `/w/${wid}/jobs`)).data.length, 0)
  assert.equal((await call('member', `/w/${wid}/chat?domain=culinary`)).data.length, 0)
})
test('Indexing and training require explicit compute approval on the server', async () => {
  for (const action of ['index', 'pipeline']) {
    const result = await call('owner', `/w/${wid}/jobs`, 'POST', { action })
    assert.equal(result.status, 400)
    assert.match(result.data.error, /approval/)
  }
})
test('Sample corpus contains exactly 10 distinct SOPs per domain', () => {
  assert.equal(sampleDocuments.length, 30)
  assert.equal(new Set(sampleDocuments.map(d => d.title)).size, 30)
  for (const d of DOMAINS) assert.equal(sampleDocuments.filter(doc => doc.domain === d).length, 10)
})
test('Synthetic Serverless lifecycle persists telemetry and filters stale citations, including edits during generation', async () => {
  // Transport fixtures only: this test never calls RunPod or claims GPU execution.
  const originalFetch = global.fetch
  const executions = new Map()
  let matches = [], editDuringChat = false, docId
  process.env.RUNPOD_WORKER_MODE = 'serverless'
  process.env.RUNPOD_WORKER_URL = 'https://api.runpod.ai/v2/synthetic-endpoint'
  process.env.RUNPOD_API_KEY = 'synthetic-test-key'
  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://api.runpod.ai/')) return originalFetch(url, options)
    let result
    const input = options.body ? JSON.parse(options.body).input : null
    const wrap = data => ({ protocol: 'link-worker-v1', workspaceId: wid, data })
    if (input?.operation === 'index' || input?.operation === 'pipeline') {
      const id = randomUUID()
      executions.set(id, wrap({
        status: input.operation === 'pipeline' ? 'FAILED' : 'COMPLETED',
        indexed: true, chunkCounts: Object.fromEntries(input.documents.map(d => [d.id, 1])),
        logs: ['Synthetic transport fixture'], lossHistory: [{ step: 1, loss: 1.1 }],
        error: input.operation === 'pipeline' ? 'Synthetic controlled training failure' : null,
      }))
      result = { id, status: 'IN_QUEUE' }
    } else if (String(url).includes('/status/')) {
      result = { status: 'COMPLETED', output: executions.get(String(url).split('/').at(-1)) }
    } else if (input?.operation === 'search') {
      result = { id: 'search-fixture', status: 'COMPLETED', output: wrap({ matches }) }
    } else if (input?.operation === 'chat') {
      if (editDuringChat) await query('UPDATE link_datasets SET revision=revision+1 WHERE id=$1', [docId])
      result = { id: 'chat-fixture', status: 'COMPLETED', output: wrap({ answer: 'Fixture answer [1].', citations: matches }) }
    } else {
      throw new Error('Unexpected request in synthetic Serverless test')
    }
    return { ok: true, status: 200, json: async () => result }
  }
  try {
    const doc = await call('owner', `/w/${wid}/datasets`, 'POST', { title: 'Synthetic source', domain: 'technology', text: 'SAMPLE: Validate the release before deployment.' })
    docId = doc.data.id
    const started = await call('owner', `/w/${wid}/jobs`, 'POST', { action: 'index', computeApproved: true })
    assert.equal(started.status, 202)
    const jobs = await call('owner', `/w/${wid}/jobs`)
    assert.equal(jobs.data[0].status, 'COMPLETED')
    assert.equal(jobs.data[0].lossHistory[0].loss, 1.1)
    assert.equal((await call('owner', `/w/${wid}/datasets?domain=technology`)).data.find(d => d.id === docId).status, 'indexed')
    matches = [{ datasetId: docId, title: 'Synthetic source', revision: 1, score: 0.9, text: 'SAMPLE release validation.' },
      { datasetId: randomUUID(), title: 'Other tenant', revision: 1, score: 0.9, text: 'Must be excluded' }]
    assert.equal((await call('owner', `/w/${wid}/search`, 'POST', { query: 'Validate' })).data.matches.length, 1)
    const answer = await call('member', `/w/${wid}/chat`, 'POST', { message: 'Validate?', domain: 'technology' })
    assert.equal(answer.data.citations.length, 1)
    assert.equal(answer.data.answer, 'Fixture answer [1].')
    await call('owner', `/w/${wid}/datasets/${docId}`, 'PATCH', { title: 'Synthetic source', domain: 'technology', text: 'SAMPLE revised validation procedure.' })
    assert.equal((await call('owner', `/w/${wid}/search`, 'POST', { query: 'Validate' })).data.matches.length, 0)
    const staleAnswer = await call('member', `/w/${wid}/chat`, 'POST', { message: 'Validate?', domain: 'technology' })
    assert.deepEqual(staleAnswer.data.citations, [])
    assert.match(staleAnswer.data.answer, /sufficient current workspace context/)
    matches[0].revision = 2
    editDuringChat = true
    assert.equal((await call('member', `/w/${wid}/chat`, 'POST', { message: 'Validate?', domain: 'technology' })).status, 409)
    editDuringChat = false
    await call('owner', `/w/${wid}/jobs`, 'POST', { action: 'pipeline', computeApproved: true })
    const failed = (await call('owner', `/w/${wid}/jobs`)).data[0]
    assert.equal(failed.status, 'FAILED')
    assert.match(failed.error, /controlled training failure/)
    assert.equal((await call('owner', `/w/${wid}/datasets?domain=technology`)).data.find(d => d.id === docId).status, 'indexed')
    await call('owner', `/w/${wid}/datasets/${docId}`, 'DELETE')
    matches[0].revision = 3
    assert.equal((await call('owner', `/w/${wid}/search`, 'POST', { query: 'Validate' })).data.matches.length, 0)
  } finally {
    global.fetch = originalFetch
    process.env.RUNPOD_WORKER_URL = ''
    process.env.RUNPOD_API_KEY = ''
    process.env.RUNPOD_WORKER_MODE = 'pod'
  }
})

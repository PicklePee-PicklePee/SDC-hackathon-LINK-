import express from 'express'
import { randomUUID, randomBytes } from 'node:crypto'
import { clerkClient, getAuth } from '@clerk/express'
import { query, transaction } from './db.js'
import { DEFAULT_PROMPT, DOMAINS, sampleDocuments, modules, quizzes, sandboxes, gradeSandbox } from './content.js'
import { connection, workerRequest } from './worker.js'

export const api = express.Router()
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
function text(value, label, max, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || value.includes('\0')) fail(400, `${label} must contain ${min}–${max} characters.`)
  return value.trim()
}
function domain(value = 'culinary') {
  if (!DOMAINS.includes(value)) fail(400, 'Choose a valid training domain.')
  return value
}
const dataRow = d => ({ id: d.id, title: d.title, domain: d.domain, text: d.text, size: Buffer.byteLength(d.text), chunks: d.chunks, status: d.revision === d.indexed_revision ? 'indexed' : 'pending', revision: d.revision, sample: d.sample, createdAt: d.created_at })
api.get('/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ status: 'ok' })
})
const limits = new Map()
api.use(async (req, res, next) => {
  const auth = getAuth(req)
  const userId = auth?.sessionClaims?.userId || auth?.userId
  if (!userId) return res.status(401).json({ error: 'Sign in to access Link.' })
  const now = Date.now()
  if (limits.size > 5000) for (const [key, entry] of limits) if (entry.reset < now) limits.delete(key)
  const limit = limits.get(userId) || { count: 0, reset: now + 60000 }
  if (limit.reset < now) { limit.reset = now + 60000; limit.count = 0 }
  if (++limit.count > 240) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' })
  limits.set(userId, limit)
  // Browser mutations are JSON same-origin requests. No cross-origin CORS is enabled.
  if (!['GET', 'HEAD'].includes(req.method) && req.get('content-type')?.split(';')[0].trim() !== 'application/json') return res.status(415).json({ error: 'Use application/json.' })
  if (!['GET', 'HEAD'].includes(req.method)) {
    const origin = req.get('origin')
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim()
    if (origin && new URL(origin).host !== host) return res.status(403).json({ error: 'Cross-origin request rejected.' })
  }
  let user = (await query('SELECT * FROM link_users WHERE id=$1', [userId])).rows[0]
  if (!user) {
    const profile = await clerkClient.users.getUser(userId)
    const email = profile.emailAddresses.find(e => e.id === profile.primaryEmailAddressId)?.emailAddress || ''
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'Link member'
    user = (await query('INSERT INTO link_users(id,name,email) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name RETURNING *', [userId, name, email])).rows[0]
  }
  req.linkUser = user
  next()
})
api.get('/me', async (req, res) => {
  const workspaces = (await query('SELECT w.id,w.name,m.role,m.status FROM link_memberships m JOIN link_workspaces w ON w.id=m.workspace_id WHERE m.user_id=$1 AND m.status<>$2 ORDER BY w.created_at', [req.linkUser.id, 'rejected'])).rows
  res.json({ user: req.linkUser, workspaces })
})
api.post('/workspaces', async (req, res) => {
  const name = text(req.body.name, 'Workspace name', 80, 2)
  const id = randomUUID()
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.linkUser.id])
    const count = (await client.query("SELECT count(*)::int n FROM link_memberships WHERE user_id=$1 AND role='owner'", [req.linkUser.id])).rows[0].n
    if (count >= 10) fail(400, 'You can own up to 10 workspaces.')
    await client.query('INSERT INTO link_workspaces(id,name,join_code,system_prompt) VALUES($1,$2,$3,$4)', [id, name, randomBytes(12).toString('hex'), DEFAULT_PROMPT])
    await client.query("INSERT INTO link_memberships VALUES($1,$2,'owner','approved')", [id, req.linkUser.id])
    if (req.body.seedSamples === true) {
      for (const doc of sampleDocuments) await client.query('INSERT INTO link_datasets(id,workspace_id,title,domain,text,sample) VALUES($1,$2,$3,$4,$5,true)', [randomUUID(), id, doc.title, doc.domain, doc.text])
    }
  })
  res.status(201).json({ id })
})
api.post('/requests', async (req, res) => {
  const code = text(req.body.code, 'Workspace code', 100)
  const workspace = (await query('SELECT id FROM link_workspaces WHERE join_code=$1', [code])).rows[0]
  if (!workspace) fail(404, 'No workspace matches that access code.')
  const result = await query("INSERT INTO link_memberships VALUES($1,$2,'member','pending') ON CONFLICT(workspace_id,user_id) DO UPDATE SET status='pending' WHERE link_memberships.status='rejected' RETURNING status", [workspace.id, req.linkUser.id])
  res.json({ message: result.rows[0]?.status === 'pending' ? 'Access requested. A workspace owner must approve you.' : 'You already belong to or have requested this workspace.' })
})
const workspace = express.Router({ mergeParams: true })
api.use('/w/:wid', workspace)
workspace.use(async (req, _res, next) => {
  if (!uuid(req.params.wid)) fail(404, 'Workspace not found.')
  const membership = (await query("SELECT role FROM link_memberships WHERE workspace_id=$1 AND user_id=$2 AND status='approved'", [req.params.wid, req.linkUser.id])).rows[0]
  if (!membership) fail(403, 'Workspace access requires owner approval.')
  req.role = membership.role; req.wid = req.params.wid; next()
})
const owner = (req, _res, next) => { if (req.role !== 'owner') fail(403, 'Workspace owner permission required.'); next() }
workspace.get('/bootstrap', async (req, res) => {
  const w = (await query('SELECT * FROM link_workspaces WHERE id=$1', [req.wid])).rows[0]
  const stats = (await query(`SELECT
    (SELECT count(*)::int FROM link_datasets WHERE workspace_id=$1) documents,
    (SELECT COALESCE(sum(chunks),0)::int FROM link_datasets WHERE workspace_id=$1 AND revision=indexed_revision) chunks,
    (SELECT count(*)::int FROM link_memberships WHERE workspace_id=$1 AND status='approved') members,
    (SELECT count(*)::int FROM link_messages WHERE workspace_id=$1 AND role='user') questions`, [req.wid])).rows[0]
  res.json({ workspace: { id: w.id, name: w.name, systemPrompt: req.role === 'owner' ? w.system_prompt : undefined, temperature: w.temperature, joinCode: req.role === 'owner' ? w.join_code : undefined }, role: req.role, stats, domains: DOMAINS })
})
workspace.get('/datasets', owner, async (req, res) => {
  const d = req.query.domain ? domain(req.query.domain) : null
  res.json((await query('SELECT * FROM link_datasets WHERE workspace_id=$1 AND ($2::text IS NULL OR domain=$2) ORDER BY created_at,id', [req.wid, d])).rows.map(dataRow))
})
const datasetInput = body => ({ title: text(body.title, 'Title', 140), domain: domain(body.domain), text: text(body.text, 'Document text', 1000000, 10) })
workspace.post('/datasets', owner, async (req, res) => {
  const doc = datasetInput(req.body)
  const result = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.wid])
    const size = (await client.query('SELECT count(*)::int n FROM link_datasets WHERE workspace_id=$1', [req.wid])).rows[0].n
    if (size >= 200) fail(400, 'A workspace can contain up to 200 documents.')
    return client.query('INSERT INTO link_datasets(id,workspace_id,title,domain,text) VALUES($1,$2,$3,$4,$5) RETURNING *', [randomUUID(), req.wid, doc.title, doc.domain, doc.text])
  })
  res.status(201).json(dataRow(result.rows[0]))
})
workspace.patch('/datasets/:did', owner, async (req, res) => {
  if (!uuid(req.params.did)) fail(404, 'Dataset not found.')
  const doc = datasetInput(req.body)
  const d = (await query('UPDATE link_datasets SET title=$1,domain=$2,text=$3,revision=revision+1,indexed_revision=0,chunks=0,sample=false WHERE id=$4 AND workspace_id=$5 RETURNING *', [doc.title, doc.domain, doc.text, req.params.did, req.wid])).rows[0]
  if (!d) fail(404, 'Dataset not found.')
  res.json(dataRow(d))
})
workspace.delete('/datasets/:did', owner, async (req, res) => {
  if (!uuid(req.params.did)) fail(404, 'Dataset not found.')
  const result = await query('DELETE FROM link_datasets WHERE id=$1 AND workspace_id=$2', [req.params.did, req.wid])
  if (!result.rowCount) fail(404, 'Dataset not found.')
  // Worker searches are restricted to current document IDs and revisions.
  res.json({ ok: true })
})
workspace.patch('/settings', owner, async (req, res) => {
  const prompt = text(req.body.systemPrompt, 'System prompt', 12000, 10)
  const temperature = req.body.temperature
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 1) fail(400, 'Temperature must be between 0 and 1.')
  await query('UPDATE link_workspaces SET system_prompt=$1,temperature=$2 WHERE id=$3', [prompt, temperature, req.wid])
  res.json({ ok: true })
})
workspace.get('/members', owner, async (req, res) => {
  const people = (await query(`SELECT u.id,u.name,u.email,m.role,m.status,
    (SELECT count(*)::int FROM link_progress p WHERE p.workspace_id=m.workspace_id AND p.user_id=m.user_id) AS "modulesCompleted",
    (SELECT score FROM link_quiz_attempts q WHERE q.workspace_id=m.workspace_id AND q.user_id=m.user_id ORDER BY created_at DESC LIMIT 1) AS "quizScore",
    (SELECT count(*)::int FROM link_messages c WHERE c.workspace_id=m.workspace_id AND c.user_id=m.user_id AND c.role='user') AS "questionCount",
    (SELECT round(avg((citation->>'score')::numeric)*100) FROM link_messages c, jsonb_array_elements(c.citations) citation WHERE c.workspace_id=m.workspace_id AND c.user_id=m.user_id AND c.role='assistant') AS "groundingMatch"
    FROM link_memberships m JOIN link_users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.status<>'rejected' ORDER BY m.role,u.name`, [req.wid])).rows
  res.json(people)
})
workspace.patch('/members/:uid', owner, async (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.status)) fail(400, 'Choose approve or reject.')
  const result = await query("UPDATE link_memberships SET status=$1 WHERE workspace_id=$2 AND user_id=$3 AND role='member' AND status='pending'", [req.body.status, req.wid, req.params.uid])
  if (!result.rowCount) fail(404, 'Pending request not found.')
  res.json({ ok: true })
})
workspace.get('/connection', owner, async (_req, res) => res.json(await connection()))
workspace.post('/connection/test', owner, async (_req, res) => res.json(await connection()))
const jobRow = row => ({ ...row.snapshot, id: row.id, action: row.action, status: row.status, createdAt: row.created_at })
async function refreshJob(row) {
  if (!['IN_QUEUE', 'IN_PROGRESS'].includes(row.status)) return row
  try {
    const snapshot = await workerRequest(`/jobs/${encodeURIComponent(row.worker_job_id)}?workspaceId=${row.workspace_id}`)
    if (!['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(snapshot.status)) fail(502, 'Invalid worker job state.')
    await transaction(async client => {
      await client.query('UPDATE link_jobs SET status=$1,snapshot=$2 WHERE id=$3', [snapshot.status, JSON.stringify(snapshot), row.id])
      if (snapshot.status === 'COMPLETED') for (const version of row.versions) {
        const count = Number(snapshot.chunkCounts?.[version.id] || 0)
        await client.query('UPDATE link_datasets SET indexed_revision=$1,chunks=$2 WHERE id=$3 AND workspace_id=$4 AND revision=$1', [version.revision, count, version.id, row.workspace_id])
      }
    })
    return { ...row, status: snapshot.status, snapshot }
  } catch (error) {
    // Do not invent terminal job state when an already-submitted Pod becomes unreachable.
    return { ...row, snapshot: { ...row.snapshot, error: error.message, telemetryUnavailable: true } }
  }
}
workspace.get('/jobs', owner, async (req, res) => {
  const jobs = (await query('SELECT * FROM link_jobs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 30', [req.wid])).rows
  res.json((await Promise.all(jobs.map(refreshJob))).map(jobRow))
})
workspace.post('/jobs', owner, async (req, res) => {
  const action = req.body.action
  if (!['index', 'pipeline'].includes(action)) fail(400, 'Choose indexing or indexing with fine-tuning.')
  const job = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.wid])
    const active = (await client.query("SELECT id FROM link_jobs WHERE workspace_id=$1 AND status IN ('IN_QUEUE','IN_PROGRESS')", [req.wid])).rows
    if (active.length) fail(409, 'A GPU job is already active. Refresh telemetry before starting another.')
    const docs = (await client.query('SELECT id,title,domain,text,revision FROM link_datasets WHERE workspace_id=$1', [req.wid])).rows
    if (!docs.length) fail(400, 'Add at least one document before starting a job.')
    const remote = await workerRequest('/jobs', { workspaceId: req.wid, action, documents: docs })
    if (typeof remote.id !== 'string') fail(502, 'Worker did not return a job ID.')
    const row = (await client.query("INSERT INTO link_jobs(id,workspace_id,worker_job_id,action,status,snapshot,versions) VALUES($1,$2,$3,$4,'IN_QUEUE',$5,$6) RETURNING *", [randomUUID(), req.wid, remote.id, action, JSON.stringify(remote), JSON.stringify(docs.map(d => ({ id: d.id, revision: d.revision })))])).rows[0]
    return jobRow(row)
  })
  res.status(202).json(job)
})
async function versions(wid, d) {
  return (await query('SELECT id,revision FROM link_datasets WHERE workspace_id=$1 AND ($2::text IS NULL OR domain=$2)', [wid, d || null])).rows
}
function safeMatches(matches, docs) {
  const current = new Map(docs.map(d => [d.id, d.revision]))
  return (matches || []).filter(m => current.get(m.datasetId) === m.revision && typeof m.text === 'string' && Number.isFinite(m.score) && m.score >= 0 && m.score <= 1).slice(0, 5)
}
workspace.post('/search', owner, async (req, res) => {
  const question = text(req.body.query, 'Search query', 2000)
  const docs = await versions(req.wid, req.body.domain ? domain(req.body.domain) : null)
  const result = await workerRequest('/search', { workspaceId: req.wid, query: question, documents: docs })
  res.json({ matches: safeMatches(result.matches, docs) })
})
workspace.get('/chat', async (req, res) => {
  const d = domain(req.query.domain)
  res.json((await query('SELECT id,role,content,citations,created_at AS "createdAt" FROM (SELECT * FROM link_messages WHERE workspace_id=$1 AND user_id=$2 AND domain=$3 ORDER BY id DESC LIMIT 100) messages ORDER BY id', [req.wid, req.linkUser.id, d])).rows)
})
workspace.post('/chat', async (req, res) => {
  const message = text(req.body.message, 'Question', 4000)
  const d = domain(req.body.domain)
  const w = (await query('SELECT system_prompt,temperature FROM link_workspaces WHERE id=$1', [req.wid])).rows[0]
  const docs = await versions(req.wid, d)
  const allDocuments = await versions(req.wid)
  const result = await workerRequest('/chat', { workspaceId: req.wid, question: message, documents: docs, allDocuments, prompt: w.system_prompt, temperature: w.temperature }, 120000)
  const citations = safeMatches(result.citations, docs)
  const answer = citations.length ? text(result.answer, 'Worker answer', 16000) : 'I could not find sufficient current workspace context to answer that. Ask your workspace owner to upload and index the relevant SOP.'
  await transaction(async client => {
    await client.query("INSERT INTO link_messages(workspace_id,user_id,domain,role,content) VALUES($1,$2,$3,'user',$4)", [req.wid, req.linkUser.id, d, message])
    await client.query("INSERT INTO link_messages(workspace_id,user_id,domain,role,content,citations) VALUES($1,$2,$3,'assistant',$4,$5)", [req.wid, req.linkUser.id, d, answer, JSON.stringify(citations)])
  })
  res.json({ answer, citations })
})
workspace.get('/modules', async (req, res) => {
  const d = domain(req.query.domain)
  const completed = new Set((await query('SELECT module_id FROM link_progress WHERE workspace_id=$1 AND user_id=$2', [req.wid, req.linkUser.id])).rows.map(p => p.module_id))
  res.json(modules[d].map((m, index) => ({ ...m, status: completed.has(m.id) ? 'completed' : index === 0 || completed.has(modules[d][index - 1].id) ? 'in-progress' : 'locked' })))
})
workspace.post('/modules/:mid/complete', async (req, res) => {
  const all = Object.values(modules).flat()
  const mod = all.find(m => m.id === req.params.mid)
  if (!mod) fail(404, 'Module not found.')
  if (mod.order > 1) {
    const before = modules[mod.domain][mod.order - 2]
    if (!(await query('SELECT 1 FROM link_progress WHERE workspace_id=$1 AND user_id=$2 AND module_id=$3', [req.wid, req.linkUser.id, before.id])).rowCount) fail(409, 'Complete the previous module first.')
  }
  await query('INSERT INTO link_progress(workspace_id,user_id,module_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [req.wid, req.linkUser.id, mod.id])
  res.json({ ok: true })
})
workspace.get('/quiz', (req, res) => {
  res.json({ questions: quizzes[domain(req.query.domain)].map((q, i) => ({ id: i, question: q.question, options: q.options })) })
})
workspace.post('/quiz', async (req, res) => {
  const d = domain(req.body.domain)
  const answers = req.body.answers
  if (!Array.isArray(answers) || answers.length !== quizzes[d].length || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) fail(400, 'Answer every quiz question before submitting.')
  const results = quizzes[d].map((q, i) => ({ question: q.question, selected: answers[i], correct: q.correct, explanation: q.explanation }))
  const score = Math.round(100 * results.filter(q => q.selected === q.correct).length / results.length)
  await query('INSERT INTO link_quiz_attempts(id,workspace_id,user_id,domain,score,results) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), req.wid, req.linkUser.id, d, score, JSON.stringify(results)])
  res.json({ score, results, passed: score >= 80 })
})
workspace.get('/sandbox', (req, res) => res.json(sandboxes[domain(req.query.domain)]))
workspace.post('/sandbox', (req, res) => {
  const d = domain(req.body.domain)
  const values = req.body.values
  if (!values || typeof values !== 'object') fail(400, 'Provide all simulator values.')
  for (const field of sandboxes[d].fields) {
    const value = values[field.key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) fail(400, `${field.label} must be between ${field.min} and ${field.max}.`)
  }
  res.json(gradeSandbox(d, values))
})
api.use((_req, res) => res.status(404).json({ error: 'API route not found.' }))

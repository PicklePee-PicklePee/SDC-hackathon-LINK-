// Explicit, development-only setup. Never run at server startup or in production.
// Passwords are supplied through Replit Secrets, never arguments or source code.
import { clerkClient } from '@clerk/express'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { pool, transaction } from '../server/db.js'
import { DEFAULT_PROMPT, sampleDocuments } from '../server/content.js'

const definitions = [
  { username: 'admin123', secret: 'DEMO_ADMIN_PASSWORD', role: 'owner' },
  { username: 'intern123', secret: 'DEMO_INTERN_PASSWORD', role: 'member' },
]

async function seed() {
  const instance = await clerkClient.instance.get()
  if (instance.environmentType !== 'development') throw new Error('Demo setup is allowed only in Clerk development, never production.')
  for (const definition of definitions) {
    if (!process.env[definition.secret] || process.env[definition.secret].length < 12) {
      throw new Error(`Set ${definition.secret} to a strong password of at least 12 characters using Secrets.`)
    }
  }
  if (process.env.DEMO_ADMIN_PASSWORD === process.env.DEMO_INTERN_PASSWORD) {
    throw new Error('Use different passwords for the two demo accounts.')
  }
  const users = []
  for (const definition of definitions) {
    const found = await clerkClient.users.getUserList({ username: [definition.username], limit: 2 })
    if (found.totalCount > 1) throw new Error('Demo identifier is ambiguous; no privileges were assigned.')
    let user = found.data[0]
    if (user) {
      if (user.privateMetadata.linkDemoAccount !== definition.role) {
        throw new Error(`An unrelated account already uses ${definition.username}; it will not be changed.`)
      }
    } else {
      user = await clerkClient.users.createUser({
        username: definition.username,
        password: process.env[definition.secret],
        firstName: definition.role === 'owner' ? 'Demo Admin' : 'Demo Intern',
        privateMetadata: { linkDemoAccount: definition.role },
      })
    }
    const verified = await clerkClient.users.verifyPassword({ userId: user.id, password: process.env[definition.secret] })
    if (!verified.verified) throw new Error(`Password verification failed for ${definition.username}.`)
    users.push({ ...definition, user })
  }

  // Stable workspace identity makes retries safe if setup is interrupted.
  const hash = createHash('sha256').update(`link-demo:${users.map(x => x.user.id).join(':')}`).digest('hex')
  const workspaceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [workspaceId])
    const existing = (await client.query('SELECT id FROM link_workspaces WHERE id=$1', [workspaceId])).rows[0]
    if (existing) {
      // A rerun must not restore roles revoked after the initial setup.
      for (const item of users) {
        const membership = (await client.query('SELECT role,status FROM link_memberships WHERE workspace_id=$1 AND user_id=$2', [workspaceId, item.user.id])).rows[0]
        if (membership?.role !== item.role || membership?.status !== 'approved') {
          throw new Error('Demo access has changed since setup. It will not be automatically restored.')
        }
      }
      return
    }
    // If a completed workspace was deliberately deleted, do not recreate grants.
    if (users.some(item => item.user.privateMetadata.linkDemoWorkspaceId)) {
      throw new Error('The original demo workspace was removed. Automatic recreation is disabled.')
    }
    for (const item of users) {
      const email = item.user.emailAddresses.find(e => e.id === item.user.primaryEmailAddressId)?.emailAddress || ''
      await client.query('INSERT INTO link_users(id,name,email) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',
        [item.user.id, item.username, email])
    }
    await client.query('INSERT INTO link_workspaces(id,name,join_code,system_prompt) VALUES($1,$2,$3,$4)',
      [workspaceId, 'Link Demo Workspace', randomBytes(12).toString('hex'), DEFAULT_PROMPT])
    for (const item of users) {
      await client.query("INSERT INTO link_memberships(workspace_id,user_id,role,status) VALUES($1,$2,$3,'approved')",
        [workspaceId, item.user.id, item.role])
    }
    for (const doc of sampleDocuments) {
      await client.query('INSERT INTO link_datasets(id,workspace_id,title,domain,text,sample) VALUES($1,$2,$3,$4,$5,true)',
        [randomUUID(), workspaceId, doc.title, doc.domain, doc.text])
    }
  })
  for (const item of users) {
    await clerkClient.users.updateUserMetadata(item.user.id, { privateMetadata: { linkDemoWorkspaceId: workspaceId } })
  }
  console.log(JSON.stringify({
    environment: 'development',
    workspace: 'Link Demo Workspace',
    accounts: users.map(item => ({ username: item.username, role: item.role, passwordVerified: true })),
  }))
}

try { await seed() }
catch (error) {
  // Never serialize provider requests, password values, or raw auth exceptions.
  if (error.errors) console.error(JSON.stringify({ setupFailed: true, status: error.status,
    errors: error.errors.map(item => ({ code: item.code, parameter: item.meta?.paramName })) }))
  else console.error(error.message)
  process.exitCode = 1
} finally { await pool.end() }

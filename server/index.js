import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { publishableKeyFromHost } from '@clerk/shared/keys'
import { fileURLToPath } from 'node:url'
import { api } from './api.js'
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from './clerk-proxy.js'

const app = express()
app.disable('x-powered-by')
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware())
app.use(express.json({ limit: '2mb' }))
app.use(clerkMiddleware(req => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? '', process.env.CLERK_PUBLISHABLE_KEY),
})))
app.get('/docs/runpod-setup.md', (_req, res) => res.type('text/plain').sendFile(fileURLToPath(new URL('../docs/runpod-setup.md', import.meta.url))))
app.use('/api', api)
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }))
app.use((error, _req, res, _next) => {
  if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message })
  console.error('Request failed:', error.code || error.name)
  res.status(error.status || 500).json({ error: error.status ? error.message : 'The request could not be completed. Please try again.' })
})
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url))))
  app.use((_req, res) => res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}
app.listen(5000, '0.0.0.0', () => console.log('Link is serving on port 5000'))

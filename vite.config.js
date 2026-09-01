import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAccountManagers } from './api/account-managers.js'
import { handleContact } from './api/contact.js'

function localServerApis(env) {
  return {
    name: 'local-server-apis',
    configureServer(server) {
      server.middlewares.use('/api/account-managers', async (request, response, next) => {
        if (!['POST'].includes(request.method)) return next()
        try {
          const chunks = []
          for await (const chunk of request) chunks.push(chunk)
          request.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const adapter = {
            status(code) { response.statusCode = code; return adapter },
            json(body) {
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify(body))
            },
          }
          await handleAccountManagers(request, adapter, env)
        } catch (error) {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: error.message || 'Local API error' }))
        }
      })
      server.middlewares.use('/api/contact', async (request, response, next) => {
        if (request.method !== 'POST') return next()
        try {
          const chunks = []
          for await (const chunk of request) chunks.push(chunk)
          request.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const adapter = {
            status(code) { response.statusCode = code; return adapter },
            json(body) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body)) },
          }
          await handleContact(request, adapter, env)
        } catch (error) {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: error.message || 'Local API error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), localServerApis(env)],
    // Only these two browser-safe Supabase values are exposed. Service-role,
    // Razorpay, Resend, and AI secrets must stay in trusted server code.
    define: {
      __SUPABASE_PROJECT_URL__: JSON.stringify(env.VITE_SUPABASE_PROJECT_URL || env.SUPABASE_PROJECT_URL || ''),
      __SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''),
    },
  }
})

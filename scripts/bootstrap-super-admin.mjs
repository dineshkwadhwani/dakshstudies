import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const apply = process.argv.includes('--apply')

async function loadEnv() {
  const text = await readFile(join(root, '.env.local'), 'utf8')
  return Object.fromEntries(text.split(/\r?\n/).map(line => {
    const at = line.indexOf('=')
    if (at < 1 || line.trim().startsWith('#')) return null
    let value = line.slice(at + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    return [line.slice(0, at).trim(), value]
  }).filter(Boolean))
}

async function main() {
  const env = await loadEnv()
  const required = ['SUPABASE_PROJECT_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPERADMIN_EMAIL', 'SUPERADMIN_PASSWORD', 'SUPERADMIN_FULL_NAME']
  const missing = required.filter(key => !env[key])
  if (missing.length) throw new Error(`Missing .env.local variables: ${missing.join(', ')}`)
  if (env.SUPERADMIN_PASSWORD.length < 12) throw new Error('SUPERADMIN_PASSWORD must contain at least 12 characters')

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', emailConfigured: true, fullNameConfigured: true, passwordLengthValid: true }))
  if (!apply) return console.log('Dry run complete. Use --apply to create/promote the SuperAdmin.')

  const admin = createClient(env.SUPABASE_PROJECT_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  let user = null
  for (let page = 1; page <= 10 && !user; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    user = data.users.find(candidate => candidate.email?.toLowerCase() === env.SUPERADMIN_EMAIL.toLowerCase())
    if (data.users.length < 100) break
  }

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: env.SUPERADMIN_EMAIL,
      password: env.SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: env.SUPERADMIN_FULL_NAME, seeded_role: 'super_admin' },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: env.SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: env.SUPERADMIN_FULL_NAME, seeded_role: 'super_admin' },
    })
    if (error) throw error
    user = data.user
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    role: 'super_admin',
    status: 'active',
    full_name: env.SUPERADMIN_FULL_NAME,
    onboarding_step: 'complete',
  }, { onConflict: 'id' })
  if (profileError) throw profileError

  const { error: auditError } = await admin.from('audit_events').insert({
    event_type: 'super_admin.bootstrap', actor_user_id: user.id, actor_role: 'super_admin',
    affected_user_id: user.id, entity_type: 'profile', entity_id: user.id,
    metadata: { source: 'bootstrap-script' },
  })
  if (auditError) throw auditError
  console.log('SuperAdmin bootstrap completed successfully.')
}

main().catch(error => { console.error(error.message); process.exit(1) })

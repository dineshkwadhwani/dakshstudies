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

async function listAllUsers(admin) {
  const users = []
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 100) break
  }
  return users
}

async function main() {
  const env = await loadEnv()
  const required = ['SUPABASE_PROJECT_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPERADMIN_EMAIL']
  const missing = required.filter(key => !env[key])
  if (missing.length) throw new Error(`Missing .env.local variables: ${missing.join(', ')}`)

  const nextEmail = env.SUPERADMIN_EMAIL.trim().toLowerCase()
  const admin = createClient(env.SUPABASE_PROJECT_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
  if (profileError) throw profileError
  if (profiles.length !== 1) throw new Error(`Expected exactly one SuperAdmin profile; found ${profiles.length}. No changes made.`)

  const superAdminId = profiles[0].id
  const users = await listAllUsers(admin)
  const currentUser = users.find(user => user.id === superAdminId)
  if (!currentUser) throw new Error('The SuperAdmin profile has no matching Supabase Auth user. No changes made.')

  const conflictingUser = users.find(user => user.id !== superAdminId && user.email?.toLowerCase() === nextEmail)
  if (conflictingUser) throw new Error('The configured email already belongs to another Auth user. No changes made.')

  const unchanged = currentUser.email?.toLowerCase() === nextEmail
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', singleSuperAdminFound: true, newEmailAvailable: true, emailAlreadyCurrent: unchanged }))
  if (!apply || unchanged) return

  const { error: updateError } = await admin.auth.admin.updateUserById(superAdminId, {
    email: nextEmail,
    email_confirm: true,
  })
  if (updateError) throw updateError

  const { error: auditError } = await admin.from('audit_events').insert({
    event_type: 'super_admin.email_updated',
    actor_user_id: superAdminId,
    actor_role: 'super_admin',
    affected_user_id: superAdminId,
    entity_type: 'profile',
    entity_id: superAdminId,
    metadata: { source: 'controlled-email-update-script' },
  })
  if (auditError) throw auditError
  console.log('SuperAdmin email updated successfully.')
}

main().catch(error => { console.error(error.message); process.exit(1) })


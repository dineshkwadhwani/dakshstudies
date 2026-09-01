import { createClient } from '@supabase/supabase-js'

const projectUrl = typeof __SUPABASE_PROJECT_URL__ === 'string' ? __SUPABASE_PROJECT_URL__ : ''
const anonKey = typeof __SUPABASE_ANON_KEY__ === 'string' ? __SUPABASE_ANON_KEY__ : ''

export const isSupabaseConfigured = Boolean(projectUrl && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(projectUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null


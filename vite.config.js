import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    // Only these two browser-safe Supabase values are exposed. Service-role,
    // Razorpay, Resend, and AI secrets must stay in trusted server code.
    define: {
      __SUPABASE_PROJECT_URL__: JSON.stringify(env.VITE_SUPABASE_PROJECT_URL || env.SUPABASE_PROJECT_URL || ''),
      __SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''),
    },
  }
})

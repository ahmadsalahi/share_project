import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log('VITE_SUPABASE_URL:', supabaseUrl)
console.log('VITE_SUPABASE_KEY_EXISTS:', Boolean(supabaseKey))

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  console.error('Supabase not configured on this build')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
)

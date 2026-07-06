import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://gktkqbzprrwaepkfflue.supabase.co'

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_HLfJh3z02TIjl8JHNR3xFw_HWUqN_rw'

console.log('Supabase URL exists:', Boolean(supabaseUrl))
console.log('Supabase KEY exists:', Boolean(supabaseKey))

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)

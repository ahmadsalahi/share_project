import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gktkqbzprrwaepkfflue.supabase.co'
const supabaseKey = 'sb_publishable_HLfJh3z02TIjl8JHNR3xFw_HWUqN_rw'

console.log('SUPABASE URL USED:', supabaseUrl)
console.log('SUPABASE KEY USED:', supabaseKey.slice(0, 25))

export const isSupabaseConfigured = true

export const supabase = createClient(supabaseUrl, supabaseKey)

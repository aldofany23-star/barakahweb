import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lrqtacaddbrmmopuliqc.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_cu-byDH17eSvUmu85Mwi1Q_-L1s8GNB'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

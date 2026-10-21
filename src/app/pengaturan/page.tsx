import { createClient } from '@/lib/supabase/server'
import { StoreSettingsView } from './_components/StoreSettingsView'
import { StoreProfile } from '@/types/database'

export const metadata = {
  title: 'Pengaturan Toko - Barakah Fauna',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: storeProfileData } = await supabase
    .from('store_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  return <StoreSettingsView initialProfile={storeProfileData as StoreProfile | null} />
}

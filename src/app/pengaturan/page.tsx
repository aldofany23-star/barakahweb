import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { StoreSettingsView } from './_components/StoreSettingsView'
import { StoreProfile } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pengaturan Toko - Barakah Fauna',
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: storeProfileData } = await supabase
    .from('store_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  return <StoreSettingsView initialProfile={storeProfileData as StoreProfile | null} />
}

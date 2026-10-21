import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { UserManagementView } from './_components/UserManagementView'
import { Profile } from '@/types/database'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Kelola Akun - Barakah Fauna',
}

export default async function UserManagementPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: usersData } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })

  return (
    <UserManagementView
      initialUsers={(usersData as Profile[]) || []}
      currentUserId={session.id}
    />
  )
}

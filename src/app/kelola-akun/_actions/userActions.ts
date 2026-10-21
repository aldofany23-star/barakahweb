'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createStaffAction(data: {
  name: string
  email: string
  password: string
  role: string
  menuAccess: string[]
}) {
  const session = await getSession()
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return { success: false, error: 'Hanya Admin/Owner yang dapat membuat akun staf' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').insert({
    name: data.name,
    email: data.email.trim(),
    raw_password: data.password,
    role: data.role,
    menu_access: data.menuAccess,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/kelola-akun')
  return { success: true }
}

export async function updateStaffAction(
  id: string,
  data: {
    name: string
    email: string
    password?: string
    role: string
    menuAccess: string[]
  }
) {
  const session = await getSession()
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return { success: false, error: 'Hanya Admin/Owner yang dapat mengubah akun staf' }
  }

  const supabase = await createClient()

  const payload: Record<string, unknown> = {
    name: data.name,
    email: data.email.trim(),
    role: data.role,
    menu_access: data.menuAccess,
  }

  if (data.password) {
    payload.raw_password = data.password
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kelola-akun')
  return { success: true }
}

export async function deleteStaffAction(id: string) {
  const session = await getSession()
  if (!session || (session.role !== 'owner' && session.role !== 'admin')) {
    return { success: false, error: 'Hanya Admin/Owner yang dapat menghapus akun' }
  }

  if (session.id === id) {
    return { success: false, error: 'Tidak dapat menghapus akun sendiri yang sedang aktif' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kelola-akun')
  return { success: true }
}

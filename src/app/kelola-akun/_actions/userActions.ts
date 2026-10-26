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
  if (!session || (session.role?.toLowerCase() !== 'owner' && session.role?.toLowerCase() !== 'admin')) {
    return { success: false, error: 'Hanya Owner yang dapat membuat akun' }
  }

  const supabase = await createClient()
  const cleanRole = data.role?.toLowerCase() === 'owner' ? 'owner' : 'staff'

  const { error } = await supabase.from('profiles').insert({
    name: data.name.trim(),
    email: data.email.trim(),
    raw_password: data.password.trim(),
    role: cleanRole,
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
  if (!session || (session.role?.toLowerCase() !== 'owner' && session.role?.toLowerCase() !== 'admin')) {
    return { success: false, error: 'Hanya Owner yang dapat mengubah akun' }
  }

  const supabase = await createClient()
  const cleanRole = data.role?.toLowerCase() === 'owner' ? 'owner' : 'staff'

  const payload: Record<string, unknown> = {
    name: data.name.trim(),
    email: data.email.trim(),
    role: cleanRole,
    menu_access: data.menuAccess,
  }

  if (data.password && data.password.trim().length > 0) {
    payload.raw_password = data.password.trim()
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kelola-akun')
  return { success: true }
}

export async function deleteStaffAction(id: string) {
  const session = await getSession()
  if (!session || (session.role?.toLowerCase() !== 'owner' && session.role?.toLowerCase() !== 'admin')) {
    return { success: false, error: 'Hanya Owner yang dapat menghapus akun' }
  }

  if (session.id === id) {
    return { success: false, error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kelola-akun')
  return { success: true }
}

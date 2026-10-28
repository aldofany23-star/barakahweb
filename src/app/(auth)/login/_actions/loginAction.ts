'use server'

import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/session'
import { Profile } from '@/types/database'

export async function loginAction(formData: FormData) {
  const identifier = formData.get('identifier')?.toString()?.trim() || ''
  const password = formData.get('password')?.toString() || ''

  if (!identifier || !password) {
    return { success: false, error: 'Email / Nama Pengguna dan password wajib diisi' }
  }

  try {
    const supabase = await createClient()
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', identifier)
      .eq('raw_password', password)
      .maybeSingle()

    let matchedProfile: Profile | null = profileByEmail
    if (!matchedProfile) {
      const { data: profileByName } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', identifier)
        .eq('raw_password', password)
        .maybeSingle()

      matchedProfile = profileByName
    }

    if (!matchedProfile) {
      return {
        success: false,
        error: 'Email/Nama Pengguna atau password salah, atau akun belum terdaftar.',
      }
    }

    await createSession(matchedProfile)

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
    return { success: false, error: `Gagal login: ${message}` }
  }
}

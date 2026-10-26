'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateStoreProfileAction(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const storeName = formData.get('storeName')?.toString().trim() || 'Barakah Fauna'
  const tagline = formData.get('tagline')?.toString().trim() || ''
  const address = formData.get('address')?.toString().trim() || ''
  const whatsapp = formData.get('whatsapp')?.toString().trim() || ''
  const email = formData.get('email')?.toString().trim() || ''
  let instagram = formData.get('instagram')?.toString().trim() || ''
  if (instagram.startsWith('@')) {
    instagram = instagram.substring(1).trim()
  }
  const bankAccountInfo = formData.get('bankAccountInfo')?.toString().trim() || ''
  const qrisImageUrl = formData.get('qrisImageUrl')?.toString().trim() || ''

  const supabase = await createClient()

  // Ambil record yang sudah ada
  const { data: existing } = await supabase.from('store_profile').select('id').limit(1).maybeSingle()

  const payload = {
    store_name: storeName,
    tagline: tagline || null,
    address: address || null,
    whatsapp: whatsapp || null,
    email: email || null,
    instagram: instagram || null,
    bank_account_info: bankAccountInfo || null,
    qris_image_url: qrisImageUrl || null,
    updated_at: new Date().toISOString(),
  }

  let err
  if (existing) {
    const { error } = await supabase
      .from('store_profile')
      .update(payload)
      .eq('id', existing.id)
    err = error
  } else {
    const { error } = await supabase.from('store_profile').insert(payload)
    err = error
  }

  if (err) return { success: false, error: err.message }

  revalidatePath('/pengaturan')
  revalidatePath('/kasir')
  revalidatePath('/laporan-penjualan')
  return { success: true }
}

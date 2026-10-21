'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateStoreProfileAction(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const storeName = formData.get('storeName')?.toString() || 'Barakah Fauna'
  const tagline = formData.get('tagline')?.toString() || ''
  const address = formData.get('address')?.toString() || ''
  const whatsapp = formData.get('whatsapp')?.toString() || ''
  const instagram = formData.get('instagram')?.toString() || ''
  const bankAccountInfo = formData.get('bankAccountInfo')?.toString() || ''
  const qrisImageUrl = formData.get('qrisImageUrl')?.toString() || ''

  const supabase = await createClient()

  // Ambil record yang sudah ada
  const { data: existing } = await supabase.from('store_profile').select('id').limit(1).maybeSingle()

  let err
  if (existing) {
    const { error } = await supabase
      .from('store_profile')
      .update({
        store_name: storeName,
        tagline: tagline || null,
        address: address || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        bank_account_info: bankAccountInfo || null,
        qris_image_url: qrisImageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    err = error
  } else {
    const { error } = await supabase.from('store_profile').insert({
      store_name: storeName,
      tagline: tagline || null,
      address: address || null,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      bank_account_info: bankAccountInfo || null,
      qris_image_url: qrisImageUrl || null,
    })
    err = error
  }

  if (err) return { success: false, error: err.message }

  revalidatePath('/pengaturan')
  revalidatePath('/kasir')
  return { success: true }
}

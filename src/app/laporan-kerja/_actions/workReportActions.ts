'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createWorkReportAction(caption: string, imageUrls: string[] = []) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (!caption.trim()) {
    return { success: false, error: 'Catatan laporan kerja tidak boleh kosong' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('work_reports').insert({
    user_id: session.id,
    user_name: session.name,
    caption: caption.trim(),
    image_urls: imageUrls,
    is_pinned: false,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/laporan-kerja')
  return { success: true }
}

export async function togglePinAction(id: string, currentPin: boolean) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('work_reports')
    .update({ is_pinned: !currentPin })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/laporan-kerja')
  return { success: true }
}

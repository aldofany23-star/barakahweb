'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createWorkReportAction(caption: string, imageUrls: string[] = []) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Silakan login terlebih dahulu' }

  if (!caption.trim() && imageUrls.length === 0) {
    return { success: false, error: 'Catatan laporan atau foto tidak boleh kosong' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('work_reports').insert({
    user_id: session.id,
    user_name: session.name || 'User',
    caption: caption.trim(),
    image_urls: imageUrls,
    is_pinned: false,
  })

  if (error) {
    return { success: false, error: 'Gagal memposting laporan: ' + error.message }
  }

  revalidatePath('/laporan-kerja')
  return { success: true }
}

export async function togglePinAction(id: string, currentPin: boolean) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Silakan login terlebih dahulu' }

  const supabase = await createClient()

  // Aturan Android: Maksimal 2 laporan yang disematkan (pinned)
  if (!currentPin) {
    const { count, error: countErr } = await supabase
      .from('work_reports')
      .select('*', { count: 'exact', head: true })
      .eq('is_pinned', true)

    if (!countErr && (count || 0) >= 2) {
      return { success: false, error: 'Maksimal pin hanya 2 laporan' }
    }
  }

  const { error } = await supabase
    .from('work_reports')
    .update({ is_pinned: !currentPin })
    .eq('id', id)

  if (error) {
    return { success: false, error: 'Gagal mengubah status pin: ' + error.message }
  }

  revalidatePath('/laporan-kerja')
  return { success: true }
}

export async function deleteWorkReportAction(id: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Silakan login terlebih dahulu' }

  const supabase = await createClient()

  // Ambil laporan untuk memverifikasi hak akses & foto yang akan dihapus
  const { data: report, error: fetchErr } = await supabase
    .from('work_reports')
    .select('user_id, image_urls')
    .eq('id', id)
    .single()

  if (fetchErr || !report) {
    return { success: false, error: 'Laporan tidak ditemukan' }
  }

  // Hanya pembuat laporan atau admin yang boleh menghapus (sesuai logika Android)
  const isAuthor = report.user_id === session.id
  const isAdmin = session.role?.toLowerCase() === 'admin'
  if (!isAuthor && !isAdmin) {
    return { success: false, error: 'Anda hanya dapat menghapus laporan milik sendiri' }
  }

  // Hapus foto terkait dari bucket storage work_reports
  if (report.image_urls && report.image_urls.length > 0) {
    const fileNames = report.image_urls
      .map((url: string) => url.split('/').pop())
      .filter((name: string | undefined): name is string => Boolean(name && name.length > 0))

    if (fileNames.length > 0) {
      try {
        await supabase.storage.from('work_reports').remove(fileNames)
      } catch {
        // Abaikan jika file sudah tidak ada di storage
      }
    }
  }

  // Hapus baris dari tabel work_reports
  const { error } = await supabase.from('work_reports').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Gagal menghapus laporan: ' + error.message }
  }

  revalidatePath('/laporan-kerja')
  return { success: true }
}

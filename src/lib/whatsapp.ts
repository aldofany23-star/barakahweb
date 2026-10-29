import { toBlob } from 'html-to-image'
import { StoreProfile } from '@/types/database'

/**
 * Normalizes phone number into international WhatsApp format without leading +
 * e.g., '08123456789' -> '628123456789'
 * e.g., '+62 812-3456' -> '628123456'
 */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return ''
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

/**
 * Check if the input resembles a valid WhatsApp phone number (minimum 7 digits of phone)
 */
export function isValidWhatsAppPhone(phone?: string | null): boolean {
  if (!phone) return false
  const normalized = normalizeWhatsAppPhone(phone)
  return normalized.length >= 7 && normalized.length <= 16
}

/**
 * Captures an HTML receipt element as PNG Blob using html-to-image
 * (No cacheBust, no font downloads to prevent hanging in Brave / privacy browsers)
 */
export async function captureReceiptAsBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    const blob = await toBlob(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
    })
    return blob
  } catch (err) {
    console.warn('html-to-image capture warning:', err)
    return null
  }
}

export interface ShareWhatsAppResult {
  success: boolean
  method: 'native_share' | 'clipboard_and_web'
  message?: string
  error?: string
}

/**
 * Shares receipt to WhatsApp:
 * - Caption: strictly "Terima kasih telah berbelanja di Barakah Fauna" (atau nama toko)
 * - Android: langsung melampirkan file gambar struk via native Web Share API
 * - Desktop: LANGSUNG buka WhatsApp Web (tidak ada about:blank) & salin gambar struk ke clipboard untuk Ctrl+V
 */
export async function shareReceiptToWhatsApp({
  element,
  phone,
  storeProfile,
}: {
  element: HTMLElement
  phone: string
  storeProfile?: StoreProfile | null
}): Promise<ShareWhatsAppResult> {
  const cleanPhone = normalizeWhatsAppPhone(phone)
  if (!cleanPhone) {
    return {
      success: false,
      method: 'clipboard_and_web',
      error: 'Nomor WhatsApp tidak valid atau belum diisi',
    }
  }

  const storeName = storeProfile?.store_name || 'Barakah Fauna'
  const message = `Terima kasih telah berbelanja di ${storeName}`
  const encodedText = encodeURIComponent(message)
  const filename = `struk-belanja-${Date.now().toString().slice(-6)}.png`

  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // 1. DI ANDROID / MOBILE:
  // Render gambar lalu bagikan via Web Share API agar file gambar struk langsung muncul di WhatsApp
  if (isMobile) {
    let blob: Blob | null = null
    try {
      blob = await captureReceiptAsBlob(element)
    } catch (e) {
      console.warn('Gagal render gambar struk mobile:', e)
    }

    if (blob) {
      const file = new File([blob], filename, { type: 'image/png' })
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `Struk Belanja`,
            text: message,
          })
          return {
            success: true,
            method: 'native_share',
            message: 'Gambar struk berhasil dikirim!',
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            return {
              success: false,
              method: 'native_share',
              error: 'Batal membagikan',
            }
          }
        }
      }
    }

    // Fallback jika Web Share API tidak tersedia di mobile:
    window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    return {
      success: true,
      method: 'native_share',
      message: 'WhatsApp telah dibuka!',
    }
  }

  // 2. DI DESKTOP / PC (WhatsApp Web):
  // LANGSUNG BUKA WhatsApp Web dengan URL tujuan secara instan, JANGAN buka about:blank!
  const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
  window.open(waUrl, '_blank')

  // Render gambar struk dan salin ke clipboard untuk di-Ctrl+V di WhatsApp Web
  let copiedToClipboard = false
  try {
    const blob = await captureReceiptAsBlob(element)
    if (
      blob &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof ClipboardItem !== 'undefined'
    ) {
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      copiedToClipboard = true
    }
  } catch (clipErr) {
    console.warn('Gagal salin gambar struk ke clipboard:', clipErr)
  }

  return {
    success: true,
    method: 'clipboard_and_web',
    message: copiedToClipboard
      ? 'Gambar struk telah disalin ke clipboard! Tekan Tempel / Paste (Ctrl+V) di chat WhatsApp.'
      : 'WhatsApp Web telah dibuka!',
  }
}

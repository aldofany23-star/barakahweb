'use client'

import { useState, useTransition, useRef } from 'react'
import { StoreProfile } from '@/types/database'
import { updateStoreProfileAction } from '../_actions/settingActions'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  QrCode,
  Upload,
  Trash2,
  Maximize2,
  X,
  AlertCircle,
  Mail,
  Phone,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'

interface StoreSettingsViewProps {
  initialProfile: StoreProfile | null
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1200 // Resolusi tajam untuk scan QR Code

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              resolve(blob || file)
            },
            'image/jpeg',
            0.9
          )
        } else {
          resolve(file)
        }
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export function StoreSettingsView({ initialProfile }: StoreSettingsViewProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // QRIS State & Uploading
  const [qrisImageUrl, setQrisImageUrl] = useState<string>(initialProfile?.qris_image_url || '')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [showManualUrl, setShowManualUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgressText('Memproses gambar...')
    setError(null)

    try {
      // Kompres gambar agar efisien untuk storage Supabase
      const compressedBlob = await compressImage(file)
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `qris_${crypto.randomUUID()}.${ext}`

      setUploadProgressText('Mengunggah ke storage...')
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('store_assets')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Gagal upload: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('store_assets')
        .getPublicUrl(fileName)

      if (publicUrlData?.publicUrl) {
        setQrisImageUrl(publicUrlData.publicUrl)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah gambar QRIS'
      setError(msg)
    } finally {
      setIsUploading(false)
      setUploadProgressText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files
        handleImageFileChange({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  const handleRemoveQris = () => {
    setQrisImageUrl('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    formData.set('qrisImageUrl', qrisImageUrl)

    startTransition(async () => {
      const res = await updateStoreProfileAction(formData)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      } else {
        setError(res.error || 'Gagal menyimpan pengaturan')
      }
    })
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-0 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header Halaman (Cloudflare Header Style) */}
      <div className="px-4 py-3 sm:px-0 sm:py-0 border-b border-[#e2e2e2] sm:border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Pengaturan Toko
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              Profil
            </span>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Identitas toko untuk cetak struk kasir, rekening pembayaran, dan QRIS
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-3 sm:px-0 space-y-4 sm:space-y-5 text-xs">
        {/* Banner Sukses */}
        {success && (
          <div className="p-4 bg-[#eef8f2] border border-[#b8e8cc] rounded-lg flex items-center gap-2 text-[#00A250] font-bold shadow-2xs">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Pengaturan berhasil disimpan dan langsung tersinkronisasi ke seluruh kasir!</span>
          </div>
        )}

        {/* Banner Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 shadow-2xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Card 1: Identitas Toko (Header Struk Thermal) */}
        <div className="p-4 sm:p-6 bg-white rounded-lg border border-[#e2e2e2] space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#262626] border-b border-[#e2e2e2] pb-3">
            <Store className="w-4 h-4 text-[#00A250]" />
            <span>Informasi Profil (Header Struk Thermal)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Nama Toko *
              </label>
              <input
                type="text"
                name="storeName"
                required
                defaultValue={initialProfile?.store_name || 'Barakah Fauna'}
                placeholder="Contoh: Barakah Fauna"
                className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Tagline Toko
              </label>
              <input
                type="text"
                name="tagline"
                defaultValue={initialProfile?.tagline || 'Petshop & Grooming'}
                placeholder="Contoh: Petshop & Grooming"
                className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              Alamat Lengkap Toko
            </label>
            <textarea
              name="address"
              rows={3}
              defaultValue={initialProfile?.address || 'Perum. Jaya Regency Sedati'}
              placeholder="Contoh: Perum. Jaya Regency Sedati, Sidoarjo"
              className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition resize-y"
            />
          </div>
        </div>

        {/* Card 2: Kontak & Media Sosial */}
        <div className="p-4 sm:p-6 bg-white rounded-lg border border-[#e2e2e2] space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#262626] border-b border-[#e2e2e2] pb-3">
            <CreditCard className="w-4 h-4 text-[#00A250]" />
            <span>Kontak & Media Sosial</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Nomor WhatsApp Toko
              </label>
              <input
                type="text"
                name="whatsapp"
                defaultValue={initialProfile?.whatsapp || '085707601606'}
                placeholder="Contoh: 085707601606"
                className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Email Toko
              </label>
              <input
                type="email"
                name="email"
                defaultValue={initialProfile?.email || ''}
                placeholder="Contoh: barakahfauna@gmail.com"
                className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Username Instagram (tanpa @)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#757575] font-semibold text-xs select-none">
                  @
                </span>
                <input
                  type="text"
                  name="instagram"
                  defaultValue={(initialProfile?.instagram || '').replace(/^@/, '')}
                  placeholder="barakahfauna"
                  className="w-full pl-7 pr-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Informasi Rekening Bank Transfer
              </label>
              <textarea
                name="bankAccountInfo"
                rows={2}
                defaultValue={
                  initialProfile?.bank_account_info ||
                  'BCA 4650557081 ALDO FANNY EKA ADITYA RAHMAT'
                }
                placeholder="Contoh: BCA 4650557081 ALDO FANNY EKA ADITYA RAHMAT"
                className="w-full px-3.5 py-2 bg-white border border-[#e2e2e2] rounded-md text-xs font-mono text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition resize-y"
              />
            </div>
          </div>
        </div>

        {/* Card 3: QRIS Pembayaran (Sesuai Android) */}
        <div className="p-4 sm:p-6 bg-white rounded-lg border border-[#e2e2e2] space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#262626] border-b border-[#e2e2e2] pb-3">
            <QrCode className="w-4 h-4 text-[#00A250]" />
            <div>
              <span>QRIS Pembayaran</span>
              <p className="text-[11px] font-normal text-[#757575] mt-0.5">
                Upload gambar QRIS statis yang akan ditampilkan saat pembayaran QRIS.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
            disabled={isUploading || isPending}
          />

          {/* Area Upload & Preview QRIS */}
          <div>
            {qrisImageUrl ? (
              <div className="bg-[#fafafa] border border-[#e2e2e2] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center space-y-3">
                <div className="relative group bg-white p-3 rounded-lg border border-[#e2e2e2] shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisImageUrl}
                    alt="QRIS Toko"
                    className="max-h-[220px] w-auto object-contain rounded select-none cursor-pointer"
                    onClick={() => setPreviewModalOpen(true)}
                    title="Klik untuk memperbesar"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="absolute inset-0 bg-black/40 text-white rounded opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Lihat Ukuran Penuh</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isPending}
                    className="px-3 py-1.5 bg-white hover:bg-[#fafafa] border border-[#e2e2e2] text-[#262626] rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#00A250]" />
                    <span>Ganti Gambar QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-[#fafafa] border border-[#e2e2e2] text-[#262626] rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Perbesar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveQris}
                    disabled={isUploading || isPending}
                    className="px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus QRIS</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#d1d5db] hover:border-[#00A250] bg-[#fafafa] hover:bg-[#f0f9f3] rounded-xl p-8 sm:p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-[#e2e2e2] group-hover:border-[#00A250] flex items-center justify-center text-[#757575] group-hover:text-[#00A250] transition shadow-2xs">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-[#262626] group-hover:text-[#00A250] transition">
                    Ketuk untuk memilih gambar QRIS
                  </p>
                  <p className="text-[11px] text-[#757575] mt-0.5">
                    atau seret file gambar langsung ke kotak ini (PNG, JPG, JPEG)
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 bg-white border border-[#e2e2e2] px-2 py-0.5 rounded-full mt-1">
                  Maks. 5 MB (Otomatis dioptimasi tajam)
                </span>
              </div>
            )}

            {/* Indikator Loading Upload */}
            {isUploading && (
              <div className="mt-3 p-3 bg-[#eef8f2] border border-[#b8e8cc] rounded-lg flex items-center gap-2 text-[#00A250] text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{uploadProgressText || 'Mengunggah gambar QRIS ke storage...'}</span>
              </div>
            )}

            {/* Opsi URL QRIS Manual */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowManualUrl(!showManualUrl)}
                className="text-[11px] text-[#757575] hover:text-[#00A250] transition cursor-pointer"
              >
                {showManualUrl ? '▲ Sembunyikan URL manual' : '▼ Masukkan URL QRIS langsung'}
              </button>
            </div>

            {showManualUrl && (
              <div className="mt-2 p-3 bg-[#fafafa] border border-[#e2e2e2] rounded-lg space-y-1.5">
                <label className="block font-semibold text-[#262626] text-[11px]">
                  URL Gambar QRIS (Supabase Storage / Public Link)
                </label>
                <input
                  type="text"
                  value={qrisImageUrl}
                  onChange={(e) => setQrisImageUrl(e.target.value)}
                  placeholder="https://.../qris.jpeg"
                  className="w-full px-3 py-1.5 bg-white border border-[#e2e2e2] rounded-md text-xs font-mono text-[#262626] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] disabled:opacity-50 text-white font-semibold rounded-md text-xs shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Modal Preview Fullscreen QRIS */}
      {previewModalOpen && qrisImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-2xl p-5 border border-[#e2e2e2] shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#e2e2e2]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#00A250]" />
                <h3 className="font-bold text-xs text-[#262626]">Preview QRIS Toko</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#fafafa] p-4 rounded-xl border border-[#e2e2e2] flex items-center justify-center w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrisImageUrl}
                alt="QRIS Full"
                className="max-h-[360px] w-auto object-contain rounded"
              />
            </div>

            <p className="text-[11px] text-[#757575] text-center">
              Pastikan kode QRIS dapat discan dengan jelas oleh pelanggan menggunakan GoPay, OVO, Dana, BCA, atau aplikasi perbankan lainnya.
            </p>

            <button
              type="button"
              onClick={() => setPreviewModalOpen(false)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-[#262626] font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

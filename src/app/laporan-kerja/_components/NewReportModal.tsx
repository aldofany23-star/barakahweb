'use client'

import { useState, useRef } from 'react'
import { createWorkReportAction } from '../_actions/workReportActions'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Send, ClipboardList, ImagePlus, Trash2, AlertCircle } from 'lucide-react'

interface NewReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ImagePreview {
  id: string
  file: File
  previewUrl: string
}

const MAX_IMAGES = 5

async function compressImageFile(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1600

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
            0.82
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

export function NewReportModal({ isOpen, onClose, onSuccess }: NewReportModalProps) {
  const [caption, setCaption] = useState('')
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remainingSlots = MAX_IMAGES - selectedImages.length
    if (remainingSlots <= 0) {
      setError(`Maksimal hanya ${MAX_IMAGES} foto per laporan`)
      return
    }

    const filesToAdd = files.slice(0, remainingSlots)
    const newPreviews: ImagePreview[] = filesToAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedImages((prev) => [...prev, ...newPreviews])
    setError(null)

    // Reset input agar file yang sama bisa dipilih lagi jika perlu
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (id: string) => {
    setSelectedImages((prev) => {
      const removed = prev.find((img) => img.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption.trim() && selectedImages.length === 0) {
      setError('Tuliskan catatan laporan atau lampirkan foto dokumentasi')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const uploadedUrls: string[] = []

      // Upload foto ke Supabase Storage bucket "work_reports" (sesuai logika Android)
      if (selectedImages.length > 0) {
        const supabase = createClient()
        for (let i = 0; i < selectedImages.length; i++) {
          setUploadStatus(`Mengunggah foto (${i + 1}/${selectedImages.length})...`)
          const item = selectedImages[i]
          const compressedBlob = await compressImageFile(item.file)
          const fileName = `${crypto.randomUUID()}.jpg`

          const { error: uploadError } = await supabase.storage
            .from('work_reports')
            .upload(fileName, compressedBlob, {
              contentType: 'image/jpeg',
              upsert: true,
            })

          if (uploadError) {
            throw new Error(`Gagal mengunggah foto ${i + 1}: ${uploadError.message}`)
          }

          const { data: publicUrlData } = supabase.storage
            .from('work_reports')
            .getPublicUrl(fileName)

          if (publicUrlData?.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl)
          }
        }
      }

      setUploadStatus('Menyimpan laporan kerja...')
      const res = await createWorkReportAction(caption, uploadedUrls)

      if (res.success) {
        // Bersihkan blob URLs
        selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
        setCaption('')
        setSelectedImages([])
        onClose()
        onSuccess?.()
      } else {
        setError(res.error || 'Gagal memposting laporan')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memposting laporan')
    } finally {
      setIsSubmitting(false)
      setUploadStatus('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#e2e2e2] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#eef8f2] text-[#00A250] rounded-lg border border-[#b8e8cc]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#262626]">
                Buat Laporan Kerja
              </h3>
              <p className="text-[11px] text-[#757575]">
                Catatan aktivitas shift, serah terima tugas, atau kondisi toko
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              Deskripsi / Keterangan
            </label>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tuliskan aktivitas shift, kondisi hewan/grooming, stok barang yang hampir habis, atau pesan untuk kasir shift selanjutnya..."
              className="w-full p-3 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none resize-none placeholder:text-gray-400 shadow-2xs"
            />
          </div>

          {/* Photo Attachments (Max 5 photos, mirrors Android) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#262626]">
                Lampiran Foto Dokumentasi
              </label>
              <span className="text-[11px] text-gray-400">
                {selectedImages.length} / {MAX_IMAGES} Foto
              </span>
            </div>

            {/* Thumbnail Preview Grid */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                {selectedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-[#e2e2e2] bg-gray-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt="Pratinjau"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      disabled={isSubmitting}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700 transition cursor-pointer"
                      title="Hapus foto ini"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Photo Button */}
            {selectedImages.length < MAX_IMAGES && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="hidden"
                  id="report-photo-upload"
                />
                <label
                  htmlFor="report-photo-upload"
                  className="w-full py-2.5 px-3 border border-dashed border-[#00A250] hover:bg-[#eef8f2] rounded-xl text-xs font-semibold text-[#00A250] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {selectedImages.length === 0
                      ? 'Pilih Foto dari Galeri / Kamera (Maks. 5 Foto)'
                      : 'Tambah Foto Lainnya'}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#e2e2e2] flex items-center justify-between">
            <div className="text-[11px] text-gray-500 font-medium">
              {uploadStatus && (
                <div className="flex items-center gap-1.5 text-[#00A250]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadStatus}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#e2e2e2] rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!caption.trim() && selectedImages.length === 0)}
                className="px-4 py-2 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Posting Laporan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

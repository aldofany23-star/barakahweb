'use client'

import { useState, useTransition } from 'react'
import { StoreProfile } from '@/types/database'
import { updateStoreProfileAction } from '../_actions/settingActions'
import { Settings, Store, CreditCard, Save, Loader2, CheckCircle2 } from 'lucide-react'

interface StoreSettingsViewProps {
  initialProfile: StoreProfile | null
}

export function StoreSettingsView({ initialProfile }: StoreSettingsViewProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

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
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
          Pengaturan Toko & Struk
        </h1>
        <p className="text-xs text-[#8B8B8B] mt-0.5">
          Identitas toko untuk cetak struk kasir, rekening pembayaran, dan QRIS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {success && (
          <div className="p-4 bg-[#D6F0E0] border border-[#B2E4C4] rounded-2xl flex items-center gap-2 text-[#00A250] font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Pengaturan berhasil disimpan dan langsung tersinkronisasi ke seluruh kasir!</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
            {error}
          </div>
        )}

        {/* Profil Toko Card */}
        <div className="p-6 bg-white rounded-3xl border border-[#E5E7EB] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#1E1E1E] border-b border-[#E5E7EB] pb-3">
            <Store className="w-4 h-4 text-[#00A250]" />
            <span>Identitas Toko (Header Struk Thermal)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#1E1E1E] mb-1.5">
                Nama Toko *
              </label>
              <input
                type="text"
                name="storeName"
                required
                defaultValue={initialProfile?.store_name || 'Barakah Fauna'}
                className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1E1E1E] mb-1.5">
                Tagline Toko
              </label>
              <input
                type="text"
                name="tagline"
                defaultValue={initialProfile?.tagline || 'Petshop & Grooming'}
                className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1E1E1E] mb-1.5">
              Alamat Lengkap Toko
            </label>
            <input
              type="text"
              name="address"
              defaultValue={initialProfile?.address || 'Perum. Jaya Regency Sedati'}
              className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#1E1E1E] mb-1.5">
                Nomor WhatsApp Toko
              </label>
              <input
                type="text"
                name="whatsapp"
                defaultValue={initialProfile?.whatsapp || '085707601606'}
                className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1E1E1E] mb-1.5">
                Instagram
              </label>
              <input
                type="text"
                name="instagram"
                defaultValue={initialProfile?.instagram || ''}
                placeholder="@barakahfauna"
                className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
              />
            </div>
          </div>
        </div>

        {/* Info Rekening & Pembayaran Card */}
        <div className="p-6 bg-white rounded-3xl border border-[#E5E7EB] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#1E1E1E] border-b border-[#E5E7EB] pb-3">
            <CreditCard className="w-4 h-4 text-[#00A250]" />
            <span>Rekening & Pembayaran Non-Tunai</span>
          </div>

          <div>
            <label className="block font-bold text-[#1E1E1E] mb-1.5">
              Informasi Rekening Bank Transfer
            </label>
            <input
              type="text"
              name="bankAccountInfo"
              defaultValue={
                initialProfile?.bank_account_info ||
                'BCA 4650557081 ALDO FANNY EKA ADITYA RAHMAT'
              }
              className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#1E1E1E] mb-1.5">
              URL Gambar QRIS (Supabase Storage / Public Link)
            </label>
            <input
              type="text"
              name="qrisImageUrl"
              defaultValue={initialProfile?.qris_image_url || ''}
              placeholder="https://.../qris.jpeg"
              className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-8 py-3 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
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
    </div>
  )
}

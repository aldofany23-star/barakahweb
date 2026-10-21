'use client'

import { useState, useTransition } from 'react'
import { StoreProfile } from '@/types/database'
import { updateStoreProfileAction } from '../_actions/settingActions'
import { Settings, Store, QrCode, CreditCard, Save, Loader2, CheckCircle2 } from 'lucide-react'

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          <span>Pengaturan Toko & Struk Kasir</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Identitas toko untuk header struk thermal, informasi rekening, dan QRIS statis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Pengaturan berhasil diperbarui dan tersinkronisasi ke seluruh kasir!</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Section 1: Profil Toko */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Identitas Toko (Tampil di Struk)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nama Toko *
              </label>
              <input
                type="text"
                name="storeName"
                required
                defaultValue={initialProfile?.store_name || 'Barakah Fauna'}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Tagline Toko
              </label>
              <input
                type="text"
                name="tagline"
                defaultValue={initialProfile?.tagline || 'Petshop & Grooming'}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Alamat Lengkap Toko
            </label>
            <input
              type="text"
              name="address"
              defaultValue={initialProfile?.address || 'Perum. Jaya Regency Sedati'}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nomor WhatsApp Toko
              </label>
              <input
                type="text"
                name="whatsapp"
                defaultValue={initialProfile?.whatsapp || '085707601606'}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Instagram
              </label>
              <input
                type="text"
                name="instagram"
                defaultValue={initialProfile?.instagram || ''}
                placeholder="@barakahfauna"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Info Rekening & Pembayaran Non-Tunai */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>Informasi Pembayaran Kasir</span>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Info Rekening Transfer Bank
            </label>
            <input
              type="text"
              name="bankAccountInfo"
              defaultValue={
                initialProfile?.bank_account_info ||
                'BCA 4650557081 ALDO FANNY EKA ADITYA RAHMAT'
              }
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              URL Gambar QRIS (Supabase Storage / Public Link)
            </label>
            <input
              type="text"
              name="qrisImageUrl"
              defaultValue={initialProfile?.qris_image_url || ''}
              placeholder="https://.../qris.jpeg"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Pengaturan Toko</span>
          </button>
        </div>
      </form>
    </div>
  )
}

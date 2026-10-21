'use client'

import { useState, useTransition } from 'react'
import { Product } from '@/types/database'
import { createDiscountAction } from '../_actions/discountActions'
import { X, Loader2, Tag, Percent } from 'lucide-react'

interface DiscountModalProps {
  products: Product[]
  isOpen: boolean
  onClose: () => void
}

export function DiscountModal({ products, isOpen, onClose }: DiscountModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'nominal' | 'percentage'>('nominal')

  if (!isOpen) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthStr = nextMonth.toISOString().split('T')[0]

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const name = formData.get('name')?.toString() || ''
    const productId = formData.get('productId')?.toString() || ''
    const value = parseFloat(formData.get('value')?.toString() || '0')
    const startDate = formData.get('startDate')?.toString() || todayStr
    const endDate = formData.get('endDate')?.toString() || nextMonthStr

    if (!name || !productId || value <= 0) {
      setError('Lengkapi semua data promo diskon')
      return
    }

    startTransition(async () => {
      const res = await createDiscountAction({
        name,
        productId,
        value,
        type,
        startDate,
        endDate,
      })

      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menyimpan diskon')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Tambah Promo Diskon
              </h3>
              <p className="text-[11px] text-zinc-500">Pasang promo harga pada produk tertentu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nama Promo Diskon *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Contoh: Flash Sale Akhir Bulan"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Pilih Produk *
            </label>
            <select
              name="productId"
              required
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">-- Pilih Produk yang Dipromosikan --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stok: {p.stock_qty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Tipe Diskon
              </label>
              <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setType('nominal')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition ${
                    type === 'nominal'
                      ? 'bg-white dark:bg-zinc-900 shadow-sm text-emerald-600'
                      : 'text-zinc-500'
                  }`}
                >
                  Rp (Nominal)
                </button>
                <button
                  type="button"
                  onClick={() => setType('percentage')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition ${
                    type === 'percentage'
                      ? 'bg-white dark:bg-zinc-900 shadow-sm text-emerald-600'
                      : 'text-zinc-500'
                  }`}
                >
                  % (Persen)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nilai Diskon ({type === 'nominal' ? 'Rp' : '%'}) *
              </label>
              <input
                type="number"
                name="value"
                required
                min="1"
                placeholder={type === 'nominal' ? '5000' : '15'}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Mulai Berlaku
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={todayStr}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Berakhir Pada
              </label>
              <input
                type="date"
                name="endDate"
                defaultValue={nextMonthStr}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Diskon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

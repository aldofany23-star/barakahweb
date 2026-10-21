'use client'

import { useState, useTransition } from 'react'
import { Product } from '@/types/database'
import { adjustStockAction } from '../_actions/productActions'
import { X, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'

interface StockAdjustModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function StockAdjustModal({
  product,
  isOpen,
  onClose,
}: StockAdjustModalProps) {
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<'in' | 'adjustment' | 'return'>('in')
  const [qty, setQty] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !product) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const delta = parseInt(qty, 10)
    if (!delta || delta === 0) {
      setError('Jumlah perubahan stok harus diisi')
      return
    }

    // Untuk in: delta positif. Untuk retur: delta negatif. Untuk koreksi opname: bisa positif atau negatif
    const finalDelta = type === 'return' ? -Math.abs(delta) : type === 'in' ? Math.abs(delta) : delta

    startTransition(async () => {
      const res = await adjustStockAction(
        product.id,
        finalDelta,
        type,
        reason.trim() || (type === 'in' ? 'Stok Masuk / Restock' : type === 'return' ? 'Retur Barang Rusak' : 'Koreksi Stok Opname')
      )

      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menyesuaikan stok')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Penyesuaian Stok
            </h3>
            <p className="text-[11px] text-zinc-500 truncate max-w-xs">{product.name}</p>
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

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex justify-between items-center">
            <span className="text-zinc-500">Stok Saat Ini:</span>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {product.stock_qty} unit
            </span>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Jenis Penyesuaian
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('in')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                  type === 'in'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>Restock</span>
              </button>
              <button
                type="button"
                onClick={() => setType('adjustment')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                  type === 'adjustment'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Opname</span>
              </button>
              <button
                type="button"
                onClick={() => setType('return')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                  type === 'return'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-red-600" />
                <span>Retur/Rusak</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {type === 'in' ? 'Jumlah Masuk (unit)' : type === 'return' ? 'Jumlah Rusak/Retur (unit)' : 'Koreksi (+ atau -)'}
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              placeholder="0"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Alasan / Keterangan
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pengiriman supplier dari distributor"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
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
              <span>Simpan Penyesuaian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

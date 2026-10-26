'use client'

import { useState, useTransition } from 'react'
import { Product } from '@/types/database'
import { adjustStockAction } from '../_actions/productActions'
import { X, Loader2, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react'

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
  const [type, setType] = useState<'in' | 'adjustment'>('in')
  const [qty, setQty] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !product) return null

  const currentStock = product.stock_qty || 0
  const parsedQty = parseInt(qty, 10) || 0
  const finalDelta = type === 'in' ? Math.abs(parsedQty) : parsedQty
  const resultingStock = currentStock + finalDelta

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (qty === '' || parsedQty === 0) {
      setError(
        type === 'in'
          ? 'Jumlah masuk harus diisi lebih dari 0'
          : 'Koreksi stok tidak boleh 0 (bisa angka positif atau minus)'
      )
      return
    }

    if (type === 'in' && parsedQty <= 0) {
      setError('Jumlah masuk harus berupa angka positif (lebih dari 0)')
      return
    }

    if (resultingStock < 0) {
      setError(`Stok akhir tidak boleh kurang dari 0 (stok saat ini: ${currentStock} unit)`)
      return
    }

    const finalReason =
      reason.trim() ||
      (type === 'in' ? 'Stok Masuk / Restock' : 'Koreksi Stok Opname')

    startTransition(async () => {
      const res = await adjustStockAction(
        product.id,
        finalDelta,
        type,
        finalReason
      )

      if (res.success) {
        setQty('')
        setReason('')
        setError(null)
        onClose()
      } else {
        setError(res.error || 'Gagal menyesuaikan stok')
      }
    })
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#eef8f2] text-[#00A250] rounded-xl border border-[#b8e8cc]">
              {type === 'in' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                Penyesuaian Stok
              </h3>
              <p className="text-[11px] text-gray-500 truncate max-w-[220px] sm:max-w-[280px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Stok Sekarang Display */}
          <div className="p-3.5 bg-[#f8fdf9] rounded-xl border border-[#b8e8cc] flex justify-between items-center">
            <span className="text-gray-600 font-medium">Stok Saat Ini:</span>
            <span className="text-xl sm:text-2xl font-bold text-[#00A250]">
              {currentStock} <span className="text-xs font-semibold text-gray-500">unit</span>
            </span>
          </div>

          {/* Pilihan: Stock In vs Opname */}
          <div>
            <label className="block font-semibold text-[#262626] mb-2">
              Jenis Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType('in')
                  setError(null)
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer font-bold ${
                  type === 'in'
                    ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] shadow-2xs'
                    : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    type === 'in' ? 'bg-[#00A250] text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <span>Stock In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('adjustment')
                  setError(null)
                }}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer font-bold ${
                  type === 'adjustment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                    : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    type === 'adjustment' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <span>Opname</span>
              </button>
            </div>
          </div>

          {/* Input Jumlah / Perubahan */}
          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              {type === 'in' ? 'Jumlah Masuk (unit) *' : 'Koreksi Stok (+ atau -) *'}
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => {
                setQty(e.target.value)
                if (error) setError(null)
              }}
              required
              autoFocus
              placeholder={type === 'in' ? 'Contoh: 10' : 'Contoh: 5 atau -3'}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {type === 'in'
                ? 'Masukkan jumlah unit produk yang masuk dari restock/supplier.'
                : 'Bisa angka positif untuk penambahan atau gunakan minus (-) jika stok berkurang.'}
            </p>
          </div>

          {/* Input Alasan */}
          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              Alasan / Keterangan
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === 'in'
                  ? 'Contoh: Pengiriman supplier dari distributor'
                  : 'Contoh: Koreksi stok fisik opname toko'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
            />
          </div>

          {/* Perkiraan Stok Akhir */}
          {qty !== '' && parsedQty !== 0 && (
            <div className="p-3 bg-gray-50 rounded-xl border border-[#e2e2e2] flex justify-between items-center text-xs animate-in fade-in duration-150">
              <span className="text-gray-500 font-medium">Perkiraan Stok Akhir:</span>
              <span
                className={`font-bold text-sm ${
                  resultingStock < 0 ? 'text-red-500' : 'text-[#00A250]'
                }`}
              >
                {resultingStock} unit
              </span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#e2e2e2] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || qty === '' || parsedQty === 0 || resultingStock < 0}
              className="px-5 py-2 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
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

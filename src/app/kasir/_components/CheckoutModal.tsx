'use client'

import { useState, useTransition } from 'react'
import { CartItem, Order, StoreProfile } from '@/types/database'
import { createOrderAction } from '../_actions/orderActions'
import { formatRupiah } from '@/lib/utils'
import {
  Banknote,
  QrCode,
  CreditCard,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface CheckoutModalProps {
  items: CartItem[]
  subtotal: number
  customDiscount: number
  total: number
  storeProfile: StoreProfile | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (order: Order) => void
}

export function CheckoutModal({
  items,
  subtotal,
  customDiscount,
  total,
  storeProfile,
  isOpen,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [isPending, startTransition] = useTransition()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash')
  const [cashAmountStr, setCashAmountStr] = useState<string>('')
  const [tableNumber, setTableNumber] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const cashAmount = parseFloat(cashAmountStr) || 0
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashAmount - total) : 0
  const isCashInsufficient = paymentMethod === 'cash' && cashAmount < total

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    50000,
    100000,
  ].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4)

  const handleProcessCheckout = () => {
    if (isCashInsufficient) {
      setError('Nominal uang tunai yang diterima kurang dari total belanja.')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await createOrderAction({
        items,
        subtotal,
        customDiscount,
        total,
        paymentMethod,
        cashAmount: paymentMethod === 'cash' ? cashAmount : total,
        changeAmount,
        tableNumber: tableNumber.trim() || undefined,
      })

      if (res.success && res.order) {
        onSuccess(res.order)
      } else {
        setError(res.error || 'Terjadi kesalahan saat memproses pesanan')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Konfirmasi Pembayaran
            </h3>
            <p className="text-xs text-zinc-500">
              {items.reduce((s, it) => s + it.qty, 0)} produk di keranjang
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Total display */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center">
            <div>
              <div className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">Total Yang Harus Dibayar</div>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatRupiah(total)}
              </div>
            </div>
            {customDiscount > 0 && (
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg">
                Diskon: {formatRupiah(customDiscount)}
              </span>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold ring-2 ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'qris'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold ring-2 ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs">QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'transfer'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold ring-2 ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Transfer Bank</span>
              </button>
            </div>
          </div>

          {/* Conditional Method details */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={cashAmountStr}
                  onChange={(e) => setCashAmountStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashAmountStr(amt.toString())}
                    className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition"
                  >
                    {amt === total ? 'Uang Pas' : formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Kembalian */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl flex justify-between items-center text-sm">
                <span className="text-zinc-500">Kembalian:</span>
                <span
                  className={`font-bold text-base ${
                    isCashInsufficient
                      ? 'text-red-500'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isCashInsufficient ? 'Uang Kurang' : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center space-y-3">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Pindai QRIS Barakah Fauna di bawah ini:
              </div>
              {storeProfile?.qris_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storeProfile.qris_image_url}
                  alt="QRIS Barakah Fauna"
                  className="w-48 h-48 mx-auto object-contain rounded-lg border bg-white p-2"
                />
              ) : (
                <div className="py-6 text-xs text-zinc-400">QRIS belum diunggah di Pengaturan Toko.</div>
              )}
              <div className="text-[11px] text-zinc-500">
                Pastikan pelanggan telah melakukan pembayaran senilai <b className="text-zinc-800 dark:text-zinc-200">{formatRupiah(total)}</b>
              </div>
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">Rekening Tujuan Toko:</div>
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border font-mono text-xs">
                {storeProfile?.bank_account_info || 'BCA 4650557081 ALDO FANNY EKA ADITYA RAHMAT'}
              </div>
              <div className="text-zinc-500 text-[11px]">
                Pastikan bukti transfer sudah dicek dan sesuai dengan total belanja.
              </div>
            </div>
          )}

          {/* Catatan / Meja / Nama Pelanggan */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Catatan / Nama Pelanggan / No. Meja (Opsional)
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: Meja 2 / Kak Rina"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition"
          >
            Batal
          </button>
          <button
            onClick={handleProcessCheckout}
            disabled={isPending || isCashInsufficient}
            className="px-6 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi & Cetak</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

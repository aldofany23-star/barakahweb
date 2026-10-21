'use client'

import { useRef } from 'react'
import { Order, CartItem, StoreProfile } from '@/types/database'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Printer, X, CheckCircle } from 'lucide-react'

interface ReceiptModalProps {
  order: Order | null
  items: CartItem[]
  storeProfile: StoreProfile | null
  isOpen: boolean
  onClose: () => void
}

export function ReceiptModal({
  order,
  items,
  storeProfile,
  isOpen,
  onClose,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Header Actions (hidden on print) */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Transaksi Berhasil</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Struk Body */}
        <div
          ref={receiptRef}
          className="p-6 font-mono text-xs text-zinc-900 dark:text-zinc-100 print:text-black print:p-2"
          id="printable-receipt"
        >
          {/* Toko Header */}
          <div className="text-center space-y-1 mb-4 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <h2 className="text-base font-bold tracking-wider uppercase">
              {storeProfile?.store_name || 'BARAKAH FAUNA'}
            </h2>
            {storeProfile?.tagline && (
              <p className="text-[10px] text-zinc-500 print:text-black">{storeProfile.tagline}</p>
            )}
            {storeProfile?.address && (
              <p className="text-[10px] text-zinc-500 print:text-black">{storeProfile.address}</p>
            )}
            {storeProfile?.whatsapp && (
              <p className="text-[10px] text-zinc-500 print:text-black">WA: {storeProfile.whatsapp}</p>
            )}
          </div>

          {/* Info Transaksi */}
          <div className="space-y-1 mb-3 text-[11px] pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <div className="flex justify-between">
              <span>No. Order:</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formatDateTime(order.created_at || new Date().toISOString())}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{order.cashier_name || 'Staff'}</span>
            </div>
            {order.table_number && (
              <div className="flex justify-between">
                <span>Catatan/Meja:</span>
                <span>{order.table_number}</span>
              </div>
            )}
          </div>

          {/* Daftar Item */}
          <div className="space-y-2 mb-3 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            {items.map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-medium text-[11px] truncate">{it.name}</div>
                <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-400 print:text-black">
                  <span>
                    {it.qty} x {formatRupiah(it.finalUnitPrice)}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 print:text-black">
                    {formatRupiah(it.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total & Pembayaran */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {order.custom_discount > 0 && (
              <div className="flex justify-between text-emerald-600 print:text-black">
                <span>Diskon:</span>
                <span>-{formatRupiah(order.custom_discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-zinc-300 dark:border-zinc-700">
              <span>TOTAL:</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Metode:</span>
              <span className="uppercase font-semibold">{order.payment_method}</span>
            </div>
            {order.payment_method.toLowerCase() === 'cash' && (
              <>
                <div className="flex justify-between">
                  <span>Tunai Diterima:</span>
                  <span>{formatRupiah(order.cash_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(order.change_amount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Struk */}
          <div className="mt-6 text-center text-[10px] text-zinc-500 print:text-black space-y-1">
            <p>Terima Kasih atas Kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
          </div>
        </div>

        {/* Action Buttons (hidden on print) */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50"
          >
            Selesai
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  )
}

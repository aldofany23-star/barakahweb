'use client'

import { Order, StoreProfile } from '@/types/database'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { X, Printer, Receipt } from 'lucide-react'

interface OrderDetailModalProps {
  order: Order | null
  storeProfile: StoreProfile | null
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailModal({
  order,
  storeProfile,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  if (!isOpen || !order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Rincian Transaksi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Struk Content */}
        <div className="p-6 font-mono text-xs text-zinc-900 dark:text-zinc-100 print:text-black print:p-2">
          <div className="text-center space-y-1 mb-4 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <h2 className="text-base font-bold uppercase tracking-wider">
              {storeProfile?.store_name || 'BARAKAH FAUNA'}
            </h2>
            {storeProfile?.tagline && (
              <p className="text-[10px] text-zinc-500 print:text-black">{storeProfile.tagline}</p>
            )}
            {storeProfile?.address && (
              <p className="text-[10px] text-zinc-500 print:text-black">{storeProfile.address}</p>
            )}
          </div>

          <div className="space-y-1 mb-3 text-[11px] pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            <div className="flex justify-between">
              <span>No. Order:</span>
              <span className="font-bold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formatDateTime(order.created_at)}</span>
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

          <div className="space-y-2 mb-3 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
            {order.order_items && order.order_items.length > 0 ? (
              order.order_items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-[11px]">
                    {item.product?.name || item.bundle_name || 'Item'}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 print:text-black">
                    <span>
                      {item.qty} x {formatRupiah(item.unit_price)}
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 print:text-black">
                      {formatRupiah(item.total_price)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-zinc-400 py-1">Item detail tidak tersedia</div>
            )}
          </div>

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
            {order.payment_method?.toLowerCase() === 'cash' && (
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
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Ulang Struk</span>
          </button>
        </div>
      </div>
    </div>
  )
}

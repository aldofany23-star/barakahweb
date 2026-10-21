'use client'

import { CartItem } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'

interface CartSidebarProps {
  items: CartItem[]
  subtotal: number
  customDiscount: number
  total: number
  onUpdateQty: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  onSetCustomDiscount: (disc: number) => void
  onCheckout: () => void
  isShiftActive: boolean
}

export function CartSidebar({
  items,
  subtotal,
  customDiscount,
  total,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onSetCustomDiscount,
  onCheckout,
  isShiftActive,
}: CartSidebarProps) {
  const totalItemCount = items.reduce((s, it) => s + it.qty, 0)

  return (
    <div className="w-full xl:w-96 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-full shadow-sm">
      {/* Cart Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Keranjang Belanja</h2>
            <p className="text-[11px] text-zinc-500">{totalItemCount} item dipilih</p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            title="Kosongkan Keranjang"
            className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-28rem)]">
        {items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <ShoppingBag className="w-12 h-12 stroke-1 mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs font-medium text-zinc-500">Keranjang masih kosong</p>
            <p className="text-[11px] text-zinc-400 mt-1">Pilih produk dari daftar di samping untuk menambahkan</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatRupiah(item.finalUnitPrice)}
                    {item.appliedPromoName && (
                      <span className="ml-1 text-[10px] text-emerald-600 font-medium">
                        ({item.appliedPromoName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  {formatRupiah(item.totalPrice)}
                </div>
              </div>

              {/* Quantity buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-[10px] text-red-500 hover:text-red-700 hover:underline"
                >
                  Hapus
                </button>

                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-6 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 space-y-3">
        {/* Custom Discount Input */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Potongan Diskon (Rp):</span>
          <input
            type="number"
            min="0"
            value={customDiscount || ''}
            onChange={(e) => onSetCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0"
            className="w-28 px-2.5 py-1 text-right bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1 text-xs pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {customDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Diskon</span>
              <span>-{formatRupiah(customDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 pt-1">
            <span>Total Bayar</span>
            <span className="text-emerald-600 text-base">{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || !isShiftActive}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
            items.length === 0 || !isShiftActive
              ? 'bg-zinc-400 cursor-not-allowed opacity-60'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
          }`}
        >
          <span>{!isShiftActive ? 'Buka Shift Terlebih Dahulu' : 'Proses Bayar'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

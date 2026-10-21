'use client'

import { CartItem } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react'

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
  onClearCart,
  onSetCustomDiscount,
  onCheckout,
  isShiftActive,
}: CartSidebarProps) {
  const totalItemCount = items.reduce((s, it) => s + it.qty, 0)

  return (
    <div className="w-full xl:w-[380px] bg-white rounded-3xl border border-[#E5E7EB] flex flex-col h-full shadow-xs">
      {/* Header (Matches Android: "Keranjang Pesanan" 18sp Bold) */}
      <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-[#1E1E1E]">Keranjang Pesanan</h2>
          <p className="text-xs text-[#8B8B8B] mt-0.5">{totalItemCount} item dipilih</p>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Cart Items List (Matches Android: Card surface border #E5E7EB rounded 12dp) */}
      <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-[calc(100vh-26rem)]">
        {items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#8B8B8B]">
            <ShoppingCart className="w-14 h-14 stroke-1 mb-3 text-[#8B8B8B]" />
            <p className="text-sm font-semibold text-[#1E1E1E]">Keranjang Kosong</p>
            <p className="text-xs text-[#8B8B8B] mt-1">
              Pilih produk terlebih dahulu sebelum membuka keranjang
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#1E1E1E] truncate">
                  {item.name}
                </div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  {item.originalPrice > item.finalUnitPrice && (
                    <>
                      <span className="text-[10px] text-[#9CA3AF] line-through">
                        {formatRupiah(item.originalPrice)}
                      </span>
                      <span className="bg-[#FEE2E2] text-[#EF4444] text-[9px] font-bold px-1 py-0.2 rounded">
                        -Rp{formatRupiah(item.originalPrice - item.finalUnitPrice).replace('Rp', '').trim()}
                      </span>
                    </>
                  )}
                  <span className="text-xs font-semibold text-[#00A250]">
                    {formatRupiah(item.finalUnitPrice)}
                  </span>
                </div>
              </div>

              {/* Stepper with rounded pill background #F9F9F9 (Matches line 600 CashierScreen.kt) */}
              <div className="flex items-center bg-[#F9F9F9] border border-[#E5E7EB] rounded-full px-1 py-0.5">
                <button
                  onClick={() => onUpdateQty(item.id, -1)}
                  className="w-7 h-7 flex items-center justify-center text-[#1E1E1E] hover:text-red-500 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-extrabold text-[#1E1E1E] min-w-6 text-center">
                  {item.qty}
                </span>
                <button
                  onClick={() => onUpdateQty(item.id, 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#00A250] hover:bg-[#D6F0E0] rounded-full transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="p-5 border-t border-[#E5E7EB] bg-white rounded-b-3xl space-y-3">
        {/* Custom Discount Input */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#8B8B8B]">Custom Diskon (Rp):</span>
          <input
            type="number"
            min="0"
            value={customDiscount || ''}
            onChange={(e) => onSetCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0"
            className="w-32 px-3 py-1.5 text-right bg-[#F9F9F9] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#1E1E1E] focus:ring-1 focus:ring-[#00A250] focus:outline-none"
          />
        </div>

        <div className="space-y-1.5 text-xs pt-2 border-t border-[#E5E7EB]">
          <div className="flex justify-between text-[#8B8B8B]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#1E1E1E]">{formatRupiah(subtotal)}</span>
          </div>
          {customDiscount > 0 && (
            <div className="flex justify-between text-[#EF4444] font-medium">
              <span>Potongan Diskon</span>
              <span>-{formatRupiah(customDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold text-[#1E1E1E] pt-1">
            <span>Total Bayar</span>
            <span className="text-[#00A250] text-lg font-black">{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Checkout Button (Big Green Rounded Pill) */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || !isShiftActive}
          className={`w-full h-12 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
            items.length === 0 || !isShiftActive
              ? 'bg-[#E5E5EA] text-[#8B8B8B] cursor-not-allowed'
              : 'bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c]'
          }`}
        >
          <span>{!isShiftActive ? 'Mulai Shift Kasir Terlebih Dahulu' : 'Proses Pembayaran'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

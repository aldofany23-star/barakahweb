'use client'

import { useState } from 'react'
import { CartItem } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Plus, Minus, ShoppingCart, ArrowRight, Tag, X, Check, AlertCircle } from 'lucide-react'

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
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [discountInput, setDiscountInput] = useState('')

  const totalItemCount = items.reduce((s, it) => s + it.qty, 0)
  const enteredDiscount = parseFloat(discountInput) || 0
  const isDiscountExceeding = enteredDiscount > subtotal

  const handleOpenDiscountDialog = () => {
    setDiscountInput(customDiscount > 0 ? customDiscount.toString() : '')
    setShowDiscountDialog(true)
  }

  const handleApplyDiscount = () => {
    if (isDiscountExceeding) return
    const val = Math.min(subtotal, Math.max(0, enteredDiscount))
    onSetCustomDiscount(val)
    setShowDiscountDialog(false)
  }

  const handleResetDiscount = () => {
    onSetCustomDiscount(0)
    setDiscountInput('')
    setShowDiscountDialog(false)
  }

  return (
    <>
      <div className="w-full bg-white rounded-xl border border-[#e2e2e2] flex flex-col shadow-2xs overflow-hidden xl:max-h-[calc(100vh-5.5rem)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2e2e2] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-[#262626]">Keranjang Pesanan</h2>
            <p className="text-xs text-gray-500 mt-0.5">{totalItemCount} item dipilih</p>
          </div>

          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto min-h-[160px] max-h-[360px] xl:max-h-[calc(100vh-22rem)]">
          {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4 text-gray-400">
              <ShoppingCart className="w-10 h-10 stroke-1 mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-[#262626]">Keranjang Kosong</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Pilih produk dari katalog untuk menambah pesanan
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-[#f8f8f8] hover:bg-white rounded-lg border border-[#e2e2e2] flex items-center justify-between gap-3 transition shadow-2xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.isBundle && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        BUNDLE
                      </span>
                    )}
                    <div className="font-bold text-xs text-[#262626] truncate">
                      {item.name}
                    </div>
                  </div>

                  {item.bundleDetails && item.bundleDetails.length > 0 && (
                    <div className="space-y-0.5 mt-1">
                      {item.bundleDetails.map((detail, idx) => (
                        <div key={idx} className="text-[10px] text-gray-500 font-medium truncate">
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-0.5 flex items-center gap-1.5">
                    {item.originalPrice > item.finalUnitPrice && (
                      <>
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatRupiah(item.originalPrice)}
                        </span>
                        <span className="bg-red-50 text-red-600 text-[9px] font-bold px-1 py-0.2 rounded border border-red-100">
                          -Rp{formatRupiah(item.originalPrice - item.finalUnitPrice).replace('Rp', '').trim()}
                        </span>
                      </>
                    )}
                    <span className="text-xs font-semibold text-[#00A250]">
                      {formatRupiah(item.finalUnitPrice)}
                    </span>
                  </div>
                </div>

                {/* Cloudflare Clean Stepper */}
                <div className="flex items-center bg-white border border-[#e2e2e2] rounded-md px-1 py-0.5 shadow-2xs">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-600 transition cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-1.5 text-xs font-bold text-[#262626] min-w-5 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center text-[#00A250] hover:bg-[#eef8f2] rounded transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout (Mirrors CashierScreen.kt:647-724 100%) */}
        <div className="p-4 sm:p-5 border-t border-[#e2e2e2] bg-white rounded-b-xl space-y-3 shrink-0">
          <div className="space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-gray-600">
              <span className="font-medium text-sm">Subtotal</span>
              <span className="font-semibold text-sm text-[#262626]">{formatRupiah(subtotal)}</span>
            </div>

            {/* Custom Diskon (Mirrors CashierScreen.kt:655-662 100%) */}
            <div
              onClick={handleOpenDiscountDialog}
              className="flex justify-between items-center py-1 cursor-pointer group select-none"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#00A250]" />
                <span className="font-bold text-sm text-[#00A250] group-hover:underline">
                  Custom Diskon
                </span>
              </div>
              <span className="font-bold text-sm text-[#00A250] group-hover:underline">
                {customDiscount > 0 ? `-${formatRupiah(customDiscount)}` : 'Tambah'}
              </span>
            </div>

            {/* Total Bayar */}
            <div className="flex justify-between items-center pt-2 border-t border-[#e2e2e2]">
              <span className="font-bold text-base text-[#262626]">Total</span>
              <span className="text-[#00A250] text-2xl font-bold">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={onCheckout}
            disabled={items.length === 0 || !isShiftActive}
            className={`w-full h-11 rounded-xl text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs ${
              items.length === 0 || !isShiftActive
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c]'
            }`}
          >
            <span>{!isShiftActive ? 'Mulai Shift Kasir Terlebih Dahulu' : 'Bayar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Diskon Popup Dialog (Mirrors BarakahPopupDialog CashierScreen.kt:627-645) */}
      {showDiscountDialog && (
        <div
          onClick={() => setShowDiscountDialog(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#00A250]" />
                <h3 className="font-bold text-base text-[#262626]">Custom Diskon</h3>
              </div>
              <button
                onClick={() => setShowDiscountDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#262626]">
                    Nominal Diskon (Rp)
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Maks: <b className="text-[#262626]">{formatRupiah(subtotal)}</b>
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  autoFocus
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isDiscountExceeding) handleApplyDiscount()
                    if (e.key === 'Escape') setShowDiscountDialog(false)
                  }}
                  placeholder="0"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-lg font-bold text-[#262626] focus:outline-none shadow-2xs transition ${
                    isDiscountExceeding
                      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-[#e2e2e2] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250]'
                  }`}
                />
              </div>

              {/* Validation Warning */}
              {isDiscountExceeding && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Nominal diskon melebihi subtotal ({formatRupiah(subtotal)})!</span>
                </div>
              )}

              {/* Quick Preset Buttons (Clamped to <= subtotal) */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[5000, 10000, 15000, 20000, 50000].map((preset) => {
                  const isPresetOver = preset > subtotal
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isPresetOver}
                      onClick={() => setDiscountInput(preset.toString())}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition cursor-pointer ${
                        isPresetOver
                          ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                          : 'bg-[#f8f8f8] hover:bg-[#eef8f2] hover:text-[#00A250] hover:border-[#00A250] text-[#262626] border-[#e2e2e2]'
                      }`}
                    >
                      {formatRupiah(preset)}
                    </button>
                  )
                })}
                {subtotal > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountInput(subtotal.toString())}
                    className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-[#00A250] font-bold rounded-lg border border-[#b8e8cc] transition cursor-pointer"
                  >
                    Maks (100%)
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-[#fbfbfb] border-t border-[#e2e2e2] flex items-center justify-between">
              {customDiscount > 0 ? (
                <button
                  type="button"
                  onClick={handleResetDiscount}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                >
                  Hapus Diskon
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscountDialog(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDiscountExceeding || enteredDiscount <= 0}
                  onClick={handleApplyDiscount}
                  className="px-5 py-2 text-xs font-semibold bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

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
  Maximize2,
  Tag,
  Check,
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
  onUpdateCustomDiscount?: (discount: number) => void
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
  onUpdateCustomDiscount,
}: CheckoutModalProps) {
  const [isPending, startTransition] = useTransition()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash')
  const [cashAmountStr, setCashAmountStr] = useState<string>('')
  const [isDigitalPaymentPaid, setIsDigitalPaymentPaid] = useState<boolean>(false)
  const [showExpandedQris, setShowExpandedQris] = useState<boolean>(false)
  const [showDiscountDialog, setShowDiscountDialog] = useState<boolean>(false)
  const [discountInput, setDiscountInput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const cashAmount = parseFloat(cashAmountStr) || 0
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashAmount - total) : 0
  const isCashInsufficient = paymentMethod === 'cash' && cashAmount < total

  const enteredDiscount = parseFloat(discountInput) || 0
  const isDiscountExceeding = enteredDiscount > subtotal

  const isConfirmEnabled =
    paymentMethod === 'cash'
      ? cashAmount >= total
      : isDigitalPaymentPaid

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    50000,
    100000,
  ].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4)

  const handleMethodChange = (method: 'cash' | 'qris' | 'transfer') => {
    setPaymentMethod(method)
    setIsDigitalPaymentPaid(false)
    setError(null)
  }

  const handleApplyDiscount = () => {
    if (isDiscountExceeding) return
    const val = Math.min(subtotal, Math.max(0, enteredDiscount))
    onUpdateCustomDiscount?.(val)
    setShowDiscountDialog(false)
  }

  const handleResetDiscount = () => {
    onUpdateCustomDiscount?.(0)
    setDiscountInput('')
    setShowDiscountDialog(false)
  }

  const handleProcessCheckout = () => {
    if (paymentMethod === 'cash' && isCashInsufficient) {
      setError('Nominal uang tunai yang diterima kurang dari total tagihan.')
      return
    }

    if (paymentMethod !== 'cash' && !isDigitalPaymentPaid) {
      setError('Harap tandai status pembayaran sebagai "Sudah Bayar" terlebih dahulu.')
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
      })

      if (res.success && res.order) {
        onSuccess(res.order)
      } else {
        setError(res.error || 'Terjadi kesalahan saat memproses pesanan')
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#262626]">
                Checkout Pembayaran
              </h3>
              <p className="text-xs text-[#757575] mt-0.5">
                {items.reduce((s, it) => s + it.qty, 0)} produk di keranjang pesanan
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Total Tagihan Card (With Subtotal & Custom Diskon row) */}
            <div className="p-4 bg-[#f8fdf9] rounded-xl border border-[#b8e8cc] space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold text-[#262626]">{formatRupiah(subtotal)}</span>
              </div>

              {/* Custom Diskon (Mirrors CashierScreen.kt:655-662 100%) */}
              <div
                onClick={() => {
                  setDiscountInput(customDiscount > 0 ? customDiscount.toString() : '')
                  setShowDiscountDialog(true)
                }}
                className="flex justify-between items-center py-0.5 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00A250]">
                  <Tag className="w-3.5 h-3.5 text-[#00A250]" />
                  <span className="group-hover:underline">Custom Diskon</span>
                </div>
                <span className="text-xs font-bold text-[#00A250] group-hover:underline">
                  {customDiscount > 0 ? `-${formatRupiah(customDiscount)}` : 'Tambah'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#b8e8cc] flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Total Tagihan:</span>
                <span className="text-2xl font-bold text-[#00A250]">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector (Cash, QRIS, Transfer) */}
            <div>
              <label className="block text-xs font-semibold text-[#262626] mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleMethodChange('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('qris')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'qris'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs">QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('transfer')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Transfer</span>
                </button>
              </div>
            </div>

            {/* Cash Payment Method */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#262626] mb-1.5">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={cashAmountStr}
                    onChange={(e) => setCashAmountStr(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-lg font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashAmountStr(amt.toString())}
                      className="px-3 py-1.5 text-xs bg-[#f8f8f8] hover:bg-[#eef8f2] hover:text-[#00A250] hover:border-[#00A250] text-[#262626] rounded-lg font-medium border border-[#e2e2e2] transition cursor-pointer"
                    >
                      {amt === total ? 'Uang Pas' : formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                <div className="p-3.5 bg-[#f8f8f8] rounded-xl border border-[#e2e2e2] flex justify-between items-center text-xs">
                  <span className="text-[#757575] font-medium">Kembalian:</span>
                  <span
                    className={`font-bold text-base ${
                      isCashInsufficient
                        ? 'text-red-500'
                        : changeAmount > 0
                        ? 'text-[#00A250]'
                        : 'text-[#262626]'
                    }`}
                  >
                    {isCashInsufficient ? 'Uang Kurang' : formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS Payment Method (Mirrors CashierScreen.kt:451-496) */}
            {paymentMethod === 'qris' && (
              <div className="space-y-4 pt-1 flex flex-col items-center">
                <div
                  onClick={() => {
                    if (storeProfile?.qris_image_url) setShowExpandedQris(true)
                  }}
                  className={`w-48 h-48 rounded-xl border border-[#e2e2e2] bg-[#f8f8f8] p-2 flex flex-col items-center justify-center relative overflow-hidden group ${
                    storeProfile?.qris_image_url ? 'cursor-pointer hover:border-[#00A250]' : ''
                  }`}
                >
                  {storeProfile?.qris_image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storeProfile.qris_image_url}
                        alt="QRIS Toko"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition rounded-xl">
                        <Maximize2 className="w-4 h-4" />
                        <span>Perbesar</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400 text-xs">
                      <QrCode className="w-8 h-8 mx-auto mb-1 stroke-1 text-gray-300" />
                      <span>Gambar QRIS</span>
                      <br />
                      <span className="text-[10px] text-gray-400">(Belum diatur di Pengaturan)</span>
                    </div>
                  )}
                </div>

                {storeProfile?.qris_image_url && (
                  <p className="text-[11px] text-gray-400 text-center -mt-2">
                    Ketuk gambar untuk memperbesar QRIS
                  </p>
                )}

                {/* Status Pembayaran Segmented Toggle (Belum Bayar / Sudah Bayar) */}
                <div className="w-full bg-[#f3f4f6] p-1 rounded-full flex items-center justify-between border border-[#e5e7eb]">
                  <button
                    type="button"
                    onClick={() => setIsDigitalPaymentPaid(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition cursor-pointer text-center ${
                      !isDigitalPaymentPaid
                        ? 'bg-white text-red-600 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Belum Bayar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDigitalPaymentPaid(true)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition cursor-pointer text-center ${
                      isDigitalPaymentPaid
                        ? 'bg-[#00A250] text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sudah Bayar
                  </button>
                </div>
              </div>
            )}

            {/* Transfer Bank Payment Method (Mirrors CashierScreen.kt:497-541) */}
            {paymentMethod === 'transfer' && (
              <div className="space-y-4 pt-1 flex flex-col items-center">
                <div className="w-full p-4 bg-[#f8f8f8] rounded-xl border border-[#e2e2e2] text-center space-y-1.5">
                  <span className="text-xs text-gray-500 font-medium">Transfer ke Rekening:</span>
                  <div className="font-bold text-sm sm:text-base font-mono text-[#262626] select-all">
                    {storeProfile?.bank_account_info || 'Belum diatur di Pengaturan'}
                  </div>
                </div>

                {/* Status Pembayaran Segmented Toggle (Belum Bayar / Sudah Bayar) */}
                <div className="w-full bg-[#f3f4f6] p-1 rounded-full flex items-center justify-between border border-[#e5e7eb]">
                  <button
                    type="button"
                    onClick={() => setIsDigitalPaymentPaid(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition cursor-pointer text-center ${
                      !isDigitalPaymentPaid
                        ? 'bg-white text-red-600 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Belum Bayar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDigitalPaymentPaid(true)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition cursor-pointer text-center ${
                      isDigitalPaymentPaid
                        ? 'bg-[#00A250] text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sudah Bayar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer (Mirrors CashierScreen.kt confirm button logic) */}
          <div className="px-5 py-3.5 bg-[#fbfbfb] border-t border-[#e2e2e2] flex justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition shadow-2xs cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleProcessCheckout}
              disabled={isPending || !isConfirmEnabled}
              className="px-6 py-2 text-xs font-semibold bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bayar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded QRIS Dialog */}
      {showExpandedQris && storeProfile?.qris_image_url && (
        <div
          onClick={() => setShowExpandedQris(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setShowExpandedQris(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-sm sm:text-base text-[#262626] mb-3">
              QRIS Barakah Fauna
            </h4>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storeProfile.qris_image_url}
              alt="QRIS Besar"
              className="w-full max-h-[65vh] object-contain rounded-xl border border-[#e2e2e2] p-2 bg-white"
            />
            <p className="text-xs text-gray-500 mt-3 text-center">
              Arahkan kamera atau aplikasi pembayaran pelanggan ke kode QR di atas
            </p>
          </div>
        </div>
      )}

      {/* Custom Diskon Popup Dialog inside Checkout Modal */}
      {showDiscountDialog && (
        <div
          onClick={() => setShowDiscountDialog(false)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60"
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

'use client'

import { useState, useTransition } from 'react'
import { CartItem, Order, StoreProfile, PaymentDetails, PaymentSplitItem } from '@/types/database'
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
  ChevronDown,
  Layers,
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'split'>('cash')
  const [cashAmountStr, setCashAmountStr] = useState<string>('')
  const [isDigitalPaymentPaid, setIsDigitalPaymentPaid] = useState<boolean>(false)
  const [showExpandedQris, setShowExpandedQris] = useState<boolean>(false)
  const [showDiscountDialog, setShowDiscountDialog] = useState<boolean>(false)
  const [discountInput, setDiscountInput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // State untuk Split Pembayaran (2 Metode)
  const [splitMethod1, setSplitMethod1] = useState<'cash' | 'qris' | 'transfer'>('cash')
  const [splitAmount1Str, setSplitAmount1Str] = useState<string>('')
  const [splitMethod2, setSplitMethod2] = useState<'cash' | 'qris' | 'transfer'>('qris')
  const [splitCashReceivedStr, setSplitCashReceivedStr] = useState<string>('')
  const [isSplitDigital1Paid, setIsSplitDigital1Paid] = useState<boolean>(false)
  const [isSplitDigital2Paid, setIsSplitDigital2Paid] = useState<boolean>(false)

  if (!isOpen) return null

  // Kalkulasi Pembayaran Normal
  const cashAmount = parseFloat(cashAmountStr) || 0
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashAmount - total) : 0
  const isCashInsufficient = paymentMethod === 'cash' && cashAmount < total

  // Kalkulasi Split Pembayaran
  const splitAmount1 = parseFloat(splitAmount1Str) || 0
  const splitAmount2 = Math.max(0, total - splitAmount1)
  const isSplitCash1 = splitMethod1 === 'cash'
  const isSplitCash2 = splitMethod2 === 'cash'
  const isSplitCashInvolved = isSplitCash1 || isSplitCash2
  const splitCashAllocated = isSplitCash1 ? splitAmount1 : isSplitCash2 ? splitAmount2 : 0
  const splitCashReceived = parseFloat(splitCashReceivedStr) || 0
  const splitCashChange = Math.max(0, splitCashReceived - splitCashAllocated)
  const isSplitCashInsufficient = isSplitCashInvolved && splitCashReceived < splitCashAllocated

  const isSplitAmount1Valid = splitAmount1 > 0 && splitAmount1 < total
  const isSplitDigital1Valid = isSplitCash1 ? !isSplitCashInsufficient : isSplitDigital1Paid
  const isSplitDigital2Valid = isSplitCash2 ? !isSplitCashInsufficient : isSplitDigital2Paid

  const isSplitReady =
    isSplitAmount1Valid &&
    (!isSplitCashInvolved || !isSplitCashInsufficient) &&
    isSplitDigital1Valid &&
    isSplitDigital2Valid

  const enteredDiscount = parseFloat(discountInput) || 0
  const isDiscountExceeding = enteredDiscount > subtotal

  const isConfirmEnabled =
    paymentMethod === 'split'
      ? isSplitReady
      : paymentMethod === 'cash'
      ? cashAmount >= total
      : isDigitalPaymentPaid

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 20000) * 20000,
    50000,
    100000,
  ].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4)

  const handleMethodChange = (method: 'cash' | 'qris' | 'transfer' | 'split') => {
    setPaymentMethod(method)
    setIsDigitalPaymentPaid(false)
    setIsSplitDigital1Paid(false)
    setIsSplitDigital2Paid(false)
    setError(null)
    if (method === 'split' && !splitAmount1Str) {
      const half = Math.floor(total / 2)
      const initialAmt = half > 0 ? half : Math.min(10000, total)
      setSplitAmount1Str(initialAmt.toString())
      if (splitMethod1 === 'cash') {
        setSplitCashReceivedStr(initialAmt.toString())
      }
    }
  }

  const handleSplitMethod1Change = (newM1: 'cash' | 'qris' | 'transfer') => {
    setSplitMethod1(newM1)
    setIsSplitDigital1Paid(false)
    if (newM1 === splitMethod2) {
      // Ganti method 2 agar tidak sama
      const fallback = newM1 === 'cash' ? 'qris' : newM1 === 'qris' ? 'cash' : 'cash'
      setSplitMethod2(fallback)
      setIsSplitDigital2Paid(false)
    }
  }

  const handleSplitMethod2Change = (newM2: 'cash' | 'qris' | 'transfer') => {
    setSplitMethod2(newM2)
    setIsSplitDigital2Paid(false)
    if (newM2 === splitMethod1) {
      const fallback = newM2 === 'cash' ? 'qris' : newM2 === 'qris' ? 'cash' : 'cash'
      setSplitMethod1(fallback)
      setIsSplitDigital1Paid(false)
    }
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

    if (paymentMethod !== 'cash' && paymentMethod !== 'split' && !isDigitalPaymentPaid) {
      setError('Harap tandai status pembayaran sebagai "Sudah Bayar" terlebih dahulu.')
      return
    }

    if (paymentMethod === 'split') {
      if (!isSplitAmount1Valid) {
        setError('Nominal pembayaran pertama harus lebih dari Rp 0 dan kurang dari total tagihan.')
        return
      }
      if (isSplitCashInvolved && isSplitCashInsufficient) {
        setError('Uang tunai diterima kurang dari nominal yang ditentukan.')
        return
      }
      if (!isSplitCash1 && !isSplitDigital1Paid) {
        setError(`Harap tandai status pembayaran ${splitMethod1.toUpperCase()} sebagai "Sudah Bayar".`)
        return
      }
      if (!isSplitCash2 && !isSplitDigital2Paid) {
        setError(`Harap tandai status pembayaran ${splitMethod2.toUpperCase()} sebagai "Sudah Bayar".`)
        return
      }
    }

    setError(null)
    startTransition(async () => {
      let finalCashAmount = paymentMethod === 'cash' ? cashAmount : total
      let finalChangeAmount = changeAmount
      let paymentDetails: PaymentDetails | null = null

      if (paymentMethod === 'split') {
        finalCashAmount = isSplitCashInvolved ? splitCashReceived : 0
        finalChangeAmount = isSplitCashInvolved ? splitCashChange : 0
        paymentDetails = {
          type: 'split',
          payments: [
            {
              method: splitMethod1,
              amount: splitAmount1,
              ...(isSplitCash1
                ? { cash_received: splitCashReceived, change: splitCashChange }
                : { is_paid: isSplitDigital1Paid }),
            },
            {
              method: splitMethod2,
              amount: splitAmount2,
              ...(isSplitCash2
                ? { cash_received: splitCashReceived, change: splitCashChange }
                : { is_paid: isSplitDigital2Paid }),
            },
          ],
        }
      }

      const res = await createOrderAction({
        items,
        subtotal,
        customDiscount,
        total,
        paymentMethod,
        cashAmount: finalCashAmount,
        changeAmount: finalChangeAmount,
        paymentDetails,
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

            {/* Payment Method Selector (Dropdown + Quick Buttons) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#262626]">
                  Metode Pembayaran
                </label>
                {paymentMethod === 'split' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-500" />
                    <span>Split 2 Metode</span>
                  </span>
                )}
              </div>

              {/* Dropdown Selector */}
              <div className="relative mb-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => handleMethodChange(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#e2e2e2] rounded-xl text-xs font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs appearance-none cursor-pointer pr-8"
                >
                  <option value="cash">💵 Tunai (Cash)</option>
                  <option value="qris">📱 QRIS Digital</option>
                  <option value="transfer">💳 Transfer Bank</option>
                  <option value="split">🔀 Split Pembayaran (Kombinasi 2 Metode)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Quick Tab Selector (Cash, QRIS, Transfer, Split) */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMethodChange('cash')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span className="text-[11px]">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('qris')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'qris'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span className="text-[11px]">QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('transfer')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px]">Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodChange('split')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'split'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold shadow-xs'
                      : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span className="text-[11px]">Split</span>
                </button>
              </div>
            </div>

            {/* Cash Payment Method (Normal) */}
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

            {/* QRIS Payment Method (Normal) */}
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

            {/* Transfer Bank Payment Method (Normal) */}
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

            {/* Split Payment Section (Multi-Metode) */}
            {paymentMethod === 'split' && (
              <div className="space-y-3.5 pt-1">
                {/* Method 1 Card */}
                <div className="p-3 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                      Pembayaran 1
                    </span>
                    <select
                      value={splitMethod1}
                      onChange={(e) => handleSplitMethod1Change(e.target.value as any)}
                      className="text-xs font-semibold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc] rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="cash">💵 Tunai (Cash)</option>
                      <option value="qris">📱 QRIS</option>
                      <option value="transfer">💳 Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">
                      Nominal Pembayaran 1 (Rp)
                    </label>
                    <input
                      type="number"
                      value={splitAmount1Str}
                      onChange={(e) => setSplitAmount1Str(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none"
                    />
                  </div>

                  {/* Preset quick buttons for Method 1 */}
                  <div className="flex flex-wrap gap-1.5">
                    {[5000, 10000, 20000, 50000]
                      .filter((amt) => amt < total)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSplitAmount1Str(amt.toString())}
                          className="px-2 py-1 text-[11px] bg-[#f8f8f8] hover:bg-[#eef8f2] text-gray-700 rounded-lg border border-[#e2e2e2] cursor-pointer"
                        >
                          {formatRupiah(amt)}
                        </button>
                      ))}
                    {total > 1000 && (
                      <button
                        type="button"
                        onClick={() => setSplitAmount1Str(Math.floor(total / 2).toString())}
                        className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 font-semibold cursor-pointer"
                      >
                        50% Tagihan
                      </button>
                    )}
                  </div>

                  {/* Digital verification for Method 1 if non-cash */}
                  {!isSplitCash1 && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Status Pembayaran 1:</span>
                      <button
                        type="button"
                        onClick={() => setIsSplitDigital1Paid(!isSplitDigital1Paid)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                          isSplitDigital1Paid
                            ? 'bg-[#00A250] text-white shadow-2xs'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {isSplitDigital1Paid ? '✓ Sudah Bayar' : 'Belum Bayar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Method 2 Card */}
                <div className="p-3 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                      Pembayaran 2 (Sisa Tagihan)
                    </span>
                    <select
                      value={splitMethod2}
                      onChange={(e) => handleSplitMethod2Change(e.target.value as any)}
                      className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="qris">📱 QRIS</option>
                      <option value="transfer">💳 Transfer</option>
                      <option value="cash">💵 Tunai (Cash)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">
                      Nominal Pembayaran 2 (Otomatis)
                    </label>
                    <div className="px-3 py-2 bg-[#f8f8f8] border border-[#e2e2e2] rounded-xl text-base font-bold text-[#00A250] flex items-center justify-between">
                      <span>{formatRupiah(splitAmount2)}</span>
                      <span className="text-[10px] font-normal text-gray-400">Auto Sisa Tagihan</span>
                    </div>
                  </div>

                  {/* QRIS / Transfer info preview for Method 2 or 1 */}
                  {(splitMethod1 === 'qris' || splitMethod2 === 'qris') && storeProfile?.qris_image_url && (
                    <div className="flex items-center justify-between p-2 bg-[#fafafa] rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storeProfile.qris_image_url}
                          alt="QRIS Mini"
                          className="w-7 h-7 object-contain rounded border border-gray-200 bg-white cursor-pointer"
                          onClick={() => setShowExpandedQris(true)}
                        />
                        <span className="text-[11px] text-gray-600">Kode QRIS Tersedia</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowExpandedQris(true)}
                        className="text-[10px] text-[#00A250] font-semibold hover:underline"
                      >
                        Perbesar QR
                      </button>
                    </div>
                  )}

                  {/* Digital verification for Method 2 if non-cash */}
                  {!isSplitCash2 && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Status Pembayaran 2:</span>
                      <button
                        type="button"
                        onClick={() => setIsSplitDigital2Paid(!isSplitDigital2Paid)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                          isSplitDigital2Paid
                            ? 'bg-[#00A250] text-white shadow-2xs'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {isSplitDigital2Paid ? '✓ Sudah Bayar' : 'Belum Bayar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Cash Drawer Reconciliation (If cash is one of the methods) */}
                {isSplitCashInvolved && (
                  <div className="p-3 bg-[#fdfdfd] rounded-xl border border-emerald-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">
                        Uang Tunai Kasir ({formatRupiah(splitCashAllocated)})
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        Uang Tunai Fisik Diterima (Rp)
                      </label>
                      <input
                        type="number"
                        value={splitCashReceivedStr}
                        onChange={(e) => setSplitCashReceivedStr(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setSplitCashReceivedStr(splitCashAllocated.toString())}
                        className="px-2.5 py-1 text-[11px] bg-emerald-50 text-[#00A250] font-semibold rounded-lg border border-[#b8e8cc] cursor-pointer"
                      >
                        Uang Pas ({formatRupiah(splitCashAllocated)})
                      </button>
                      {[10000, 20000, 50000, 100000]
                        .filter((v) => v >= splitCashAllocated)
                        .slice(0, 3)
                        .map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setSplitCashReceivedStr(amt.toString())}
                            className="px-2 py-1 text-[11px] bg-[#f8f8f8] hover:bg-[#eef8f2] text-gray-700 rounded-lg border border-[#e2e2e2] cursor-pointer"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                    </div>

                    {/* Kembalian Tunai */}
                    <div className="p-2.5 bg-white rounded-lg border border-[#e2e2e2] flex justify-between items-center text-xs">
                      <span className="text-gray-500">Kembalian Tunai:</span>
                      <span
                        className={`font-bold text-sm ${
                          isSplitCashInsufficient
                            ? 'text-red-500'
                            : splitCashChange > 0
                            ? 'text-[#00A250]'
                            : 'text-[#262626]'
                        }`}
                      >
                        {isSplitCashInsufficient ? 'Uang Kurang' : formatRupiah(splitCashChange)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Ringkasan Alokasi Split */}
                <div className="p-3 bg-[#eef8f2] rounded-xl border border-[#b8e8cc] text-[11px] space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>
                      {splitMethod1.toUpperCase()} ({formatRupiah(splitAmount1)}) +{' '}
                      {splitMethod2.toUpperCase()} ({formatRupiah(splitAmount2)})
                    </span>
                    <span className="text-[#00A250] font-bold">{formatRupiah(total)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {splitAmount1 + splitAmount2 === total && splitAmount1 > 0
                      ? '✓ Pembayaran pas dengan total tagihan'
                      : '⚠️ Pembagian nominal belum pas'}
                  </div>
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

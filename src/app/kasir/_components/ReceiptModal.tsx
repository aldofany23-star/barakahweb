'use client'

import { useRef, useState } from 'react'
import { Order, CartItem, StoreProfile } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Printer, ChevronLeft, X, Loader2, CheckCircle2 } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { isValidWhatsAppPhone, shareReceiptToWhatsApp } from '@/lib/whatsapp'

interface ReceiptModalProps {
  order: Order | null
  items: CartItem[]
  storeProfile: StoreProfile | null
  isOpen: boolean
  onClose: () => void
}

function formatReceiptDateTime(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ReceiptModal({
  order,
  items,
  storeProfile,
  isOpen,
  onClose,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!isOpen || !order) return null

  const hasWhatsApp = isValidWhatsAppPhone(order.table_number)

  const handlePrint = () => {
    if (!receiptRef.current) {
      window.print()
      return
    }

    // Buat kontainer cetak langsung di body agar terisolasi dari sisa halaman kasir
    const printDiv = document.createElement('div')
    printDiv.id = 'pos-print-area'
    printDiv.className = receiptRef.current.className
    printDiv.innerHTML = receiptRef.current.innerHTML
    document.body.appendChild(printDiv)

    document.body.classList.add('is-printing-struk')

    const cleanup = () => {
      document.body.classList.remove('is-printing-struk')
      if (document.body.contains(printDiv)) {
        document.body.removeChild(printDiv)
      }
      window.removeEventListener('afterprint', cleanup)
    }

    window.addEventListener('afterprint', cleanup)

    window.print()

    setTimeout(cleanup, 1500)
  }

  const handleShareWhatsApp = async () => {
    if (!receiptRef.current || !order || !order.table_number) return
    setIsSharing(true)
    setToastMessage(null)
    try {
      const res = await shareReceiptToWhatsApp({
        element: receiptRef.current,
        phone: order.table_number,
        storeProfile,
      })
      if (res.success && res.message && res.method === 'clipboard_and_web') {
        setToastMessage(res.message)
        setTimeout(() => setToastMessage(null), 6000)
      }
    } catch (err) {
      console.error('Share WhatsApp error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  // Perhitungan persis 100% sesuai ReceiptTicketView di SharedComponents.kt
  const itemDiscountTotal = items.reduce(
    (sum, it) =>
      sum +
      (it.originalPrice > it.finalUnitPrice
        ? (it.originalPrice - it.finalUnitPrice) * it.qty
        : 0),
    0
  )
  const trueSubtotal = (order.subtotal || 0) + itemDiscountTotal
  const customDiscount = order.custom_discount || 0
  const total = order.total || 0
  const orderDateStr = formatReceiptDateTime(order.created_at)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 print:static print:inset-auto print:p-0 print:bg-white print:block print:h-auto print:overflow-visible">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:overflow-visible">
          {/* Header (Mirrors CashierScreen.kt:233-255) */}
          <div className="px-4 py-3.5 border-b border-[#e2e2e2] flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1 text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                title="Kembali"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h3 className="font-bold text-base text-[#262626]">
                Pembayaran Berhasil!
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Receipt Area */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-gray-50 print:bg-white print:p-0">
            {/* Ticket Card (Mirrors ReceiptTicketView Surface) */}
            <div
              id="printable-receipt"
              ref={receiptRef}
              className="w-full bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-xs font-mono text-xs text-black print:border-none print:shadow-none print:p-0 print:rounded-none"
            >
              {/* Top Order Number */}
              <div className="text-center text-[11px] text-gray-500 mb-2">
                {order.order_number}
              </div>

              {/* Logo Toko */}
              <div className="flex justify-center mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-128.png"
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    // Fallback to hide if missing
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
              </div>

              {/* Nama & Info Toko */}
              <div className="text-center space-y-0.5 mb-3">
                <h2 className="text-lg font-bold uppercase tracking-wide text-black">
                  {storeProfile?.store_name || 'BARAKAH FAUNA'}
                </h2>
                {storeProfile?.address && (
                  <p className="text-[11px] text-gray-700 text-center leading-tight">
                    {storeProfile.address}
                  </p>
                )}
                {storeProfile?.whatsapp && (
                  <p className="text-[11px] text-gray-700">
                    {storeProfile.whatsapp}
                  </p>
                )}
                {storeProfile?.tagline && (
                  <p className="text-[11px] text-gray-700">
                    {storeProfile.tagline}
                  </p>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Waktu & Kasir Info */}
              <div className="text-[11px] space-y-1 mb-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div>{orderDateStr}</div>
                    <div>Kasir: {order.cashier_name || 'Kasir'}</div>
                    {order.table_number && (
                      <div>Pelanggan: {order.table_number}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div>Tipe:</div>
                    <div className="font-bold uppercase text-black">
                      {order.payment_method}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-black pt-0.5">
                  {order.order_number}
                </div>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Daftar Items (Mirrors ReceiptTicketView items.forEach) */}
              <div className="space-y-2 mb-2">
                {items.map((item, idx) => {
                  const hasDiscount = item.originalPrice > item.finalUnitPrice
                  const discountPerItem = item.originalPrice - item.finalUnitPrice

                  return (
                    <div key={idx} className="flex items-start justify-between gap-1 text-[11px]">
                      {/* Nama item & detail bundle */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="text-black font-medium leading-tight">
                          {item.name}
                        </div>
                        {item.bundleDetails && item.bundleDetails.length > 0 && (
                          <div className="space-y-0.5 mt-0.5">
                            {item.bundleDetails.map((detail, dIdx) => (
                              <div key={dIdx} className="text-[10px] text-gray-500">
                                {detail.startsWith('-') ? detail : `- ${detail}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="w-8 text-center text-black shrink-0">
                        {item.qty}x
                      </div>

                      {/* Coret Promo Diskon jika ada */}
                      <div className="w-20 text-right shrink-0">
                        {hasDiscount ? (
                          <div className="leading-tight">
                            <div className="text-[10px] text-gray-400 line-through">
                              {formatRupiah(item.originalPrice * item.qty)}
                            </div>
                            <div className="text-[10px] text-red-600 font-medium">
                              ({formatRupiah(discountPerItem * item.qty)})
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Total Harga Item */}
                      <div className="w-20 text-right font-medium text-black shrink-0">
                        {formatRupiah(item.finalUnitPrice * item.qty)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Perhitungan Summary (Mirrors ReceiptTicketView calculation 100%) */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{formatRupiah(trueSubtotal)}</span>
                </div>

                {itemDiscountTotal > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>DISKON</span>
                    <span>{formatRupiah(itemDiscountTotal)}</span>
                  </div>
                )}

                {customDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>DISKON KASIR</span>
                    <span>{formatRupiah(customDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-sm text-black pt-1">
                  <span>TOTAL AKHIR</span>
                  <span>{formatRupiah(total)}</span>
                </div>

                <div className="flex justify-between text-[11px] text-black">
                  <span>TOTAL BAYAR</span>
                  <span>{formatRupiah(total)}</span>
                </div>

                {order.payment_method?.toLowerCase() === 'cash' && (
                  <>
                    <div className="flex justify-between text-black">
                      <span>TUNAI</span>
                      <span>{formatRupiah(order.cash_amount != null ? order.cash_amount : total)}</span>
                    </div>
                    <div className="flex justify-between text-black font-semibold">
                      <span>KEMBALI</span>
                      <span>{formatRupiah(order.change_amount != null ? order.change_amount : 0)}</span>
                    </div>
                  </>
                )}

                {order.payment_method?.toLowerCase() === 'split' && order.payment_details?.payments && (
                  <div className="pt-1.5 border-t border-dashed border-gray-300 space-y-1">
                    <div className="text-[10px] font-bold text-black uppercase">
                      Rincian Pembayaran:
                    </div>
                    {order.payment_details.payments.map((p, pIdx) => {
                      const isCash = String(p.method).toLowerCase() === 'cash'
                      return (
                        <div key={pIdx} className="space-y-0.5">
                          <div className="flex justify-between text-black">
                            <span>- {String(p.method).toUpperCase()}</span>
                            <span className="font-medium">{formatRupiah(p.amount)}</span>
                          </div>
                          {isCash && p.cash_received && p.cash_received > 0 ? (
                            <div className="text-[10px] text-gray-600 pl-2">
                              Diterima: {formatRupiah(p.cash_received)}
                              {p.change != null && p.change > 0 ? ` • Kembali: ${formatRupiah(p.change)}` : ''}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                    {order.change_amount > 0 && (
                      <div className="flex justify-between text-black font-semibold pt-0.5">
                        <span>TOTAL KEMBALI</span>
                        <span>{formatRupiah(order.change_amount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-3" />

              {/* Footer Struk (Mirrors ~~~ Terimakasih ~~~) */}
              <div className="text-center text-[11px] text-black space-y-0.5">
                <div className="font-medium">~~~ Terimakasih ~~~</div>
                {storeProfile?.tagline && (
                  <div className="text-[10px] text-gray-600">
                    {storeProfile.tagline}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {toastMessage && (
            <div className="mx-5 mb-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2 print:hidden animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#00A250] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Sticky Footer Buttons */}
          <div className="px-5 py-3.5 bg-white border-t border-[#e2e2e2] flex items-center gap-2 sm:gap-2.5 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="h-10 px-3.5 sm:px-4 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 hover:text-[#262626] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">Print Struk</span>
              <span className="sm:hidden">Print</span>
            </button>

            {hasWhatsApp && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSharing}
                title={`Kirim WhatsApp ke ${order.table_number}`}
                className="h-10 px-3.5 sm:px-4 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-emerald-50/50 hover:border-emerald-300 hover:text-emerald-700 active:scale-[0.98] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00A250] shrink-0" />
                ) : (
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                )}
                <span>Share WA</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 text-xs sm:text-sm font-bold text-white bg-[#00A250] hover:bg-[#008f46] active:scale-[0.98] rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style jsx global>{`
        #pos-print-area {
          display: none;
        }

        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          html,
          body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Sembunyikan semua elemen aplikasi di body saat print struk */
          body.is-printing-struk > *:not(#pos-print-area) {
            display: none !important;
          }

          /* Tampilkan HANYA struk dengan lebar thermal standar 80mm */
          body.is-printing-struk #pos-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 6px 8px !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Fallback jika menggunakan shortcut Ctrl+P langsung */
          body:not(.is-printing-struk) * {
            visibility: hidden;
          }
          body:not(.is-printing-struk) #printable-receipt,
          body:not(.is-printing-struk) #printable-receipt * {
            visibility: visible;
          }
          body:not(.is-printing-struk) #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto;
            padding: 4px 6px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

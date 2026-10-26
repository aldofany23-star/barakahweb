'use client'

import { useRef } from 'react'
import { Order, CartItem, StoreProfile } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Printer, ChevronLeft, X } from 'lucide-react'

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

  if (!isOpen || !order) return null

  const handlePrint = () => {
    window.print()
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 print:p-0 print:bg-white">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full">
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
                  src="/logo.png"
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
                      <span>{formatRupiah(order.cash_amount)}</span>
                    </div>
                    <div className="flex justify-between text-black font-semibold">
                      <span>KEMBALI</span>
                      <span>{formatRupiah(order.change_amount)}</span>
                    </div>
                  </>
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

          {/* Sticky Footer Buttons (Mirrors CashierScreen.kt:295-396) */}
          <div className="px-5 py-3.5 bg-white border-t border-[#e2e2e2] flex items-center gap-2.5 print:hidden">
            <button
              onClick={handlePrint}
              className="h-11 px-4 text-xs font-semibold text-[#00A250] bg-white border border-[#00A250] hover:bg-[#eef8f2] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Struk</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 h-11 text-xs sm:text-sm font-bold text-white bg-[#00A250] hover:bg-[#008f46] rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

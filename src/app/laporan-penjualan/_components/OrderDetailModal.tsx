'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Order, OrderItem, StoreProfile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { X, Printer, Receipt, Loader2, CheckCircle2 } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { isValidWhatsAppPhone, shareReceiptToWhatsApp } from '@/lib/whatsapp'

interface OrderDetailModalProps {
  order: Order | null
  storeProfile: StoreProfile | null
  isOpen: boolean
  onClose: () => void
}

interface ReceiptTicketItem {
  name: string
  qty: number
  price: number
  totalPrice: number
  originalPrice?: number | null
  details?: string[] | null
  appliedPromoName?: string | null
}

function formatReceiptDateTime(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function OrderDetailModal({
  order,
  storeProfile,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [loadedItems, setLoadedItems] = useState<OrderItem[]>(order?.order_items || [])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const hasWhatsApp = isValidWhatsAppPhone(order?.table_number)

  // Fetch order items on-demand when modal is open if not already loaded
  useEffect(() => {
    if (!order || !isOpen) return

    if (order.order_items && order.order_items.length > 0) {
      setLoadedItems(order.order_items)
      return
    }

    let isMounted = true
    setIsLoadingItems(true)
    const supabase = createClient()
    supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order.id)
      .then(({ data, error }) => {
        if (isMounted) {
          setIsLoadingItems(false)
          if (data) {
            setLoadedItems(data as OrderItem[])
          }
        }
      })

    return () => {
      isMounted = false
    }
  }, [order, isOpen])

  // Group bundle items vs single items (100% mirrors Android SharedComponents.kt & OrdersScreen.kt)
  const receiptItems = useMemo(() => {
    if (!loadedItems || loadedItems.length === 0) return []

    const items: ReceiptTicketItem[] = []
    const bundleGroups: { [bundleName: string]: OrderItem[] } = {}

    loadedItems.forEach((item) => {
      if (item.bundle_name) {
        if (!bundleGroups[item.bundle_name]) bundleGroups[item.bundle_name] = []
        bundleGroups[item.bundle_name].push(item)
      } else {
        const origPrice = item.product?.sell_price || item.unit_price
        items.push({
          name: item.product?.name || 'Produk Terhapus',
          qty: item.qty,
          price: item.unit_price,
          totalPrice: item.total_price,
          originalPrice: origPrice > item.unit_price ? origPrice : null,
          appliedPromoName: item.applied_promo_name,
        })
      }
    })

    // Grouped bundles
    Object.entries(bundleGroups).forEach(([bName, bItems]) => {
      const origTotal = bItems.reduce(
        (sum, i) => sum + (i.product?.sell_price || i.unit_price) * i.qty,
        0
      )
      const finalTotal = bItems.reduce((sum, i) => sum + i.total_price, 0)
      const details = bItems.map(
        (i) => `- ${i.product?.name || 'Produk Terhapus'} (x${i.qty})`
      )

      items.push({
        name: bName,
        qty: 1,
        price: finalTotal,
        totalPrice: finalTotal,
        originalPrice: origTotal > finalTotal ? origTotal : null,
        details,
      })
    })

    return items
  }, [loadedItems])

  if (!isOpen || !order) return null

  const handlePrint = () => {
    window.print()
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

  // Exact Android calculations
  const itemDiscountTotal = receiptItems.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.qty
    }
    return sum
  }, 0)

  const customDiscount = order.custom_discount || 0
  const total = order.total || 0
  // Mirroring Android: val trueSubtotal = order.total + order.customDiscount + itemDiscountTotal
  const trueSubtotal = total + customDiscount + itemDiscountTotal
  const orderDateStr = formatReceiptDateTime(order.created_at)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 print:p-0 print:bg-white">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[92vh] print:border-none print:shadow-none print:w-full print:max-w-none">
          {/* Header Dialog */}
          <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#eef8f2] text-[#00A250] rounded-lg border border-[#b8e8cc]">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                Struk Pembayaran
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Struk Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-gray-50 print:bg-white print:p-0">
            <div
              id="printable-receipt"
              ref={receiptRef}
              className="w-full bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-xs font-mono text-xs text-black print:border-none print:shadow-none print:p-0 print:rounded-none"
            >
              {/* Order Number Top (Mirrors Android SharedComponents.kt) */}
              <div className="text-center text-[12px] text-gray-500 mb-2">
                {order.order_number}
              </div>

              {/* Logo */}
              <div className="flex justify-center mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-128.png"
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
              </div>

              {/* Toko Header */}
              <div className="text-center space-y-0.5 mb-3">
                <h2 className="text-lg font-bold uppercase tracking-wide text-black">
                  {storeProfile?.store_name || 'BARAKAH FAUNA'}
                </h2>
                {storeProfile?.address && (
                  <p className="text-[12px] text-gray-700 text-center leading-tight">
                    {storeProfile.address}
                  </p>
                )}
                {storeProfile?.whatsapp && (
                  <p className="text-[12px] text-gray-700">
                    {storeProfile.whatsapp}
                  </p>
                )}
                {storeProfile?.tagline && (
                  <p className="text-[12px] text-gray-700">
                    {storeProfile.tagline}
                  </p>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Info Transaksi */}
              <div className="text-[12px] space-y-1 mb-1">
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
                <div className="text-[12px] text-black pt-0.5">
                  {order.order_number}
                </div>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Items List (Supports Bundling & Single Promos) */}
              <div className="space-y-2 mb-2">
                {isLoadingItems ? (
                  <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00A250]" />
                    <span>Memuat rincian item...</span>
                  </div>
                ) : receiptItems.length > 0 ? (
                  receiptItems.map((item, idx) => {
                    const hasDiscount =
                      item.originalPrice != null && item.originalPrice > item.price
                    const discountAmount = hasDiscount
                      ? (item.originalPrice! - item.price) * item.qty
                      : 0

                    return (
                      <div key={idx} className="space-y-0.5 text-[12px]">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="text-black font-medium leading-tight">
                              {item.name}
                            </div>
                            {item.details &&
                              item.details.map((d, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="text-[10px] text-gray-500 pl-1"
                                >
                                  {d}
                                </div>
                              ))}
                            {item.appliedPromoName && (
                              <div className="text-[10px] text-red-600 pl-1">
                                Promo: {item.appliedPromoName}
                              </div>
                            )}
                          </div>

                          <div className="w-8 text-center text-black shrink-0">
                            {item.qty}x
                          </div>

                          <div className="w-20 text-right shrink-0">
                            {hasDiscount ? (
                              <div className="leading-tight">
                                <div className="text-[10px] text-gray-400 line-through">
                                  {formatRupiah(item.originalPrice! * item.qty)}
                                </div>
                                <div className="text-[10px] text-red-600 font-medium">
                                  ({formatRupiah(discountAmount)})
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="w-20 text-right font-medium text-black shrink-0">
                            {formatRupiah(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-[12px] text-gray-400 py-1 text-center">
                    Tidak ada rincian item
                  </div>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-gray-300 my-2.5" />

              {/* Summary Calculations (Mirrors Android SharedComponents.kt) */}
              <div className="space-y-1 text-[12px]">
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

                <div className="flex justify-between text-[12px] text-black">
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
                    <div className="text-[11px] font-bold text-black uppercase">
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
                            <div className="text-[11px] text-gray-600 pl-2">
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

              {/* Footer Struk */}
              <div className="text-center text-[12px] text-black space-y-0.5">
                <div className="font-medium">~~~ Terimakasih ~~~</div>
                {storeProfile?.tagline && (
                  <div className="text-[11px] text-gray-600">
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

          {/* Action Buttons */}
          <div className="px-5 py-3.5 bg-white border-t border-[#e2e2e2] flex items-center justify-end gap-2 sm:gap-2.5 print:hidden">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              Tutup
            </button>

            {hasWhatsApp && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSharing || isLoadingItems}
                title={`Kirim WhatsApp ke ${order.table_number}`}
                className="h-10 px-3.5 sm:px-4 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-emerald-50/50 hover:border-emerald-300 hover:text-emerald-700 active:scale-[0.98] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
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
              onClick={handlePrint}
              disabled={isLoadingItems}
              className="h-10 px-4 sm:px-5 text-xs font-semibold bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Struk</span>
            </button>
          </div>
        </div>
      </div>

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
            padding: 8px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

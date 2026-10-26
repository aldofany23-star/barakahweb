'use client'

import { useState, useEffect } from 'react'
import {
  Product,
  Category,
  Discount,
  Bundle,
  BundleItem,
  CartItem,
  Shift,
  StoreProfile,
  Order,
} from '@/types/database'
import { ProductGrid } from './ProductGrid'
import { CartSidebar } from './CartSidebar'
import { CheckoutModal } from './CheckoutModal'
import { ReceiptModal } from './ReceiptModal'
import { BarakahPopupModal } from '@/components/ui/BarakahPopupModal'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react'

interface CashierViewProps {
  initialProducts: Product[]
  initialTotalCount: number
  categories: Category[]
  discounts: Discount[]
  bundles: (Bundle & { items: (BundleItem & { product?: Product | null })[] })[]
  currentShift: Shift | null
  storeProfile: StoreProfile | null
}

export function CashierView({
  initialProducts,
  initialTotalCount,
  categories,
  discounts,
  bundles,
  currentShift,
  storeProfile,
}: CashierViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [customDiscount, setCustomDiscount] = useState<number>(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null)
  const [lastReceiptItems, setLastReceiptItems] = useState<CartItem[]>([])

  // Modal alert dialog pengganti alert() browser bawaan
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    icon?: 'warning' | 'info' | 'error' | 'success'
  }>({
    isOpen: false,
    title: '',
    message: '',
    icon: 'warning',
  })

  // Mobile / Tablet Tab Switcher (Matches line 70 CashierScreen.kt: ["Produk", "Keranjang"])
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  // Setup Supabase Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_products_pos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Product
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            )
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Product
            setProducts((prev) => [inserted, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Kalkulasi total
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const grandTotal = Math.max(0, subtotal - customDiscount)
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.qty, 0)

  // Handlers Keranjang
  const handleAddToCart = (product: Product, discount?: Discount) => {
    if (product.stock_qty <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Stok Habis',
        message: `Stok produk "${product.name}" saat ini habis (0)!`,
        icon: 'warning',
      })
      return
    }

    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === product.id)
      let finalUnit = product.sell_price

      if (discount && discount.is_active) {
        if (discount.type === 'percentage') {
          finalUnit = product.sell_price - (product.sell_price * discount.value) / 100
        } else {
          finalUnit = Math.max(0, product.sell_price - discount.value)
        }
      }

      if (existing) {
        const nextQty = existing.qty + 1
        if (nextQty > product.stock_qty) {
          setAlertModal({
            isOpen: true,
            title: 'Maksimal Stok Tercapai',
            message: `Maksimal stok tercapai: ${product.stock_qty}`,
            icon: 'warning',
          })
          return prev
        }
        return prev.map((it) =>
          it.id === product.id
            ? { ...it, qty: nextQty, totalPrice: nextQty * it.finalUnitPrice }
            : it
        )
      } else {
        return [
          ...prev,
          {
            id: product.id,
            product,
            name: product.name,
            qty: 1,
            originalPrice: product.sell_price,
            finalUnitPrice: finalUnit,
            totalPrice: finalUnit,
            appliedPromoName: discount?.name,
            isBundle: false,
          },
        ]
      }
    })
  }

  const handleAddBundleToCart = (
    bundle: Bundle & { items: (BundleItem & { product?: Product | null })[] }
  ) => {
    // Check if any product in bundle is out of stock
    const outOfStockItem = bundle.items.find(
      (bi) => (bi.product?.stock_qty || 0) < bi.qty
    )
    if (outOfStockItem) {
      setAlertModal({
        isOpen: true,
        title: 'Stok Tidak Mencukupi',
        message: `Stok produk "${outOfStockItem.product?.name || 'Item'}" tidak mencukupi untuk paket bundling ini!`,
        icon: 'warning',
      })
      return
    }

    // Check if bundle already in cart (1x per transaction)
    const existing = cartItems.find((it) => it.isBundle && it.bundle?.id === bundle.id)
    if (existing) {
      setAlertModal({
        isOpen: true,
        title: 'Peringatan Bundling',
        message: 'Paket Bundling maksimal hanya dapat dipesan 1x per transaksi.',
        icon: 'warning',
      })
      return
    }

    const details = bundle.items.map(
      (bi) => `- ${bi.product?.name || 'Produk'} (x${bi.qty})`
    )
    const totalNormal = bundle.items.reduce(
      (sum, bi) => sum + (bi.product?.sell_price || 0) * (bi.qty || 1),
      0
    )

    setCartItems((prev) => [
      ...prev,
      {
        id: `bundle_${bundle.id}`,
        bundle,
        bundleDetails: details,
        name: bundle.name,
        qty: 1,
        originalPrice: totalNormal,
        finalUnitPrice: bundle.bundle_price,
        totalPrice: bundle.bundle_price,
        appliedPromoName: null,
        isBundle: true,
      },
    ])
  }

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.qty + delta
            if (nextQty <= 0) return null

            if (it.product && nextQty > it.product.stock_qty) {
              setAlertModal({
                isOpen: true,
                title: 'Maksimal Stok Tercapai',
                message: `Maksimal stok tercapai: ${it.product.stock_qty}`,
                icon: 'warning',
              })
              return it
            }

            if (it.isBundle && delta > 0) {
              setAlertModal({
                isOpen: true,
                title: 'Peringatan Bundling',
                message: 'Paket Bundling maksimal hanya dapat dipesan 1x per transaksi.',
                icon: 'warning',
              })
              return it
            }

            return {
              ...it,
              qty: nextQty,
              totalPrice: nextQty * it.finalUnitPrice,
            }
          }
          return it
        })
        .filter(Boolean) as CartItem[]

      // Otomatis batasi customDiscount jika melebihi subtotal baru
      const nextSubtotal = updated.reduce((s, it) => s + it.totalPrice, 0)
      setCustomDiscount((curr) => Math.min(curr, nextSubtotal))

      return updated
    })
  }

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((it) => it.id !== id)
      const nextSubtotal = updated.reduce((s, it) => s + it.totalPrice, 0)
      setCustomDiscount((curr) => Math.min(curr, nextSubtotal))
      return updated
    })
  }

  const handleClearCart = () => {
    setCartItems([])
    setCustomDiscount(0)
  }

  const handleCheckoutSuccess = (order: Order) => {
    setLastReceiptItems([...cartItems])
    setLastCompletedOrder(order)
    setIsCheckoutOpen(false)
    handleClearCart()
    setMobileTab('products')
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-5 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Mobile & Tablet Cloudflare Underline Tab Bar (Touches topbar on mobile with 0 gap) */}
      <div className="xl:hidden bg-white border-b border-[#e2e2e2] flex items-center w-full px-2 sm:px-0">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 sm:flex-none py-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer text-center ${
            mobileTab === 'products'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Katalog Produk
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 sm:flex-none py-2.5 px-3 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Keranjang</span>
          {totalItemCount > 0 && (
            <span className="bg-[#00A250] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {totalItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 2xl:gap-5 min-w-0">
        {/* Products Grid Section */}
        <div className={`flex-1 min-w-0 ${mobileTab === 'products' ? 'block' : 'hidden xl:block'}`}>
          <ProductGrid
            initialProducts={products}
            initialTotalCount={initialTotalCount}
            categories={categories}
            discounts={discounts}
            bundles={bundles}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onAddBundleToCart={handleAddBundleToCart}
            onUpdateCartQty={handleUpdateQty}
          />
        </div>

        {/* Cart Sidebar */}
        <div className={`xl:w-[320px] 2xl:w-[360px] xl:shrink-0 xl:sticky xl:top-14 xl:self-start w-full ${mobileTab === 'cart' ? 'block' : 'hidden xl:block'}`}>
          <CartSidebar
            items={cartItems}
            subtotal={subtotal}
            customDiscount={customDiscount}
            total={grandTotal}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onSetCustomDiscount={(val) => setCustomDiscount(Math.min(subtotal, Math.max(0, val)))}
            onCheckout={() => setIsCheckoutOpen(true)}
            isShiftActive={!!currentShift}
          />
        </div>
      </div>

      {/* Mobile Floating Quick Cart Bar (Visible on mobile when in "products" tab and cart has items) */}
      {mobileTab === 'products' && totalItemCount > 0 && (
        <div className="xl:hidden fixed bottom-16 left-3 right-3 z-30">
          <button
            onClick={() => setMobileTab('cart')}
            className="w-full bg-[#00A250] hover:bg-[#008f46] text-white p-3 rounded-xl shadow-lg flex items-center justify-between cursor-pointer transition active:scale-[0.99] border border-emerald-600"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs">
                {totalItemCount}
              </div>
              <div className="text-left">
                <div className="text-[10px] text-white/80 font-medium">Keranjang ({totalItemCount} item)</div>
                <div className="text-xs sm:text-sm font-bold">{formatRupiah(grandTotal)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 font-semibold text-xs bg-white text-[#00A250] px-3 py-1.5 rounded-lg shadow-2xs">
              <span>Lihat Keranjang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        items={cartItems}
        subtotal={subtotal}
        customDiscount={customDiscount}
        total={grandTotal}
        storeProfile={storeProfile}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
        onUpdateCustomDiscount={(val) => setCustomDiscount(Math.min(subtotal, Math.max(0, val)))}
      />

      {/* Struk Thermal Modal */}
      <ReceiptModal
        order={lastCompletedOrder}
        items={lastReceiptItems}
        storeProfile={storeProfile}
        isOpen={!!lastCompletedOrder}
        onClose={() => setLastCompletedOrder(null)}
      />

      {/* Popup Modal Pengganti alert() Browser */}
      <BarakahPopupModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        icon={alertModal.icon}
        confirmButtonText="Mengerti"
      />
    </div>
  )
}

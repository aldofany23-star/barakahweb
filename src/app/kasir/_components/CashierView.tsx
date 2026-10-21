'use client'

import { useState, useEffect } from 'react'
import { Product, Category, Discount, CartItem, Shift, StoreProfile, Order } from '@/types/database'
import { ProductGrid } from './ProductGrid'
import { CartSidebar } from './CartSidebar'
import { CheckoutModal } from './CheckoutModal'
import { ReceiptModal } from './ReceiptModal'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react'

interface CashierViewProps {
  initialProducts: Product[]
  categories: Category[]
  discounts: Discount[]
  currentShift: Shift | null
  storeProfile: StoreProfile | null
}

export function CashierView({
  initialProducts,
  categories,
  discounts,
  currentShift,
  storeProfile,
}: CashierViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [customDiscount, setCustomDiscount] = useState<number>(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null)
  const [lastReceiptItems, setLastReceiptItems] = useState<CartItem[]>([])

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
          alert(`Stok produk "${product.name}" hanya tersisa ${product.stock_qty}`)
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

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((it) => {
          if (it.id === id) {
            const nextQty = it.qty + delta
            if (nextQty <= 0) return null

            if (it.product && nextQty > it.product.stock_qty) {
              alert(`Maksimal stok tercapai: ${it.product.stock_qty}`)
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
    })
  }

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id))
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
    <div className="flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Alert jika shift belum aktif */}
      {!currentShift && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Shift Belum Aktif:</b> Buka shift kasir terlebih dahulu pada tombol di pojok kanan atas untuk transaksi.
            </span>
          </div>
        </div>
      )}

      {/* Mobile & Tablet Segmented Tab Switcher (Matches lines 76-96 CashierScreen.kt) */}
      <div className="xl:hidden mb-4">
        <div className="ios-segmented-container">
          <button
            onClick={() => setMobileTab('products')}
            className={`ios-segmented-tab ${mobileTab === 'products' ? 'ios-segmented-tab-active' : ''}`}
          >
            Produk
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`ios-segmented-tab flex items-center gap-2 ${mobileTab === 'cart' ? 'ios-segmented-tab-active' : ''}`}
          >
            <span>Keranjang</span>
            {totalItemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Cashier Layout */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        {/* Catalog Grid */}
        <div className={`flex-1 ${mobileTab === 'products' ? 'block' : 'hidden xl:block'}`}>
          <ProductGrid
            products={products}
            categories={categories}
            discounts={discounts}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateQty}
          />
        </div>

        {/* Cart Sidebar */}
        <div className={`xl:w-[380px] ${mobileTab === 'cart' ? 'block' : 'hidden xl:block'}`}>
          <CartSidebar
            items={cartItems}
            subtotal={subtotal}
            customDiscount={customDiscount}
            total={grandTotal}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onSetCustomDiscount={setCustomDiscount}
            onCheckout={() => setIsCheckoutOpen(true)}
            isShiftActive={!!currentShift}
          />
        </div>
      </div>

      {/* Mobile Floating Quick Cart Bar (Visible on mobile when in "products" tab and cart has items) */}
      {mobileTab === 'products' && totalItemCount > 0 && (
        <div className="xl:hidden fixed bottom-18 left-4 right-4 z-30">
          <button
            onClick={() => setMobileTab('cart')}
            className="w-full bg-[#00A250] hover:bg-[#008f46] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {totalItemCount}
              </div>
              <div className="text-left">
                <div className="text-[10px] text-white/80 uppercase font-bold tracking-wider">Keranjang Pesanan</div>
                <div className="text-sm font-black">{formatRupiah(grandTotal)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 font-bold text-xs bg-white text-[#00A250] px-3.5 py-1.5 rounded-full">
              <span>Buka Keranjang</span>
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
      />

      {/* Struk Thermal Modal */}
      <ReceiptModal
        order={lastCompletedOrder}
        items={lastReceiptItems}
        storeProfile={storeProfile}
        isOpen={!!lastCompletedOrder}
        onClose={() => setLastCompletedOrder(null)}
      />
    </div>
  )
}

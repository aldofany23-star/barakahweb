'use client'

import { useState, useMemo } from 'react'
import { Product, Category, Discount, CartItem } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Search, Plus, Minus, PackageX } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  discounts: Discount[]
  cartItems: CartItem[]
  onAddToCart: (product: Product, discount?: Discount) => void
  onUpdateCartQty: (id: string, delta: number) => void
}

export function ProductGrid({
  products,
  categories,
  discounts,
  cartItems,
  onAddToCart,
  onUpdateCartQty,
}: ProductGridProps) {
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Map cart items by product id
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cartItems.forEach((it) => {
      if (it.product) {
        map.set(it.product.id, it.qty)
      }
    })
    return map
  }, [cartItems])

  // Map discounts by product_id
  const discountMap = useMemo(() => {
    const map = new Map<string, Discount>()
    discounts.forEach((d) => {
      if (d.is_active) {
        map.set(d.product_id, d)
      }
    })
    return map
  }, [discounts])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.is_deleted) return false

      const matchesCategory =
        !selectedCategoryId || p.category_id === selectedCategoryId

      const query = search.toLowerCase().trim()
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))

      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategoryId, search])

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Search Bar & Category Chips (Matches iOS-style search in CashierScreen.kt) */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8B8B8B]">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk petshop..."
            className="w-full pl-11 pr-4 py-3 bg-[#E5E5EA] border-0 rounded-full text-sm text-[#1E1E1E] placeholder:text-[#8B8B8B] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
          />
        </div>

        {/* Category Chips (CircleShape pills matching Android LazyRow) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-[#00A250] text-white shadow-xs'
                : 'bg-[#E5E5EA] text-[#1E1E1E] hover:bg-[#d8d8de]'
            }`}
          >
            Semua
          </button>

          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#00A250] text-white shadow-xs'
                    : 'bg-[#E5E5EA] text-[#1E1E1E] hover:bg-[#d8d8de]'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of Product Cards (Matches CashierScreen.kt Product Card 1:1) */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#8B8B8B]">
            <PackageX className="w-12 h-12 stroke-1 mb-2 text-[#8B8B8B]" />
            <p className="text-sm font-semibold text-[#1E1E1E]">Tidak ada produk ditemukan</p>
            <p className="text-xs text-[#8B8B8B] mt-1">Coba ubah kata kunci atau pilih kategori lain</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const discount = discountMap.get(p.id)
              let finalPrice = p.sell_price

              if (discount) {
                if (discount.type === 'percentage') {
                  finalPrice = p.sell_price - (p.sell_price * discount.value) / 100
                } else {
                  finalPrice = Math.max(0, p.sell_price - discount.value)
                }
              }

              const isOutOfStock = p.stock_qty <= 0
              const qtyInCart = cartQtyMap.get(p.id) || 0
              const categoryName = p.category?.name || 'UMUM'

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col justify-between smooth-card"
                >
                  <div>
                    {/* Category uppercase (Matches line 838 CashierScreen.kt) */}
                    <div className="text-[10px] font-bold text-[#00A250] uppercase tracking-wide mb-1">
                      {categoryName}
                    </div>

                    {/* Product Name (Matches line 845) */}
                    <h3 className="font-bold text-sm text-[#1E1E1E] line-clamp-2 leading-tight">
                      {p.name}
                    </h3>

                    {/* Discount name promo */}
                    {discount && (
                      <div className="text-[10px] text-[#EF4444] font-medium mt-1">
                        {discount.name}
                      </div>
                    )}
                  </div>

                  {/* Price & Stock info */}
                  <div className="mt-4">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        {discount ? (
                          <>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] text-[#9CA3AF] line-through">
                                {formatRupiah(p.sell_price)}
                              </span>
                              <span className="bg-[#FEE2E2] text-[#EF4444] text-[9px] font-bold px-1 py-0.5 rounded">
                                {discount.type === 'percentage'
                                  ? `-${Math.round(discount.value)}%`
                                  : `-${formatRupiah(discount.value)}`}
                              </span>
                            </div>
                            <div className="text-sm font-extrabold text-[#00A250]">
                              {formatRupiah(finalPrice)}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-extrabold text-[#00A250]">
                            {formatRupiah(p.sell_price)}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-medium text-[#8B8B8B]">
                        Stok: {p.stock_qty}
                      </div>
                    </div>

                    {/* Action Button: Add to Cart or Stepper (Matches lines 904-927) */}
                    {isOutOfStock ? (
                      <button
                        disabled
                        className="w-full h-10 bg-[#E5E5EA] text-[#8B8B8B] rounded-full text-xs font-bold cursor-not-allowed"
                      >
                        Stok Habis
                      </button>
                    ) : qtyInCart === 0 ? (
                      <button
                        onClick={() => onAddToCart(p, discount)}
                        className="w-full h-10 bg-[#00A250] hover:bg-[#008f46] text-white rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Add to cart</span>
                      </button>
                    ) : (
                      <div className="w-full h-10 bg-[#D6F0E0] rounded-full flex items-center justify-between px-2">
                        <button
                          onClick={() => onUpdateCartQty(p.id, -1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#bde8cd] text-[#00A250] transition cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-extrabold text-sm text-[#00A250]">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => onUpdateCartQty(p.id, 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#bde8cd] text-[#00A250] transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

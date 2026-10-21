'use client'

import { useState, useMemo } from 'react'
import { Product, Category, Discount } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { Search, Tag, AlertCircle } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  discounts: Discount[]
  onAddToCart: (product: Product, discount?: Discount) => void
}

export function ProductGrid({
  products,
  categories,
  discounts,
  onAddToCart,
}: ProductGridProps) {
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

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
      {/* Top Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama atau scan barcode/SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
            }`}
          >
            Semua ({products.filter((p) => !p.is_deleted).length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategoryId === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Product Cards */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <AlertCircle className="w-10 h-10 stroke-1 mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs font-medium text-zinc-500">Tidak ada produk ditemukan</p>
            <p className="text-[11px] text-zinc-400">Coba ubah kata kunci pencarian atau kategori</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const discount = discountMap.get(p.id)
              const hasDiscount = !!discount
              let finalPrice = p.sell_price

              if (discount) {
                if (discount.type === 'percentage') {
                  finalPrice = p.sell_price - (p.sell_price * discount.value) / 100
                } else {
                  finalPrice = Math.max(0, p.sell_price - discount.value)
                }
              }

              const isOutOfStock = p.stock_qty <= 0
              const isLowStock = p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isOutOfStock && onAddToCart(p, discount)}
                  disabled={isOutOfStock}
                  className={`p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border transition text-left flex flex-col justify-between group cursor-pointer relative shadow-sm hover:shadow-md ${
                    isOutOfStock
                      ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:ring-2 hover:ring-emerald-500/10'
                  }`}
                >
                  {/* Discount ribbon */}
                  {hasDiscount && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      <Tag className="w-2.5 h-2.5" />
                      <span>PROMO</span>
                    </div>
                  )}

                  <div>
                    {/* Category / SKU */}
                    <div className="text-[10px] text-zinc-400 truncate mb-1">
                      {p.sku || p.category?.name || 'Pet Supplies'}
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  {/* Price & Stock */}
                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-end justify-between">
                    <div>
                      {hasDiscount && (
                        <div className="text-[10px] text-zinc-400 line-through">
                          {formatRupiah(p.sell_price)}
                        </div>
                      )}
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(finalPrice)}
                      </div>
                    </div>

                    {/* Stock status badge */}
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {isOutOfStock ? 'Habis' : `Stok: ${p.stock_qty}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

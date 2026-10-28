'use client'

import { useState, useMemo, useEffect, useRef, useTransition, useCallback } from 'react'
import { Product, Category, Discount, Bundle, BundleItem, CartItem } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import { getProductsPosAction } from '../_actions/productPosActions'
import {
  Search,
  Plus,
  Minus,
  PackageX,
  ShoppingCart,
  Tag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Gift,
  Check,
} from 'lucide-react'

interface ProductGridProps {
  initialProducts: Product[]
  initialTotalCount: number
  categories: Category[]
  discounts: Discount[]
  bundles: (Bundle & { items: (BundleItem & { product?: Product | null })[] })[]
  cartItems: CartItem[]
  onAddToCart: (product: Product, discount?: Discount) => void
  onAddBundleToCart: (
    bundle: Bundle & { items: (BundleItem & { product?: Product | null })[] }
  ) => void
  onUpdateCartQty: (id: string, delta: number) => void
}

const PAGE_SIZE = 16

export function ProductGrid({
  initialProducts,
  initialTotalCount,
  categories,
  discounts,
  bundles,
  cartItems,
  onAddToCart,
  onAddBundleToCart,
  onUpdateCartQty,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // In-memory cache for lazy loading & zero-database-hit page flips
  const cacheRef = useRef<Map<string, { products: Product[]; totalCount: number }>>(new Map())

  // Store initial products in cache
  useEffect(() => {
    cacheRef.current.set('all__1', {
      products: initialProducts,
      totalCount: initialTotalCount,
    })
  }, [initialProducts, initialTotalCount])

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch paginated products from Server Action
  const loadProducts = useCallback(
    async (page: number, catId: string | null, q: string) => {
      if (catId === 'BUNDLING') return

      const cacheKey = `${catId || 'all'}_${q.trim().toLowerCase()}_${page}`

      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!
        setProducts(cached.products)
        setTotalCount(cached.totalCount)
        setCurrentPage(page)
        return
      }

      setIsLoading(true)
      startTransition(async () => {
        try {
          const res = await getProductsPosAction({
            page,
            pageSize: PAGE_SIZE,
            categoryId: catId,
            search: q,
          })

          if (res.success) {
            setProducts(res.products)
            setTotalCount(res.totalCount)
            setCurrentPage(res.page)
            cacheRef.current.set(cacheKey, {
              products: res.products,
              totalCount: res.totalCount,
            })
          }
        } catch (err) {
          console.error('Gagal memuat produk:', err)
        } finally {
          setIsLoading(false)
        }
      })
    },
    []
  )

  // Trigger fetch when category or debounced search changes
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (selectedCategoryId === 'BUNDLING') return
    loadProducts(1, selectedCategoryId, debouncedSearch)
  }, [selectedCategoryId, debouncedSearch, loadProducts])

  // Map cart items by product id for instant lookup
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cartItems.forEach((it) => {
      if (it.product) {
        map.set(it.product.id, it.qty)
      }
    })
    return map
  }, [cartItems])

  // Map cart items by bundle id
  const cartBundleSet = useMemo(() => {
    const set = new Set<string>()
    cartItems.forEach((it) => {
      if (it.isBundle && it.bundle) {
        set.add(it.bundle.id)
      }
    })
    return set
  }, [cartItems])

  // Map active discounts by product_id
  const discountMap = useMemo(() => {
    const map = new Map<string, Discount>()
    discounts.forEach((d) => {
      if (d.is_active) {
        map.set(d.product_id, d)
      }
    })
    return map
  }, [discounts])

  // Filter active bundles when Bundling tab is selected
  const filteredBundles = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return bundles
    return bundles.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.items.some((i) => i.product?.name.toLowerCase().includes(q))
    )
  }, [bundles, search])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    loadProducts(newPage, selectedCategoryId, debouncedSearch)
  }

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push(-1)
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push(-1)
      pages.push(totalPages)
    }
    return pages
  }, [currentPage, totalPages])

  return (
    <div className="flex-1 flex flex-col space-y-4 min-w-0">
      {/* Search Bar & Category Chips (Cloudflare Clean Look) */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            {isLoading || isPending ? (
              <Loader2 className="w-4 h-4 text-[#00A250] animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs sm:text-sm text-[#262626] placeholder:text-gray-400 focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
          />
        </div>

        {/* Category Chips (Cloudflare Filter Buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {/* Semua Produk */}
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-[#00A250] text-white shadow-2xs'
                : 'bg-white border border-[#e2e2e2] text-gray-700 hover:bg-[#f3f3f3]'
            }`}
          >
            Semua
          </button>

          {/* Bundling Tab Chip (Mirrors Android CashierScreen.kt:105-116 "Bundling") */}
          <button
            onClick={() => setSelectedCategoryId('BUNDLING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategoryId === 'BUNDLING'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Bundling ({bundles.length})</span>
          </button>

          {/* Other Categories */}
          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#00A250] text-white shadow-2xs'
                    : 'bg-white border border-[#e2e2e2] text-gray-700 hover:bg-[#f3f3f3]'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of Product or Bundle Cards */}
      <div className="flex-1">
        {selectedCategoryId === 'BUNDLING' ? (
          /* ============================================================ */
          /* BUNDLING TAB GRID (Mirrors CashierScreen.kt:740-818)          */
          /* ============================================================ */
          filteredBundles.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#757575] bg-white rounded-xl border border-[#e2e2e2]">
              <Gift className="w-12 h-12 stroke-1 mb-2 text-blue-400" />
              <p className="text-sm font-semibold text-[#262626]">Belum ada paket bundling aktif</p>
              <p className="text-xs text-[#757575] mt-1">
                Atur paket promo hemat di menu Setup Diskon & Bundling
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredBundles.map((b) => {
                const totalNormal = b.items.reduce((sum, bi) => {
                  return sum + (bi.product?.sell_price || 0) * (bi.qty || 1)
                }, 0)
                const hemat = Math.max(0, totalNormal - b.bundle_price)
                const isAlreadyInCart = cartBundleSet.has(b.id)

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-xl border border-[#e2e2e2] p-3.5 sm:p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition group"
                  >
                    <div>
                      {/* Bundle Header Badge */}
                      <div className="flex items-center justify-between gap-1.5 mb-2 min-h-[22px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider truncate shrink-0">
                          <Gift className="w-3 h-3" />
                          <span>PAKET BUNDLING</span>
                        </span>
                      </div>

                      {/* Bundle Name */}
                      <h3
                        className="font-bold text-xs sm:text-sm text-[#262626] line-clamp-2 h-9 leading-snug group-hover:text-blue-600 transition mt-1"
                        title={b.name}
                      >
                        {b.name}
                      </h3>

                      {/* Items in Bundle */}
                      <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-24 overflow-y-auto">
                        {b.items.map((bi) => (
                          <div
                            key={bi.id}
                            className="text-[10px] text-gray-600 flex items-center justify-between"
                          >
                            <span className="truncate">- {bi.product?.name || 'Produk'}</span>
                            <span className="font-bold text-blue-600 shrink-0 ml-1">x{bi.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price & Action Section */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100">
                      <div className="mb-2.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-gray-400 line-through">
                            {formatRupiah(totalNormal)}
                          </span>
                          {hemat > 0 && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold px-1 py-0.2 rounded">
                              Hemat {formatRupiah(hemat)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-[#00A250]">
                          {formatRupiah(b.bundle_price)}
                        </div>
                      </div>

                      {/* Action Button */}
                      {isAlreadyInCart ? (
                        <div className="w-full h-9 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Di Keranjang (1x)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddBundleToCart(b)}
                          className="w-full h-9 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Paket</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* ============================================================ */
          /* REGULAR PRODUCTS GRID (With Discount Cards)                  */
          /* ============================================================ */
          products.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#757575] bg-white rounded-xl border border-[#e2e2e2]">
              <PackageX className="w-12 h-12 stroke-1 mb-2 text-gray-400" />
              <p className="text-sm font-semibold text-[#262626]">Tidak ada produk ditemukan</p>
              <p className="text-xs text-[#757575] mt-1">Coba ubah kata kunci atau pilih kategori lain</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p) => {
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
                    className="bg-white rounded-xl border border-[#e2e2e2] p-3.5 sm:p-4 flex flex-col justify-between hover:border-[#00A250] hover:shadow-xs transition group"
                  >
                    <div>
                      {/* Category Badge & SKU */}
                      <div className="flex items-center justify-between gap-2 mb-2 min-h-[24px]">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc] uppercase tracking-wide shrink-0">
                          {categoryName}
                        </span>
                        {p.sku ? (
                          <span
                            className="text-[10px] font-mono text-gray-400 truncate text-right ml-auto"
                            title={`SKU: ${p.sku}`}
                          >
                            {p.sku}
                          </span>
                        ) : null}
                      </div>

                      {/* Product Name */}
                      <h3
                        className="font-bold text-xs sm:text-sm text-[#262626] line-clamp-2 h-9 leading-snug group-hover:text-[#00A250] transition mt-1"
                        title={p.name}
                      >
                        {p.name}
                      </h3>

                      {/* Discount promo badge (Mirrors Android: discount.name in red text) */}
                      {discount && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded mt-1.5">
                          <Tag className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[120px]">{discount.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Price & Stock info */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <div className="flex items-end justify-between gap-2 min-h-[42px] mb-2.5">
                        <div className="min-w-0 flex-1">
                          {discount && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[10px] text-gray-400 line-through">
                                {formatRupiah(p.sell_price)}
                              </span>
                              <span className="bg-red-50 border border-red-200 text-red-600 text-[9px] font-bold px-1 rounded">
                                {discount.type === 'percentage'
                                  ? `-${Math.round(discount.value)}%`
                                  : `-${formatRupiah(discount.value)}`}
                              </span>
                            </div>
                          )}
                          <div className="text-sm sm:text-base font-extrabold text-[#00A250] truncate">
                            {formatRupiah(finalPrice)}
                          </div>
                        </div>

                        <div
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 whitespace-nowrap mb-0.5 ${
                            isOutOfStock
                              ? 'text-red-700 bg-red-50 border-red-200 font-bold'
                              : p.stock_qty <= p.low_stock_threshold
                              ? 'text-amber-700 bg-amber-50 border-amber-200 font-bold'
                              : 'text-gray-600 bg-[#f8f8f8] border-[#e2e2e2]'
                          }`}
                        >
                          Stok: <span className="font-bold ml-0.5 text-[#262626]">{p.stock_qty}</span>
                        </div>
                      </div>

                      {/* Action Button: Balanced Symmetrical Stepper / Add to Cart */}
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="w-full h-9 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                        >
                          Stok Habis
                        </button>
                      ) : qtyInCart === 0 ? (
                        <button
                          onClick={() => onAddToCart(p, discount)}
                          className="w-full h-9 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah</span>
                        </button>
                      ) : (
                        <div className="w-full h-9 flex items-center justify-between bg-[#f8fdf9] border border-[#b8e8cc] rounded-lg p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(p.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-[#b8e8cc] text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition cursor-pointer active:scale-95 shadow-2xs shrink-0"
                            title="Kurangi Kuantitas"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>

                          <div className="flex items-center justify-center px-1">
                            <span className="text-xs font-black text-[#00A250] select-none text-center">
                              {qtyInCart}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(p.id, 1)}
                            disabled={qtyInCart >= p.stock_qty}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white transition cursor-pointer active:scale-95 shadow-2xs shrink-0"
                            title="Tambah Kuantitas"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Pagination Bar (Only shown for regular products) */}
      {selectedCategoryId !== 'BUNDLING' && totalPages > 1 && (
        <div className="mt-4 pt-4 border-t border-[#e2e2e2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border shadow-2xs">
          <div className="text-gray-500">
            Menampilkan halaman <span className="font-bold text-[#262626]">{currentPage}</span> dari{' '}
            <span className="font-bold text-[#262626]">{totalPages}</span> ({totalCount} total produk)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-lg border border-[#e2e2e2] text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((pNum, idx) =>
              pNum === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={pNum}
                  onClick={() => handlePageChange(pNum)}
                  disabled={isLoading}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentPage === pNum
                      ? 'bg-[#00A250] text-white shadow-2xs'
                      : 'border border-[#e2e2e2] text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pNum}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-lg border border-[#e2e2e2] text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

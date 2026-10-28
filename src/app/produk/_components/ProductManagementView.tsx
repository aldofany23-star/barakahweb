'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Product, Category, StockLog } from '@/types/database'
import { ProductModal } from './ProductModal'
import { StockAdjustModal } from './StockAdjustModal'
import { CategoryModal } from './CategoryModal'
import { BarakahPopupModal } from '@/components/ui/BarakahPopupModal'
import {
  deleteProductAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '../_actions/productActions'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  FolderPlus,
  Pencil,
  Trash2,
  ArrowUpDown,
  History,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface ProductManagementViewProps {
  initialProducts: Product[]
  categories: Category[]
  stockLogs: (StockLog & { product?: Product | null })[]
}

export function ProductManagementView({
  initialProducts,
  categories,
  stockLogs,
}: ProductManagementViewProps) {
  // Tabs match ProductManageScreen.kt: ["Produk", "Kategori", "Low Stock", "Log Stok"]
  const [selectedTab, setSelectedTab] = useState<'products' | 'categories' | 'low-stock' | 'logs'>('products')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // Category Edit & Delete states (Mirrors ProductManageScreen.kt:105-171)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isCatPending, startCatTransition] = useTransition()

  const [isDeleting, startDeleteTransition] = useTransition()

  // Active non-deleted products
  const activeProducts = useMemo(() => {
    return initialProducts.filter((p) => !p.is_deleted)
  }, [initialProducts])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (selectedTab === 'low-stock' && p.stock_qty > p.low_stock_threshold) {
        return false
      }
      const matchCat = !selectedCategory || p.category_id === selectedCategory
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [activeProducts, selectedTab, selectedCategory, search])

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const lowStockCount = useMemo(() => {
    return activeProducts.filter((p) => p.stock_qty <= p.low_stock_threshold).length
  }, [activeProducts])

  // Pagination & Lazy Loading State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentLogPage, setCurrentLogPage] = useState(1)
  const LOG_PAGE_SIZE = 15

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, selectedTab])

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  const totalLogPages = Math.ceil(stockLogs.length / LOG_PAGE_SIZE) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentLogPage - 1) * LOG_PAGE_SIZE
    return stockLogs.slice(start, start + LOG_PAGE_SIZE)
  }, [stockLogs, currentLogPage])

  const handleConfirmDeleteProduct = () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    startDeleteTransition(async () => {
      await deleteProductAction(id)
    })
  }

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryToEdit || !editCategoryName.trim()) return

    const id = categoryToEdit.id
    const newName = editCategoryName.trim()
    setCategoryToEdit(null)

    startCatTransition(async () => {
      await updateCategoryAction(id, newName)
    })
  }

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return
    const id = categoryToDelete.id
    setCategoryToDelete(null)

    startCatTransition(async () => {
      await deleteCategoryAction(id)
    })
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-0 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Title & Action Buttons (Matches Cloudflare Header) */}
      <div className="px-4 py-3 sm:px-0 sm:py-0 border-b border-[#e2e2e2] sm:border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Produk & Stock
            </h1>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Katalog barang, harga jual, dan pergerakan stok Barakah Fauna
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-gray-50 border border-[#e2e2e2] text-[#262626] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FolderPlus className="w-4 h-4 text-gray-500" />
            <span>Kelola Kategori</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null)
              setIsProductModalOpen(true)
            }}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Cloudflare Segmented Underline Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e2e2e2] px-3 sm:px-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedTab('products')}
          className={`py-2.5 px-3.5 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            selectedTab === 'products'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Semua Produk ({activeProducts.length})
        </button>
        <button
          onClick={() => setSelectedTab('categories')}
          className={`py-2.5 px-3.5 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            selectedTab === 'categories'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Kategori ({categories.length})
        </button>
        <button
          onClick={() => setSelectedTab('low-stock')}
          className={`py-2.5 px-3.5 text-xs font-semibold transition border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            selectedTab === 'low-stock'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Low Stock</span>
          {lowStockCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
              {lowStockCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedTab('logs')}
          className={`py-2.5 px-3.5 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            selectedTab === 'logs'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Log Stok
        </button>
      </div>

      {/* Cloudflare Search Box */}
      {selectedTab !== 'logs' && (
        <div className="px-3 sm:px-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                selectedTab === 'products'
                  ? 'Cari produk petshop (Nama / SKU)...'
                  : selectedTab === 'categories'
                  ? 'Cari kategori...'
                  : 'Cari produk stok menipis...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs sm:text-sm text-[#262626] placeholder:text-gray-400 focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
            />
          </div>
        </div>
      )}

      {/* Content: Products & Low Stock */}
      {(selectedTab === 'products' || selectedTab === 'low-stock') && (
        <div className="px-3 sm:px-0">
          <div className="bg-white rounded-xl border border-[#e2e2e2] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f8f8] text-[#757575] uppercase tracking-wider font-semibold border-b border-[#e2e2e2]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[150px] whitespace-nowrap">Nama Produk</th>
                  <th className="py-3 px-3.5 min-w-[110px] whitespace-nowrap">SKU / Kategori</th>
                  <th className="py-3 px-3.5 min-w-[95px] whitespace-nowrap">Harga Modal</th>
                  <th className="py-3 px-3.5 min-w-[95px] whitespace-nowrap">Harga Jual</th>
                  <th className="py-3 px-3.5 text-center min-w-[95px] whitespace-nowrap">Stok</th>
                  <th className="py-3 px-3.5 text-right min-w-[110px] whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8B8B8B]">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const isLow = p.stock_qty <= p.low_stock_threshold
                    const isZero = p.stock_qty <= 0

                    return (
                      <tr key={p.id} className="hover:bg-[#F9F9F9] transition">
                        <td className="py-3 px-3.5 font-bold text-[#1E1E1E]">
                          <div className="max-w-xs sm:max-w-md truncate">{p.name}</div>
                        </td>
                        <td className="py-3 px-3.5 text-[#8B8B8B] whitespace-nowrap">
                          <div className="font-mono text-[11px]">{p.sku || '-'}</div>
                          <div className="text-[10px] text-[#00A250] font-bold uppercase mt-0.5">
                            {p.category?.name || 'Umum'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[#8B8B8B] whitespace-nowrap font-mono">
                          {formatRupiah(p.buy_price)}
                        </td>
                        <td className="py-3 px-3.5 font-extrabold text-[#00A250] whitespace-nowrap font-mono">
                          {formatRupiah(p.sell_price)}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isZero
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc]'
                            }`}
                          >
                            {p.stock_qty} unit
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setAdjustingProduct(p)
                                setIsAdjustModalOpen(true)
                              }}
                              title="Penyesuaian Stok"
                              className="p-1.5 text-[#00A250] hover:bg-[#D6F0E0] rounded-lg transition cursor-pointer"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(p)
                                setIsProductModalOpen(true)
                              }}
                              title="Ubah Produk"
                              className="p-1.5 text-[#1E1E1E] hover:bg-[#E5E5EA] rounded-lg transition cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                              disabled={isDeleting}
                              title="Hapus Produk"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredProducts.length > 0 && (
            <div className="px-4 py-3 bg-[#fafafa] border-t border-[#e2e2e2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-gray-500 font-medium text-center sm:text-left">
                Menampilkan{' '}
                <span className="font-semibold text-[#262626]">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                -{' '}
                <span className="font-semibold text-[#262626]">
                  {Math.min(currentPage * pageSize, filteredProducts.length)}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-[#262626]">
                  {filteredProducts.length}
                </span>{' '}
                produk
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-gray-400 text-[11px]">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="bg-white border border-[#e2e2e2] text-xs rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-[#00A250] shadow-2xs cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-white border border-[#e2e2e2] rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-bold text-[#00A250] px-2 whitespace-nowrap">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 bg-white border border-[#e2e2e2] rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Content: Categories Tab (Mirrors ProductManageScreen.kt:183-261 with Edit and Delete) */}
      {selectedTab === 'categories' && (
        <div className="px-3 sm:px-0 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500">
              Menampilkan {filteredCategories.length} kategori
            </span>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-1.5 bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCategories.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-white rounded-xl border border-[#e2e2e2] flex items-center justify-between shadow-2xs hover:border-[#00A250] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#eef8f2] border border-[#b8e8cc] flex items-center justify-center font-bold text-sm text-[#00A250] shrink-0">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#262626] truncate">{c.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {activeProducts.filter((p) => p.category_id === c.id).length} produk terdaftar
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setCategoryToEdit(c)
                      setEditCategoryName(c.name)
                    }}
                    title="Edit Kategori"
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(c)}
                    title="Hapus Kategori"
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content: Logs Tab (Cloudflare Audit Logs Style) */}
      {selectedTab === 'logs' && (
        <div className="px-3 sm:px-0">
          <div className="bg-white rounded-xl border border-[#e2e2e2] overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-[#e2e2e2]">
              <h3 className="font-bold text-sm text-[#262626]">Riwayat Audit Mutasi Stok</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f8f8] text-[#757575] font-semibold border-b border-[#e2e2e2]">
                  <tr>
                    <th className="py-2.5 px-3.5">Waktu Mutasi ↓</th>
                    <th className="py-2.5 px-3.5">Nama Produk</th>
                    <th className="py-2.5 px-3.5">Tipe</th>
                    <th className="py-2.5 px-3.5 text-center">Perubahan</th>
                    <th className="py-2.5 px-3.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e2e2]">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Belum ada riwayat mutasi stok
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const isPositive = log.qty_change > 0
                      return (
                        <tr key={log.id} className="hover:bg-[#fcfcfc] transition">
                          <td className="py-2.5 px-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-[#262626]">
                            {log.product?.name || `ID: ${log.product_id}`}
                          </td>
                          <td className="py-2.5 px-3.5 uppercase font-semibold text-[10px] text-gray-500">
                            {log.type}
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-extrabold whitespace-nowrap">
                            <span className={isPositive ? 'text-[#00A250]' : 'text-red-600'}>
                              {isPositive ? `+${log.qty_change}` : log.qty_change}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-gray-500">
                            {log.reason || '-'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Log Stok */}
            {stockLogs.length > 0 && totalLogPages > 1 && (
              <div className="px-4 py-3 bg-[#fafafa] border-t border-[#e2e2e2] flex items-center justify-between text-xs">
                <div className="text-gray-500 font-medium">
                  Halaman {currentLogPage} dari {totalLogPages} ({stockLogs.length} mutasi)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentLogPage((p) => Math.max(1, p - 1))}
                    disabled={currentLogPage === 1}
                    className="px-2.5 py-1 bg-white border border-[#e2e2e2] rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    onClick={() => setCurrentLogPage((p) => Math.min(totalLogPages, p + 1))}
                    disabled={currentLogPage === totalLogPages}
                    className="px-2.5 py-1 bg-white border border-[#e2e2e2] rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        product={editingProduct}
        categories={categories}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
      />

      <StockAdjustModal
        product={adjustingProduct}
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
      />

      <CategoryModal
        categories={categories}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Modal Edit Kategori (Mirrors ProductManageScreen.kt:135-156) */}
      {categoryToEdit && (
        <div
          onClick={() => setCategoryToEdit(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-[#262626]">Edit Kategori</h3>
              <button
                onClick={() => setCategoryToEdit(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#262626] mb-1.5">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCatPending || !editCategoryName.trim()}
                  className="px-5 py-2 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isCatPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal (Mirrors BarakahPopupDialog "Hapus Produk?" lines 284-295) */}
      <BarakahPopupModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Produk?"
        message={`Apakah Anda yakin ingin menghapus produk '${deleteTarget?.name}'? Data riwayat transaksi lama akan tetap terjaga.`}
        confirmButtonText="Hapus"
        dismissButtonText="Batal"
        icon="warning"
        onConfirm={handleConfirmDeleteProduct}
      />

      {/* Delete Category Confirmation Modal (Mirrors BarakahPopupDialog "Hapus Kategori?" lines 159-171) */}
      <BarakahPopupModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Hapus Kategori?"
        message={`Apakah Anda yakin ingin menghapus kategori '${categoryToDelete?.name}'? Semua produk di dalamnya mungkin akan kehilangan referensi kategori.`}
        confirmButtonText="Hapus"
        dismissButtonText="Batal"
        icon="warning"
        onConfirm={handleConfirmDeleteCategory}
      />
    </div>
  )
}

'use client'

import { useState, useTransition, useMemo } from 'react'
import { Product, Category, StockLog } from '@/types/database'
import { ProductModal } from './ProductModal'
import { StockAdjustModal } from './StockAdjustModal'
import { CategoryModal } from './CategoryModal'
import { deleteProductAction } from '../_actions/productActions'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  FolderPlus,
  Pencil,
  Trash2,
  ArrowUpDown,
  SlidersHorizontal,
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
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock' | 'logs'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  const [isDeleting, startDeleteTransition] = useTransition()

  // Filter products
  const activeProducts = useMemo(() => {
    return initialProducts.filter((p) => !p.is_deleted)
  }, [initialProducts])

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (activeTab === 'low-stock' && p.stock_qty > p.low_stock_threshold) {
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
  }, [activeProducts, activeTab, selectedCategory, search])

  const lowStockCount = useMemo(() => {
    return activeProducts.filter((p) => p.stock_qty <= p.low_stock_threshold).length
  }, [activeProducts])

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
      startDeleteTransition(async () => {
        await deleteProductAction(id)
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>Manajemen Produk & Stok</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Kelola katalog barang, harga jual, stok gudang, dan log opname
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Kategori</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null)
              setIsProductModalOpen(true)
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Semua Produk ({activeProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('low-stock')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'low-stock'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Stok Menipis ({lowStockCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Pergerakan Stok</span>
        </button>
      </div>

      {/* Tab: All Products or Low Stock */}
      {activeTab !== 'logs' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan nama atau SKU barcode..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">SKU / Kategori</th>
                    <th className="py-3 px-4">Harga Beli</th>
                    <th className="py-3 px-4">Harga Jual</th>
                    <th className="py-3 px-4 text-center">Stok</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        Tidak ada produk yang cocok dengan pencarian
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock_qty <= p.low_stock_threshold
                      const isZero = p.stock_qty <= 0

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                            {p.name}
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            <div>{p.sku || '-'}</div>
                            <div className="text-[10px] text-zinc-400">{p.category?.name || 'Uncategorized'}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            {formatRupiah(p.buy_price)}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-600">
                            {formatRupiah(p.sell_price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isZero
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}
                            >
                              {p.stock_qty} unit
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setAdjustingProduct(p)
                                  setIsAdjustModalOpen(true)
                                }}
                                title="Sesuaikan Stok"
                                className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(p)
                                  setIsProductModalOpen(true)
                                }}
                                title="Ubah Data"
                                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                title="Hapus Produk"
                                disabled={isDeleting}
                                className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
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
          </div>
        </div>
      ) : (
        /* Tab: Stock Movement Logs */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              Riwayat Perubahan Stok Terakhir (50 Terbaru)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4 text-center">Perubahan</th>
                  <th className="py-3 px-4">Alasan / No. Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {stockLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      Belum ada riwayat pergerakan stok
                    </td>
                  </tr>
                ) : (
                  stockLogs.map((log) => {
                    const isPositive = log.qty_change > 0
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.product?.name || `ID: ${log.product_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {isPositive ? `+${log.qty_change}` : log.qty_change}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {log.reason || '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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
    </div>
  )
}

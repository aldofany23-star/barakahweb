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
  FolderPlus,
  Pencil,
  Trash2,
  ArrowUpDown,
  History,
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Title & Action Buttons (Matches CollapsingHeaderLayout) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
            Produk & Stok
          </h1>
          <p className="text-xs text-[#8B8B8B] mt-0.5">
            Katalog barang, harga jual, dan pergerakan stok
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#E5E5EA] hover:bg-[#d8d8de] text-[#1E1E1E] rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Kategori</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null)
              setIsProductModalOpen(true)
            }}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-[#00A250] hover:bg-[#008f46] text-white rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* iOS Segmented Control Tabs (Matches lines 63-78 ProductManageScreen.kt) */}
      <div className="ios-segmented-container">
        <button
          onClick={() => setSelectedTab('products')}
          className={`ios-segmented-tab ${selectedTab === 'products' ? 'ios-segmented-tab-active' : ''}`}
        >
          Produk ({activeProducts.length})
        </button>
        <button
          onClick={() => setSelectedTab('categories')}
          className={`ios-segmented-tab ${selectedTab === 'categories' ? 'ios-segmented-tab-active' : ''}`}
        >
          Kategori ({categories.length})
        </button>
        <button
          onClick={() => setSelectedTab('low-stock')}
          className={`ios-segmented-tab flex items-center gap-1.5 ${selectedTab === 'low-stock' ? 'ios-segmented-tab-active' : ''}`}
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
          className={`ios-segmented-tab ${selectedTab === 'logs' ? 'ios-segmented-tab-active' : ''}`}
        >
          Log Stok
        </button>
      </div>

      {/* iOS Search Box */}
      {selectedTab !== 'logs' && (
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-[#8B8B8B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              selectedTab === 'products'
                ? 'Cari produk petshop...'
                : selectedTab === 'categories'
                ? 'Cari kategori...'
                : 'Cari produk low stock...'
            }
            className="w-full pl-11 pr-4 py-3 bg-[#E5E5EA] border-0 rounded-full text-sm text-[#1E1E1E] placeholder:text-[#8B8B8B] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
          />
        </div>
      )}

      {/* Content: Products & Low Stock */}
      {(selectedTab === 'products' || selectedTab === 'low-stock') && (
        <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] text-[#8B8B8B] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3.5 px-4">Nama Produk</th>
                  <th className="py-3.5 px-4">SKU / Kategori</th>
                  <th className="py-3.5 px-4">Harga Modal</th>
                  <th className="py-3.5 px-4">Harga Jual</th>
                  <th className="py-3.5 px-4 text-center">Stok</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8B8B8B]">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stock_qty <= p.low_stock_threshold
                    const isZero = p.stock_qty <= 0

                    return (
                      <tr key={p.id} className="hover:bg-[#F9F9F9] transition">
                        <td className="py-3.5 px-4 font-bold text-[#1E1E1E]">
                          <div className="max-w-xs sm:max-w-md truncate">{p.name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#8B8B8B]">
                          <div>{p.sku || '-'}</div>
                          <div className="text-[10px] text-[#00A250] font-bold uppercase mt-0.5">
                            {p.category?.name || 'Umum'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#8B8B8B]">
                          {formatRupiah(p.buy_price)}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#00A250]">
                          {formatRupiah(p.sell_price)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              isZero
                                ? 'bg-[#FEE2E2] text-[#EF4444]'
                                : isLow
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-[#D6F0E0] text-[#00A250]'
                            }`}
                          >
                            {p.stock_qty} unit
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setAdjustingProduct(p)
                                setIsAdjustModalOpen(true)
                              }}
                              title="Sesuaikan Stok (Opname/Restock)"
                              className="p-2 text-[#00A250] hover:bg-[#D6F0E0] rounded-xl transition cursor-pointer"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(p)
                                setIsProductModalOpen(true)
                              }}
                              title="Ubah Produk"
                              className="p-2 text-[#1E1E1E] hover:bg-[#E5E5EA] rounded-xl transition cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              disabled={isDeleting}
                              title="Hapus Produk"
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
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
      )}

      {/* Content: Categories Tab */}
      {selectedTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCategories.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-2xl border border-[#E5E7EB] flex items-center justify-between shadow-xs"
            >
              <div>
                <div className="font-bold text-sm text-[#1E1E1E]">{c.name}</div>
                <div className="text-[11px] text-[#8B8B8B] mt-0.5">
                  {activeProducts.filter((p) => p.category_id === c.id).length} produk
                </div>
              </div>
              <div className="p-2 bg-[#D6F0E0] text-[#00A250] rounded-xl font-bold text-xs">
                Kategori
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content: Logs Tab */}
      {selectedTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E5E7EB]">
            <h3 className="font-bold text-sm text-[#1E1E1E]">Riwayat Pergerakan Stok Terbaru</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] text-[#8B8B8B] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4 text-center">Perubahan</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {stockLogs.map((log) => {
                  const isPositive = log.qty_change > 0
                  return (
                    <tr key={log.id} className="hover:bg-[#F9F9F9]">
                      <td className="py-3 px-4 text-[#8B8B8B] whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1E1E1E]">
                        {log.product?.name || `ID: ${log.product_id}`}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[10px] text-[#8B8B8B]">
                        {log.type}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold">
                        <span className={isPositive ? 'text-[#00A250]' : 'text-[#EF4444]'}>
                          {isPositive ? `+${log.qty_change}` : log.qty_change}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#8B8B8B]">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  )
                })}
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

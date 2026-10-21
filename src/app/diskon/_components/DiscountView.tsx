'use client'

import { useState, useTransition, useMemo } from 'react'
import { Discount, Product } from '@/types/database'
import { DiscountModal } from './DiscountModal'
import { toggleDiscountAction, deleteDiscountAction } from '../_actions/discountActions'
import { formatRupiah, formatDateOnly } from '@/lib/utils'
import { Plus, Tag, Trash2, Power, Search } from 'lucide-react'

interface DiscountViewProps {
  initialDiscounts: (Discount & { product?: Product | null })[]
  products: Product[]
}

export function DiscountView({ initialDiscounts, products }: DiscountViewProps) {
  const [selectedTab, setSelectedTab] = useState<'active' | 'all'>('active')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleDiscountAction(id, current)
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus promo "${name}"?`)) {
      startTransition(async () => {
        await deleteDiscountAction(id)
      })
    }
  }

  const filteredDiscounts = useMemo(() => {
    return initialDiscounts.filter((d) => {
      if (selectedTab === 'active' && !d.is_active) return false
      const q = search.toLowerCase().trim()
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        (d.product?.name && d.product.name.toLowerCase().includes(q))
      )
    })
  }, [initialDiscounts, selectedTab, search])

  const activeCount = initialDiscounts.filter((d) => d.is_active).length

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
            Setup Diskon & Bundling
          </h1>
          <p className="text-xs text-[#8B8B8B] mt-0.5">
            Kelola potongan harga promosi nominal (Rp) atau persentase (%)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#00A250] hover:bg-[#008f46] text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Diskon</span>
        </button>
      </div>

      {/* iOS Segmented Control Tabs */}
      <div className="ios-segmented-container">
        <button
          onClick={() => setSelectedTab('active')}
          className={`ios-segmented-tab ${selectedTab === 'active' ? 'ios-segmented-tab-active' : ''}`}
        >
          Diskon Aktif ({activeCount})
        </button>
        <button
          onClick={() => setSelectedTab('all')}
          className={`ios-segmented-tab ${selectedTab === 'all' ? 'ios-segmented-tab-active' : ''}`}
        >
          Semua Promo ({initialDiscounts.length})
        </button>
      </div>

      {/* iOS Search Box */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-[#8B8B8B]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari promo atau nama produk..."
          className="w-full pl-11 pr-4 py-3 bg-[#E5E5EA] border-0 rounded-full text-sm text-[#1E1E1E] placeholder:text-[#8B8B8B] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
        />
      </div>

      {/* Discount List Card */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F9] text-[#8B8B8B] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3.5 px-4">Nama Promo</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Besaran Diskon</th>
                <th className="py-3.5 px-4">Periode</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8B8B8B]">
                    <Tag className="w-10 h-10 stroke-1 mx-auto mb-2 text-[#8B8B8B]" />
                    <p className="font-semibold text-xs text-[#1E1E1E]">Belum ada promo diskon</p>
                    <p className="text-[11px] text-[#8B8B8B] mt-0.5">
                      Klik tombol &quot;Tambah Diskon&quot; untuk membuat promo baru
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1E1E1E]">
                      {d.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#1E1E1E]">
                      {d.product?.name || `ID: ${d.product_id}`}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-[#00A250]">
                      {d.type === 'percentage'
                        ? `${d.value}%`
                        : formatRupiah(d.value)}
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B8B] text-[11px]">
                      {formatDateOnly(d.start_date)} s/d {formatDateOnly(d.end_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggle(d.id, d.is_active)}
                        disabled={isPending}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer ${
                          d.is_active
                            ? 'bg-[#D6F0E0] text-[#00A250]'
                            : 'bg-[#E5E5EA] text-[#8B8B8B]'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{d.is_active ? 'Aktif' : 'Non-Aktif'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id, d.name)}
                        disabled={isPending}
                        title="Hapus Promo"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DiscountModal
        products={products}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

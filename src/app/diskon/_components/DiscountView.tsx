'use client'

import { useState, useTransition } from 'react'
import { Discount, Product } from '@/types/database'
import { DiscountModal } from './DiscountModal'
import { toggleDiscountAction, deleteDiscountAction } from '../_actions/discountActions'
import { formatRupiah, formatDateOnly } from '@/lib/utils'
import { Percent, Plus, Tag, Trash2, Power, AlertCircle } from 'lucide-react'

interface DiscountViewProps {
  initialDiscounts: (Discount & { product?: Product | null })[]
  products: Product[]
}

export function DiscountView({ initialDiscounts, products }: DiscountViewProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Percent className="w-6 h-6 text-emerald-600" />
            <span>Setup Diskon & Promo</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Konfigurasi promo potongan harga nominal (Rp) atau persentase (%) per produk
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Diskon</span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Nama Promo</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Besaran Diskon</th>
                <th className="py-3 px-4">Periode Berlaku</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {initialDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Tag className="w-10 h-10 stroke-1 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-medium text-xs">Belum ada promo diskon yang dibuat</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Klik tombol &quot;Tambah Diskon&quot; untuk membuat promo baru
                    </p>
                  </td>
                </tr>
              ) : (
                initialDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {d.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                      {d.product?.name || `ID: ${d.product_id}`}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {d.type === 'percentage'
                        ? `${d.value}%`
                        : formatRupiah(d.value)}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-[11px]">
                      {formatDateOnly(d.start_date)} s/d {formatDateOnly(d.end_date)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggle(d.id, d.is_active)}
                        disabled={isPending}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer ${
                          d.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{d.is_active ? 'Aktif' : 'Non-Aktif'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id, d.name)}
                        disabled={isPending}
                        title="Hapus Promo"
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
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

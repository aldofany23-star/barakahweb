'use client'

import { useState, useTransition } from 'react'
import { Product, Category } from '@/types/database'
import { createProductAction, updateProductAction } from '../_actions/productActions'
import { X, Loader2, Package, Tag, DollarSign, Layers } from 'lucide-react'

interface ProductModalProps {
  product: Product | null
  categories: Category[]
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({
  product,
  categories,
  isOpen,
  onClose,
}: ProductModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEditing = !!product

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const name = formData.get('name')?.toString() || ''
    const sku = formData.get('sku')?.toString() || ''
    const categoryId = formData.get('categoryId')?.toString() || null
    const buyPrice = parseFloat(formData.get('buyPrice')?.toString() || '0')
    const sellPrice = parseFloat(formData.get('sellPrice')?.toString() || '0')
    const stockQty = parseInt(formData.get('stockQty')?.toString() || '0', 10)
    const lowStockThreshold = parseInt(formData.get('lowStockThreshold')?.toString() || '5', 10)

    startTransition(async () => {
      let res
      if (isEditing) {
        res = await updateProductAction(product.id, {
          name,
          sku,
          categoryId,
          buyPrice,
          sellPrice,
          lowStockThreshold,
        })
      } else {
        res = await createProductAction({
          name,
          sku,
          categoryId,
          buyPrice,
          sellPrice,
          stockQty,
          lowStockThreshold,
        })
      }

      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menyimpan produk')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {isEditing ? `ID: ${product.id}` : 'Masukkan rincian informasi produk POS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nama Produk *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={product?.name || ''}
              placeholder="Contoh: Whiskas Ocean Fish 1kg"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Kode SKU / Barcode
              </label>
              <input
                type="text"
                name="sku"
                defaultValue={product?.sku || ''}
                placeholder="Contoh: 89912345678"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Kategori
              </label>
              <select
                name="categoryId"
                defaultValue={product?.category_id || ''}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Pilih Kategori...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Harga Modal / Beli (Rp)
              </label>
              <input
                type="number"
                name="buyPrice"
                min="0"
                defaultValue={product?.buy_price || 0}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                name="sellPrice"
                required
                min="0"
                defaultValue={product?.sell_price || 0}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isEditing && (
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Jumlah Stok Awal
                </label>
                <input
                  type="number"
                  name="stockQty"
                  min="0"
                  defaultValue="0"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div className={isEditing ? 'col-span-2' : ''}>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Batas Peringatan Stok Menipis
              </label>
              <input
                type="number"
                name="lowStockThreshold"
                min="1"
                defaultValue={product?.low_stock_threshold || 5}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

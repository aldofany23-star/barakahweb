'use client'

import { useState, useEffect, useTransition } from 'react'
import { Product, Category } from '@/types/database'
import { createProductAction, updateProductAction } from '../_actions/productActions'
import { X, Loader2, Package, Sparkles } from 'lucide-react'

interface ProductModalProps {
  product: Product | null
  categories: Category[]
  isOpen: boolean
  onClose: () => void
}

function generateSku(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '')
  const prefix = cleanName.length >= 3 ? cleanName.slice(0, 3).toUpperCase() : 'PRD'
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${randomNum}`
}

export function ProductModal({
  product,
  categories,
  isOpen,
  onClose,
}: ProductModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!product

  const [name, setName] = useState<string>('')
  const [sku, setSku] = useState<string>('')
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState<boolean>(false)
  const [categoryId, setCategoryId] = useState<string>('')
  const [buyPrice, setBuyPrice] = useState<string>('')
  const [sellPrice, setSellPrice] = useState<string>('')
  const [stockQty, setStockQty] = useState<string>('0')
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5')

  // Reset form when modal opens or product changes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name || '')
        setSku(product.sku || '')
        setIsSkuManuallyEdited(true)
        setCategoryId(product.category_id || '')
        setBuyPrice(product.buy_price ? product.buy_price.toString() : '0')
        setSellPrice(product.sell_price ? product.sell_price.toString() : '0')
        setStockQty(product.stock_qty ? product.stock_qty.toString() : '0')
        setLowStockThreshold(product.low_stock_threshold ? product.low_stock_threshold.toString() : '5')
      } else {
        setName('')
        setSku('')
        setIsSkuManuallyEdited(false)
        setCategoryId('')
        setBuyPrice('')
        setSellPrice('')
        setStockQty('0')
        setLowStockThreshold('5')
      }
      setError(null)
    }
  }, [isOpen, product])

  if (!isOpen) return null

  // Auto-generate SKU when name changes (Mirrors ProductManageScreen.kt:369)
  const handleNameChange = (val: string) => {
    setName(val)
    if (!isEditing && !isSkuManuallyEdited) {
      if (val.trim().length >= 3) {
        setSku(generateSku(val))
      } else if (val.trim().length === 0) {
        setSku('')
      }
    }
  }

  const handleRegenerateSku = () => {
    setSku(generateSku(name))
    setIsSkuManuallyEdited(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama produk harus diisi')
      return
    }

    const buyNum = parseFloat(buyPrice) || 0
    const sellNum = parseFloat(sellPrice) || 0

    if (sellNum <= 0) {
      setError('Harga jual harus lebih besar dari 0')
      return
    }

    startTransition(async () => {
      let res
      if (isEditing) {
        res = await updateProductAction(product.id, {
          name: name.trim(),
          sku: sku.trim() || generateSku(name),
          categoryId: categoryId || null,
          buyPrice: buyNum,
          sellPrice: sellNum,
          lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        })
      } else {
        res = await createProductAction({
          name: name.trim(),
          sku: sku.trim() || generateSku(name),
          categoryId: categoryId || null,
          buyPrice: buyNum,
          sellPrice: sellNum,
          stockQty: parseInt(stockQty, 10) || 0,
          lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header (Mirrors title = if (isEdit) "Edit Detail Produk" else "Tambah Produk Baru") */}
        <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#eef8f2] text-[#00A250] rounded-xl border border-[#b8e8cc]">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                {isEditing ? 'Edit Detail Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-[11px] text-[#757575]">
                {isEditing ? `ID: ${product.id}` : 'Masukkan rincian informasi produk POS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {/* Nama Produk */}
          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Whiskas Ocean Fish 1kg"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
            />
          </div>

          {/* SKU (Auto-generated but editable) & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-semibold text-[#262626]">
                  Kode SKU / Barcode *
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSku}
                  className="text-[10px] text-[#00A250] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  title="Acak SKU Baru"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Acak SKU</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value)
                  setIsSkuManuallyEdited(true)
                }}
                placeholder="Otomatis atau ketik manual"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-mono font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 shadow-2xs"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Terisi otomatis saat mengetik nama produk, bisa diedit bebas.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
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

          {/* Harga Modal & Harga Jual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Harga Modal / Beli (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-bold text-[#00A250] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Stok Awal & Batas Stok Menipis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isEditing && (
              <div>
                <label className="block font-semibold text-[#262626] mb-1.5">
                  Jumlah Stok Awal
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
                />
              </div>
            )}

            <div className={isEditing ? 'col-span-1 sm:col-span-2' : ''}>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Batas Peringatan Stok Menipis (Threshold)
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e2e2e2] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-50 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer text-xs"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

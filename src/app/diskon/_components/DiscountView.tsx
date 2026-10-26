'use client'

import { useState, useTransition, useMemo } from 'react'
import { Discount, Product, Bundle, BundleItem } from '@/types/database'
import {
  createDiscountAction,
  deactivateDiscountAction,
  deleteDiscountAction,
  createBundleAction,
  deactivateBundleAction,
  deleteBundleAction,
} from '../_actions/discountActions'
import { BarakahPopupModal } from '@/components/ui/BarakahPopupModal'
import { formatRupiah, formatDateOnly } from '@/lib/utils'
import {
  Tag,
  Percent,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Gift,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  PackageCheck,
  PackageX,
  HelpCircle,
} from 'lucide-react'

interface DiscountViewProps {
  initialDiscounts: (Discount & { product?: Product | null })[]
  initialBundles: (Bundle & { items: (BundleItem & { product?: Product | null })[] })[]
  products: Product[]
}

interface SmartRecommendation {
  type: 'High Margin' | 'Dead Stock / Slow Moving' | 'Subsidi Silang (Bundling)' | 'Potensi Promo'
  productIds: string[]
  productName: string
  reason: string
  details: string
  suggestedAction: string
  mode: 'single' | 'bundle'
}

export function DiscountView({
  initialDiscounts,
  initialBundles,
  products,
}: DiscountViewProps) {
  // Tabs: 0 -> Diskon Aktif, 1 -> Setup Diskon, 2 -> Rekomendasi
  const [activeTab, setActiveTab] = useState<'active' | 'setup' | 'recommendations'>('active')
  const [setupMode, setSetupMode] = useState<'single' | 'bundle'>('single')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Feedback notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Single Discount Form State
  const [singleName, setSingleName] = useState('')
  const [singleProductId, setSingleProductId] = useState('')
  const [singleSearchQuery, setSingleSearchQuery] = useState('')
  const [isSingleDropdownOpen, setIsSingleDropdownOpen] = useState(false)
  const [singleType, setSingleType] = useState<'nominal' | 'percentage'>('nominal')
  const [singleValue, setSingleValue] = useState('')
  const [singleDuration, setSingleDuration] = useState('30')

  // Bundle Form State
  const [bundleName, setBundleName] = useState('')
  const [bundleSearchQuery, setBundleSearchQuery] = useState('')
  const [isBundleDropdownOpen, setIsBundleDropdownOpen] = useState(false)
  const [bundleSelectedProducts, setBundleSelectedProducts] = useState<
    { product: Product; qty: number }[]
  >([])
  const [bundlePrice, setBundlePrice] = useState('')
  const [bundleDuration, setBundleDuration] = useState('30')

  // Modals & Confirmations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    icon: 'warning' | 'info' | 'error' | 'success'
    confirmText: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    icon: 'info',
    confirmText: 'Ya, Lanjutkan',
    onConfirm: () => {},
  })

  // List of unique active promo names for autocomplete/suggestions
  const activePromoNames = useMemo(() => {
    const names = new Set<string>()
    initialDiscounts.forEach((d) => {
      if (d.name) names.add(d.name)
    })
    initialBundles.forEach((b) => {
      if (b.name) names.add(b.name)
    })
    return Array.from(names)
  }, [initialDiscounts, initialBundles])

  // Smart Recommendations Algorithm (100% mirrors Android DiscountViewModel.kt:276-386)
  const recommendations = useMemo<SmartRecommendation[]>(() => {
    if (products.length === 0) return []
    const recs: SmartRecommendation[] = []

    // 1. High Margin Analysis (Top 3 with margin > 30% and stock > threshold)
    const highMarginProducts = products
      .filter(
        (p) =>
          p.sell_price > 0 &&
          p.buy_price > 0 &&
          ((p.sell_price - p.buy_price) / p.sell_price) * 100 > 30.0 &&
          p.stock_qty > p.low_stock_threshold
      )
      .sort(
        (a, b) =>
          (b.sell_price - b.buy_price) / b.sell_price -
          (a.sell_price - a.buy_price) / a.sell_price
      )
      .slice(0, 3)

    highMarginProducts.forEach((p) => {
      const margin = ((p.sell_price - p.buy_price) / p.sell_price) * 100
      recs.push({
        type: 'High Margin',
        productIds: [p.id],
        productName: p.name,
        reason: `Margin sangat tinggi (${margin.toFixed(1)}%). Ideal untuk di-diskon guna mempercepat perputaran uang tunai.`,
        details: `Modal: ${formatRupiah(p.buy_price)} | Jual: ${formatRupiah(p.sell_price)} | Stok: ${p.stock_qty}`,
        suggestedAction: 'Diskon 10-15%',
        mode: 'single',
      })
    })

    // 2. Dead Stock / Slow Moving Analysis (Top 3 by stock qty with stock >= 2 * threshold)
    const deadStockProducts = products
      .filter((p) => p.stock_qty >= p.low_stock_threshold * 2)
      .sort((a, b) => b.stock_qty - a.stock_qty)
      .slice(0, 3)

    deadStockProducts.forEach((p) => {
      recs.push({
        type: 'Dead Stock / Slow Moving',
        productIds: [p.id],
        productName: p.name,
        reason:
          'Stok barang ini menumpuk di gudang dan lambat terjual. Menyebabkan modal Anda tertahan.',
        details: `Modal: ${formatRupiah(p.buy_price)} | Jual: ${formatRupiah(p.sell_price)} | Stok: ${p.stock_qty}`,
        suggestedAction: 'Diskon Cuci Gudang',
        mode: 'single',
      })
    })

    // 3. Cross Subsidy Bundling Analysis (Multiple pairs)
    const highMarginForBundle = products
      .filter(
        (p) =>
          p.sell_price > 0 &&
          p.buy_price > 0 &&
          ((p.sell_price - p.buy_price) / p.sell_price) * 100 > 25.0
      )
      .sort(
        (a, b) =>
          (b.sell_price - b.buy_price) / b.sell_price -
          (a.sell_price - a.buy_price) / a.sell_price
      )

    const lowMarginOrSlow = products
      .filter(
        (p) =>
          p.sell_price > 0 &&
          p.buy_price > 0 &&
          (((p.sell_price - p.buy_price) / p.sell_price) * 100 < 20.0 ||
            p.stock_qty >= p.low_stock_threshold)
      )
      .sort(
        (a, b) =>
          (a.sell_price - a.buy_price) / a.sell_price -
          (b.sell_price - b.buy_price) / b.sell_price
      )

    let pairsCount = 0
    for (const p1 of highMarginForBundle) {
      for (const p2 of lowMarginOrSlow) {
        if (p1.id !== p2.id && pairsCount < 3) {
          const totalBuy = p1.buy_price + p2.buy_price
          const totalSell = p1.sell_price + p2.sell_price
          const marginP1 = ((p1.sell_price - p1.buy_price) / p1.sell_price) * 100

          const alreadyPaired = recs.some(
            (r) =>
              r.type === 'Subsidi Silang (Bundling)' &&
              r.productIds.includes(p1.id) &&
              r.productIds.includes(p2.id)
          )

          if (!alreadyPaired) {
            recs.push({
              type: 'Subsidi Silang (Bundling)',
              productIds: [p1.id, p2.id],
              productName: `${p1.name} + ${p2.name}`,
              reason: `Margin ${p1.name} sangat tebal (${marginP1.toFixed(1)}%). Gunakan untuk mengangkat ${p2.name} yang lambat/margin tipis.`,
              details: `Total Modal Gabungan: ${formatRupiah(totalBuy)} | Total Harga Normal: ${formatRupiah(totalSell)}`,
              suggestedAction: 'Buat Paket Bundling',
              mode: 'bundle',
            })
            pairsCount++
            break
          }
        }
      }
      if (pairsCount >= 3) break
    }

    // Fallback if empty and products >= 2
    if (!recs.some((r) => r.type === 'Subsidi Silang (Bundling)') && products.length >= 2) {
      const p1 = [...products].sort(
        (a, b) =>
          (b.sell_price - b.buy_price) / (b.sell_price || 1) -
          (a.sell_price - a.buy_price) / (a.sell_price || 1)
      )[0]
      const p2 = products.filter((p) => p.id !== p1?.id).sort((a, b) => b.stock_qty - a.stock_qty)[0]

      if (p1 && p2) {
        recs.push({
          type: 'Subsidi Silang (Bundling)',
          productIds: [p1.id, p2.id],
          productName: `${p1.name} + ${p2.name}`,
          reason:
            'Peluang Bundling: Produk margin teratas dipasangkan dengan stok terbanyak untuk mendorong volume penjualan.',
          details: `Total Modal Gabungan: ${formatRupiah(p1.buy_price + p2.buy_price)} | Total Harga Normal: ${formatRupiah(p1.sell_price + p2.sell_price)}`,
          suggestedAction: 'Buat Paket Bundling',
          mode: 'bundle',
        })
      }
    }

    // Fallback if still empty
    if (recs.length === 0 && products.length > 0) {
      const topProd = [...products].sort(
        (a, b) =>
          (b.sell_price - b.buy_price) / (b.sell_price || 1) -
          (a.sell_price - a.buy_price) / (a.sell_price || 1)
      )[0]
      if (topProd && topProd.sell_price > topProd.buy_price) {
        recs.push({
          type: 'Potensi Promo',
          productIds: [topProd.id],
          productName: topProd.name,
          reason: 'Produk ini memberikan profit margin tertinggi di toko Anda.',
          details: `Modal: ${formatRupiah(topProd.buy_price)} | Jual: ${formatRupiah(topProd.sell_price)} | Stok: ${topProd.stock_qty}`,
          suggestedAction: 'Berikan diskon nominal',
          mode: 'single',
        })
      }
    }

    return recs
  }, [products])

  // Active counts
  const activeDiscounts = initialDiscounts.filter((d) => d.is_active)
  const activeBundles = initialBundles.filter((b) => b.is_active)
  const totalActiveCount = activeDiscounts.length + activeBundles.length

  // Filtered lists for Diskon Aktif Tab
  const filteredDiscounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return activeDiscounts
    return activeDiscounts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.product?.name && d.product.name.toLowerCase().includes(q))
    )
  }, [activeDiscounts, searchQuery])

  const filteredBundles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return activeBundles
    return activeBundles.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.items.some((i) => i.product?.name.toLowerCase().includes(q))
    )
  }, [activeBundles, searchQuery])

  // Group discounts by promo name (Mirrors Android: groupedDiscounts = discounts.groupBy { it.name })
  const groupedDiscounts = useMemo(() => {
    const groups: { [name: string]: (Discount & { product?: Product | null })[] } = {}
    filteredDiscounts.forEach((d) => {
      const key = d.name || 'Promo Spesial'
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    })
    return groups
  }, [filteredDiscounts])

  // Pre-selected product calculation for Single Discount Form
  const selectedProductForSingle = useMemo(() => {
    return products.find((p) => p.id === singleProductId) || null
  }, [products, singleProductId])

  // Filtered products for Single Discount searchable dropdown
  const filteredSingleProducts = useMemo(() => {
    const q = singleSearchQuery.toLowerCase().trim()
    if (!q) return products.slice(0, 50)
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 50)
  }, [products, singleSearchQuery])

  // Filtered products for Bundle searchable dropdown
  const filteredBundleProducts = useMemo(() => {
    const selectedIds = new Set(bundleSelectedProducts.map((it) => it.product.id))
    const available = products.filter((p) => !selectedIds.has(p.id))
    const q = bundleSearchQuery.toLowerCase().trim()
    if (!q) return available.slice(0, 50)
    return available
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 50)
  }, [products, bundleSelectedProducts, bundleSearchQuery])

  // Anti-rugi validation for Single Discount
  const singleParsedValue = parseFloat(singleValue) || 0
  const singleProjectedPrice = useMemo(() => {
    if (!selectedProductForSingle || singleParsedValue <= 0) return 0
    if (singleType === 'nominal') {
      return selectedProductForSingle.sell_price - singleParsedValue
    } else {
      return (
        selectedProductForSingle.sell_price -
        (selectedProductForSingle.sell_price * singleParsedValue) / 100
      )
    }
  }, [selectedProductForSingle, singleParsedValue, singleType])

  const singleAntiRugiError = useMemo(() => {
    if (!selectedProductForSingle || singleParsedValue <= 0) return null
    if (singleType === 'percentage' && singleParsedValue >= 100) {
      return 'Persentase diskon tidak boleh 100% atau lebih!'
    }
    if (singleProjectedPrice <= selectedProductForSingle.buy_price) {
      return `VALIDASI GAGAL: Diskon mengakibatkan harga jual (${formatRupiah(singleProjectedPrice)}) di bawah atau sama dengan harga modal (${formatRupiah(selectedProductForSingle.buy_price)}). Potensi kerugian!`
    }
    return null
  }, [selectedProductForSingle, singleParsedValue, singleType, singleProjectedPrice])

  // Anti-rugi validation for Bundle
  const bundleParsedPrice = parseFloat(bundlePrice) || 0
  const bundleAccumulation = useMemo(() => {
    let totalBuy = 0
    let totalNormal = 0
    bundleSelectedProducts.forEach(({ product, qty }) => {
      totalBuy += (product.buy_price || 0) * qty
      totalNormal += (product.sell_price || 0) * qty
    })
    return { totalBuy, totalNormal }
  }, [bundleSelectedProducts])

  const bundleAntiRugiError = useMemo(() => {
    if (bundleSelectedProducts.length === 0 || bundleParsedPrice <= 0) return null
    if (bundleParsedPrice <= bundleAccumulation.totalBuy) {
      return `VALIDASI GAGAL: Harga bundling (${formatRupiah(bundleParsedPrice)}) di bawah atau sama dengan total modal (${formatRupiah(bundleAccumulation.totalBuy)}).`
    }
    return null
  }, [bundleSelectedProducts, bundleParsedPrice, bundleAccumulation.totalBuy])

  // Handle Apply Recommendation
  const handleApplyRecommendation = (rec: SmartRecommendation) => {
    if (rec.mode === 'single') {
      setSetupMode('single')
      setSingleProductId(rec.productIds[0] || '')
      const found = products.find((p) => p.id === rec.productIds[0])
      setSingleSearchQuery(found?.name || '')
      setSingleName(rec.type)
      setSingleType('percentage')
      setSingleValue(rec.suggestedAction.includes('10-15%') ? '10' : '20')
      setActiveTab('setup')
    } else {
      setSetupMode('bundle')
      setBundleName(`Paket Bundling ${rec.productName}`)
      const selected = products
        .filter((p) => rec.productIds.includes(p.id))
        .map((p) => ({ product: p, qty: 1 }))
      setBundleSelectedProducts(selected)
      // Suggest bundle price: total buy + 15% profit
      const totalBuy = selected.reduce((sum, item) => sum + item.product.buy_price, 0)
      const suggested = Math.round((totalBuy * 1.2) / 1000) * 1000
      setBundlePrice(suggested.toString())
      setActiveTab('setup')
    }
  }

  // Handle Submit Single Discount
  const handleSubmitSingleDiscount = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!singleName.trim()) {
      setErrorMessage('Nama promo harus diisi')
      return
    }
    if (!selectedProductForSingle) {
      setErrorMessage('Pilih produk yang akan didiskon')
      return
    }
    if (singleParsedValue <= 0) {
      setErrorMessage('Besaran diskon harus lebih dari 0')
      return
    }
    if (singleAntiRugiError) {
      setErrorMessage(singleAntiRugiError)
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Terapkan Diskon',
      message: `Apakah Anda yakin ingin menerapkan promo ${singleName} ${
        singleType === 'percentage' ? `${singleParsedValue}%` : formatRupiah(singleParsedValue)
      } untuk produk "${selectedProductForSingle.name}"?`,
      icon: 'info',
      confirmText: 'Ya, Terapkan',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        startTransition(async () => {
          const res = await createDiscountAction({
            name: singleName.trim(),
            productId: selectedProductForSingle.id,
            value: singleParsedValue,
            type: singleType,
            durationDays: parseInt(singleDuration, 10) || 30,
          })

          if (res.success) {
            setSuccessMessage('Diskon berhasil ditambahkan!')
            setSingleValue('')
            setSingleName('')
            setSingleProductId('')
            setSingleSearchQuery('')
            setActiveTab('active')
          } else {
            setErrorMessage(res.error || 'Gagal menyimpan diskon')
          }
        })
      },
    })
  }

  // Handle Submit Bundle
  const handleSubmitBundle = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!bundleName.trim()) {
      setErrorMessage('Nama paket bundling harus diisi')
      return
    }
    if (bundleSelectedProducts.length === 0) {
      setErrorMessage('Pilih minimal satu produk untuk paket bundling')
      return
    }
    if (bundleParsedPrice <= 0) {
      setErrorMessage('Harga akhir paket harus lebih dari 0')
      return
    }
    if (bundleAntiRugiError) {
      setErrorMessage(bundleAntiRugiError)
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Simpan Paket Bundling',
      message: `Apakah Anda yakin ingin menyimpan paket bundling "${bundleName}" dengan harga ${formatRupiah(
        bundleParsedPrice
      )}?`,
      icon: 'info',
      confirmText: 'Ya, Simpan',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        startTransition(async () => {
          const itemsPayload = bundleSelectedProducts.map((item) => ({
            productId: item.product.id,
            qty: item.qty,
          }))

          const res = await createBundleAction({
            name: bundleName.trim(),
            bundlePrice: bundleParsedPrice,
            items: itemsPayload,
            durationDays: parseInt(bundleDuration, 10) || 30,
          })

          if (res.success) {
            setSuccessMessage('Paket Bundling berhasil ditambahkan!')
            setBundleName('')
            setBundlePrice('')
            setBundleSelectedProducts([])
            setActiveTab('active')
          } else {
            setErrorMessage(res.error || 'Gagal menyimpan paket bundling')
          }
        })
      },
    })
  }

  // Handle Deactivate/Delete Discount
  const handleConfirmDeleteDiscount = (discount: Discount) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Hapus Promo',
      message: `Apakah Anda yakin ingin menghapus promo "${discount.name}"? Barang akan kembali ke harga normal.`,
      icon: 'warning',
      confirmText: 'Ya, Hapus',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        startTransition(async () => {
          const res = await deactivateDiscountAction(discount.id)
          if (res.success) {
            setSuccessMessage('Diskon berhasil dinonaktifkan.')
          } else {
            setErrorMessage(res.error || 'Gagal menghapus diskon')
          }
        })
      },
    })
  }

  // Handle Deactivate/Delete Bundle
  const handleConfirmDeleteBundle = (bundle: Bundle) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Konfirmasi Hapus Bundling',
      message: `Apakah Anda yakin ingin menghapus paket bundling "${bundle.name}"? Paket tidak akan muncul lagi di kasir.`,
      icon: 'warning',
      confirmText: 'Ya, Hapus',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        startTransition(async () => {
          const res = await deactivateBundleAction(bundle.id)
          if (res.success) {
            setSuccessMessage('Bundling berhasil dinonaktifkan.')
          } else {
            setErrorMessage(res.error || 'Gagal menghapus bundling')
          }
        })
      },
    })
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-3 sm:px-6 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      {/* Header (Cloudflare Design) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Setup Diskon & Bundling
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              {totalActiveCount} Promo Aktif
            </span>
          </div>
          <p className="text-xs text-[#757575] mt-1">
            Kelola diskon per produk, paket bundling hemat, serta algoritma rekomendasi anti-rugi
          </p>
        </div>

        {/* Action Button to switch to Setup Tab */}
        {activeTab !== 'setup' && (
          <button
            onClick={() => {
              setActiveTab('setup')
              setErrorMessage(null)
              setSuccessMessage(null)
            }}
            className="w-full sm:w-auto px-4 py-2 bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Promo Baru</span>
          </button>
        )}
      </div>

      {/* Cloudflare Underline Filter Tabs */}
      <div className="border-b border-[#e2e2e2] flex items-center gap-2 overflow-x-auto no-scrollbar bg-white">
        <button
          onClick={() => {
            setActiveTab('active')
            setErrorMessage(null)
          }}
          className={`py-2.5 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Diskon Aktif</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'active'
                ? 'bg-[#eef8f2] text-[#00A250]'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {totalActiveCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('setup')
            setErrorMessage(null)
          }}
          className={`py-2.5 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Setup Diskon</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('recommendations')
            setErrorMessage(null)
          }}
          className={`py-2.5 px-4 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'recommendations'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Rekomendasi Cerdas</span>
          {recommendations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-bold">
              {recommendations.length}
            </span>
          )}
        </button>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-[#eef8f2] border border-[#b8e8cc] rounded-xl text-[#00A250] flex items-center gap-2.5 text-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <div className="flex-1 font-bold">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: DISKON AKTIF (Bundles & Single Discounts)               */}
      {/* ============================================================ */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari promo, paket bundling, atau nama produk..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs sm:text-sm text-[#262626] placeholder:text-gray-400 focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
            />
          </div>

          {totalActiveCount === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#e2e2e2] shadow-2xs">
              <Tag className="w-10 h-10 stroke-1 mx-auto mb-2 text-gray-400" />
              <h3 className="font-bold text-sm text-[#262626]">Belum ada promo/bundling aktif</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Buat diskon baru di tab Setup Diskon atau terapkan salah satu rekomendasi cerdas anti-rugi.
              </p>
              <button
                onClick={() => setActiveTab('setup')}
                className="mt-4 px-4 py-2 bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Mulai Buat Diskon</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Result Empty State */}
              {filteredBundles.length === 0 && filteredDiscounts.length === 0 && (
                <div className="p-10 text-center bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
                  <Search className="w-8 h-8 stroke-1 mx-auto mb-2 text-gray-400" />
                  <h3 className="font-bold text-sm text-[#262626]">Tidak ada hasil promo</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Tidak ada promo atau paket bundling yang cocok dengan &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}

              {/* SECTION: PAKET BUNDLING AKTIF */}
              {filteredBundles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#00A250]" />
                    <h2 className="font-bold text-sm sm:text-base text-[#262626]">
                      Paket Bundling Aktif ({filteredBundles.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBundles.map((bundle) => {
                      const totalNormal = bundle.items.reduce((sum, bi) => {
                        return sum + (bi.product?.sell_price || 0) * (bi.qty || 1)
                      }, 0)
                      const totalModal = bundle.items.reduce((sum, bi) => {
                        return sum + (bi.product?.buy_price || 0) * (bi.qty || 1)
                      }, 0)
                      const rawMargin = bundle.bundle_price - totalModal
                      const dateStr = bundle.end_date ? bundle.end_date.slice(0, 10) : ''

                      return (
                        <div
                          key={bundle.id}
                          className="bg-white rounded-xl border border-[#e2e2e2] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#b8e8cc] transition"
                        >
                          {/* Bundle Card Header */}
                          <div className="bg-[#f8fdf9] px-4 py-3 border-b border-[#e2e2e2] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#eef8f2] border border-[#b8e8cc] flex items-center justify-center text-[#00A250]">
                                <Gift className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#262626]">{bundle.name}</h3>
                                {dateStr ? (
                                  <span className="text-xs font-semibold text-[#d97706] flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Berakhir: {dateStr}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-[#00A250] flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A250]" />
                                    <span>Aktif Selamanya</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleConfirmDeleteBundle(bundle)}
                              disabled={isPending}
                              title="Hapus / Nonaktifkan Bundling"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Bundle Items List */}
                          <div className="p-4 space-y-3 flex-1">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Isi Paket Bundling:
                            </div>
                            <div className="space-y-1.5 divide-y divide-gray-100">
                              {bundle.items.map((bi) => (
                                <div
                                  key={bi.id}
                                  className="pt-1.5 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A250] shrink-0" />
                                    <span className="font-semibold text-gray-800">
                                      {bi.product?.name || 'Produk'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc]">
                                      x{bi.qty}
                                    </span>
                                  </div>
                                  <span className="text-gray-500 text-xs">
                                    {formatRupiah((bi.product?.sell_price || 0) * (bi.qty || 1))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bundle Pricing Footer */}
                          <div className="px-4 py-3 bg-[#fafafa] border-t border-[#e2e2e2] flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500 font-medium">
                                Total Harga Normal:
                              </div>
                              {totalNormal > bundle.bundle_price && (
                                <div className="text-xs text-gray-400 line-through">
                                  {formatRupiah(totalNormal)}
                                </div>
                              )}
                              <div className="text-xs text-green-700 font-semibold mt-0.5">
                                Margin: +{formatRupiah(rawMargin)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-[#00A250] font-bold uppercase tracking-wider">
                                Harga Paket Spesial
                              </div>
                              <div className="text-sm font-bold text-[#00A250]">
                                {formatRupiah(bundle.bundle_price)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: DISKON TUNGGAL AKTIF (CLOUDFLARE DATA TABLE) */}
              {filteredDiscounts.length > 0 && (
                <div className="bg-white rounded-xl border border-[#e2e2e2] overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-[#f8f8f8] text-[#757575] uppercase tracking-wider font-semibold border-b border-[#e2e2e2]">
                        <tr>
                          <th className="py-3 px-4 text-xs font-semibold">Nama Produk</th>
                          <th className="py-3 px-4 text-xs font-semibold">Nama Promo</th>
                          <th className="py-3 px-4 text-xs font-semibold">Harga Normal</th>
                          <th className="py-3 px-4 text-xs font-semibold">Diskon</th>
                          <th className="py-3 px-4 text-xs font-semibold">Harga Promo</th>
                          <th className="py-3 px-4 text-xs font-semibold">Margin Riil</th>
                          <th className="py-3 px-4 text-xs font-semibold">Masa Berlaku</th>
                          <th className="py-3 px-4 text-xs font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e2e2]">
                        {filteredDiscounts.map((discount) => {
                          const product = discount.product
                          if (!product) return null
                          const endPrice =
                            discount.type === 'nominal'
                              ? product.sell_price - discount.value
                              : product.sell_price - (product.sell_price * discount.value) / 100
                          const rawMargin = endPrice - product.buy_price
                          const dateStr = discount.end_date ? discount.end_date.slice(0, 10) : ''

                          return (
                            <tr key={discount.id} className="hover:bg-[#fafafa] transition">
                              <td className="py-3.5 px-4 align-middle">
                                <div className="font-bold text-[#262626]">
                                  {product.name}
                                </div>
                                {product.sku && (
                                  <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                                    SKU: {product.sku}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc]">
                                  <Tag className="w-3.5 h-3.5 shrink-0" />
                                  <span>{discount.name || 'Promo Spesial'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 align-middle font-medium text-gray-400">
                                <span className="line-through">{formatRupiah(product.sell_price)}</span>
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-red-50 text-red-600 border border-red-200">
                                  {discount.type === 'percentage'
                                    ? `-${Math.round(discount.value)}%`
                                    : `-Rp ${formatRupiah(discount.value).replace('Rp', '').trim()}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 align-middle font-bold text-[#00A250]">
                                {formatRupiah(endPrice)}
                              </td>
                              <td className="py-3.5 px-4 align-middle">
                                <span
                                  className={`font-semibold ${
                                    rawMargin <= 0 ? 'text-red-600' : 'text-emerald-700'
                                  }`}
                                >
                                  +{formatRupiah(rawMargin)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 align-middle text-gray-500">
                                {dateStr ? (
                                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span>s/d {dateStr}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[#00A250] font-medium bg-[#eef8f2] px-2.5 py-1 rounded-md border border-[#b8e8cc]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A250]" />
                                    <span>Aktif Selamanya</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 align-middle text-right">
                                <button
                                  onClick={() => handleConfirmDeleteDiscount(discount)}
                                  disabled={isPending}
                                  title="Hapus / Nonaktifkan Promo"
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SETUP DISKON (Single Discount & Bundling Setup)         */}
      {/* ============================================================ */}
      {activeTab === 'setup' && (
        <div className="w-full space-y-5">
          {/* Sub-tab Toggle: Diskon Tunggal vs Paket Bundling */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl border border-[#e2e2e2] w-full">
            <button
              type="button"
              onClick={() => {
                setSetupMode('single')
                setErrorMessage(null)
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                setupMode === 'single'
                  ? 'bg-white text-[#00A250] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Diskon Tunggal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupMode('bundle')
                setErrorMessage(null)
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                setupMode === 'bundle'
                  ? 'bg-white text-[#2563eb] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Paket Bundling</span>
            </button>
          </div>

          {/* MODE 1: DISKON TUNGGAL FORM */}
          {setupMode === 'single' && (
            <form
              onSubmit={handleSubmitSingleDiscount}
              className="bg-white rounded-2xl border border-[#e2e2e2] p-5 sm:p-6 shadow-2xs text-xs"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block font-bold text-[#262626] mb-1.5">
                      Nama Promo *
                    </label>
                    <input
                      type="text"
                      list="active-promo-names"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="Contoh: Flash Sale Akhir Bulan / Promo Spesial"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
                    />
                    <datalist id="active-promo-names">
                      {activePromoNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Pilih Produk (Searchable Input dengan Dropdown) */}
                  <div className="relative">
                    <label className="block font-bold text-[#262626] mb-1.5">
                      Pilih Produk (Ketik untuk Mencari) *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={singleSearchQuery}
                        onChange={(e) => {
                          setSingleSearchQuery(e.target.value)
                          setIsSingleDropdownOpen(true)
                          if (singleProductId && e.target.value !== selectedProductForSingle?.name) {
                            setSingleProductId('')
                          }
                        }}
                        onFocus={() => setIsSingleDropdownOpen(true)}
                        placeholder="Ketik nama produk atau barcode SKU..."
                        required={!singleProductId}
                        className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-semibold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
                      />
                      {singleSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSingleSearchQuery('')
                            setSingleProductId('')
                            setIsSingleDropdownOpen(true)
                          }}
                          className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Options */}
                    {isSingleDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsSingleDropdownOpen(false)}
                        />
                        <div className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e2e2e2] rounded-xl shadow-lg divide-y divide-gray-100 text-xs animate-in fade-in duration-150">
                          {filteredSingleProducts.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">
                              Tidak ada produk yang cocok dengan &quot;{singleSearchQuery}&quot;
                            </div>
                          ) : (
                            filteredSingleProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSingleProductId(p.id)
                                  setSingleSearchQuery(p.name)
                                  setIsSingleDropdownOpen(false)
                                }}
                                className="w-full p-2.5 text-left hover:bg-[#eef8f2] flex items-center justify-between gap-2 transition cursor-pointer group"
                              >
                                <div>
                                  <div className="font-bold text-[#262626] group-hover:text-[#00A250]">
                                    {p.name}
                                  </div>
                                  <div className="text-[11px] text-gray-400">
                                    SKU: {p.sku || '-'} | Stok: {p.stock_qty}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-[#00A250]">{formatRupiah(p.sell_price)}</div>
                                  <div className="text-[10px] text-gray-400">Modal: {formatRupiah(p.buy_price)}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Jenis Diskon: Nominal vs Persen */}
                  <div>
                    <label className="block font-bold text-[#262626] mb-1.5">
                      Jenis Diskon *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSingleType('nominal')}
                        className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          singleType === 'nominal'
                            ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] shadow-2xs'
                            : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span>Potongan Harga (Rp)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleType('percentage')}
                        className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          singleType === 'percentage'
                            ? 'border-[#00A250] bg-[#eef8f2] text-[#00A250] shadow-2xs'
                            : 'border-[#e2e2e2] bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span>Persentase (%)</span>
                      </button>
                    </div>
                  </div>

                  {/* Besaran Diskon & Masa Berlaku */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#262626] mb-1.5">
                        Besaran Diskon ({singleType === 'nominal' ? 'Rp' : '%'}) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={singleValue}
                        onChange={(e) => setSingleValue(e.target.value)}
                        placeholder={singleType === 'nominal' ? 'Contoh: 5000' : 'Contoh: 15'}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#00A250] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#262626] mb-1.5">
                        Masa Berlaku (Hari) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={singleDuration}
                        onChange={(e) => setSingleDuration(e.target.value)}
                        placeholder="30"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Simulation & Anti-Rugi Breakdown */}
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Info Modal & Harga Produk Terpilih */}
                    {selectedProductForSingle ? (
                      <div className="p-4 bg-gray-50 rounded-xl border border-[#e2e2e2] space-y-2.5 animate-in fade-in duration-150">
                        <div className="font-bold text-[#262626] text-xs flex items-center justify-between">
                          <span>Informasi Produk:</span>
                          <span className="text-[#00A250] font-bold truncate max-w-[200px]">
                            {selectedProductForSingle.name}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between p-2.5 bg-white rounded-lg border border-[#e2e2e2]">
                            <span className="text-gray-500 font-medium">Harga Modal:</span>
                            <span className="font-bold text-[#262626]">
                              {formatRupiah(selectedProductForSingle.buy_price)}
                            </span>
                          </div>
                          <div className="flex justify-between p-2.5 bg-white rounded-lg border border-[#e2e2e2]">
                            <span className="text-gray-500 font-medium">Harga Jual Normal:</span>
                            <span className="font-bold text-[#262626]">
                              {formatRupiah(selectedProductForSingle.sell_price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-[#e2e2e2] text-center text-gray-400">
                        <Tag className="w-8 h-8 stroke-1 mx-auto mb-1 text-gray-300" />
                        <p className="font-semibold text-xs text-gray-500">Pilih produk di samping</p>
                        <p className="text-[11px] text-gray-400">Tinjauan modal dan margin akan muncul di sini</p>
                      </div>
                    )}

                    {/* Real-time Calculation & Anti-Rugi Warning Box */}
                    {selectedProductForSingle && singleParsedValue > 0 && (
                      <div className="space-y-2.5">
                        <div className="p-4 bg-[#f8fdf9] border border-[#b8e8cc] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-gray-500 font-medium">Perkiraan Harga Promo:</span>
                            <div className="text-lg font-black text-[#00A250]">
                              {formatRupiah(singleProjectedPrice)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 font-medium">Margin Bersih:</span>
                            <div
                              className={`text-lg font-black ${
                                singleProjectedPrice <= selectedProductForSingle.buy_price
                                  ? 'text-red-500'
                                  : 'text-green-700'
                              }`}
                            >
                              {formatRupiah(singleProjectedPrice - selectedProductForSingle.buy_price)}
                            </div>
                          </div>
                        </div>

                        {singleAntiRugiError && (
                          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-2.5 text-xs animate-in shake duration-150">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="font-semibold leading-tight">{singleAntiRugiError}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        !selectedProductForSingle ||
                        singleParsedValue <= 0 ||
                        Boolean(singleAntiRugiError)
                      }
                      className="w-full py-3 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Terapkan Diskon</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* MODE 2: PAKET BUNDLING FORM */}
          {setupMode === 'bundle' && (
            <form
              onSubmit={handleSubmitBundle}
              className="bg-white rounded-2xl border border-[#e2e2e2] p-5 sm:p-6 shadow-2xs text-xs"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Bundle Info & Inputs */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block font-bold text-[#262626] mb-1.5">
                      Nama Paket (misal: Paket Si Meong) *
                    </label>
                    <input
                      type="text"
                      list="active-promo-names"
                      value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                      placeholder="Contoh: Paket Si Meong / Paket Grooming Hemat"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400 shadow-2xs"
                    />
                  </div>

                  {/* Tambah Produk ke Paket (Searchable Input dengan Dropdown) */}
                  <div className="relative">
                    <label className="block font-bold text-[#262626] mb-1.5">
                      Tambah Produk ke Paket (Ketik untuk Mencari) *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={bundleSearchQuery}
                        onChange={(e) => {
                          setBundleSearchQuery(e.target.value)
                          setIsBundleDropdownOpen(true)
                        }}
                        onFocus={() => setIsBundleDropdownOpen(true)}
                        placeholder="Ketik nama produk untuk mencari dan menambahkan..."
                        className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-semibold text-[#262626] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400 shadow-2xs"
                      />
                      {bundleSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBundleSearchQuery('')}
                          className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Options */}
                    {isBundleDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsBundleDropdownOpen(false)}
                        />
                        <div className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e2e2e2] rounded-xl shadow-lg divide-y divide-gray-100 text-xs animate-in fade-in duration-150">
                          {filteredBundleProducts.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">
                              {bundleSearchQuery
                                ? `Tidak ada produk yang cocok dengan "${bundleSearchQuery}"`
                                : 'Semua produk yang tersedia sudah masuk dalam paket'}
                            </div>
                          ) : (
                            filteredBundleProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setBundleSelectedProducts((prev) => [
                                    ...prev,
                                    { product: p, qty: 1 },
                                  ])
                                  setBundleSearchQuery('')
                                  setIsBundleDropdownOpen(false)
                                }}
                                className="w-full p-2.5 text-left hover:bg-blue-50 flex items-center justify-between gap-2 transition cursor-pointer group"
                              >
                                <div>
                                  <div className="font-bold text-[#262626] group-hover:text-blue-700">
                                    {p.name}
                                  </div>
                                  <div className="text-[11px] text-gray-400">
                                    SKU: {p.sku || '-'} | Stok: {p.stock_qty}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-blue-600">
                                    {formatRupiah(p.sell_price)}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    Modal: {formatRupiah(p.buy_price)}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Input Harga Bundling & Masa Berlaku */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-[#262626] mb-1.5">
                        Harga Akhir Paket (Rp) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bundlePrice}
                        onChange={(e) => setBundlePrice(e.target.value)}
                        placeholder="Contoh: 45000"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#262626] mb-1.5">
                        Masa Berlaku Paket (Hari) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bundleDuration}
                        onChange={(e) => setBundleDuration(e.target.value)}
                        placeholder="30"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-base font-bold text-[#262626] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Anti-Rugi Error Warning */}
                  {bundleAntiRugiError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-start gap-2.5 text-xs animate-in shake duration-150">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="font-semibold leading-tight">{bundleAntiRugiError}</div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        bundleSelectedProducts.length === 0 ||
                        bundleParsedPrice <= 0 ||
                        Boolean(bundleAntiRugiError)
                      }
                      className="w-full py-3 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Simpan Paket Bundling</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Selected Products & Akumulasi Nilai */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Produk dalam Paket ({bundleSelectedProducts.length})
                  </div>

                  {bundleSelectedProducts.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-xl border border-dashed border-[#e2e2e2] text-center text-gray-400">
                      <Gift className="w-8 h-8 stroke-1 mx-auto mb-1 text-gray-300" />
                      <p className="font-semibold text-xs text-gray-500">Belum ada produk dipilih</p>
                      <p className="text-[11px] text-gray-400">Gunakan dropdown di samping untuk memilih produk</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {bundleSelectedProducts.map(({ product, qty }) => (
                        <div
                          key={product.id}
                          className="p-3 bg-white border border-[#e2e2e2] rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <div className="font-bold text-[#262626] text-xs">{product.name}</div>
                            <div className="text-[11px] text-gray-500">
                              Normal: {formatRupiah(product.sell_price)} | Modal: {formatRupiah(product.buy_price)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Qty Stepper */}
                            <div className="flex items-center border border-[#e2e2e2] rounded-lg overflow-hidden bg-gray-50">
                              <button
                                type="button"
                                onClick={() => {
                                  setBundleSelectedProducts((prev) =>
                                    prev.map((item) =>
                                      item.product.id === product.id
                                        ? { ...item, qty: Math.max(1, item.qty - 1) }
                                        : item
                                    )
                                  )
                                }}
                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 cursor-pointer font-bold"
                              >
                                -
                              </button>
                              <span className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-white">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBundleSelectedProducts((prev) =>
                                    prev.map((item) =>
                                      item.product.id === product.id
                                        ? { ...item, qty: item.qty + 1 }
                                        : item
                                    )
                                  )
                                }}
                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 cursor-pointer font-bold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setBundleSelectedProducts((prev) =>
                                  prev.filter((item) => item.product.id !== product.id)
                                )
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Akumulasi Nilai Paket Card */}
                  {bundleSelectedProducts.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-[#e2e2e2] space-y-2.5">
                      <div className="font-bold text-[#262626] text-xs">Akumulasi Nilai Paket</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between p-2.5 bg-white rounded-lg border border-[#e2e2e2]">
                          <span className="text-gray-500 font-medium">Total Modal:</span>
                          <span className="font-bold text-[#262626]">
                            {formatRupiah(bundleAccumulation.totalBuy)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2.5 bg-white rounded-lg border border-[#e2e2e2]">
                          <span className="text-gray-500 font-medium">Total Normal:</span>
                          <span className="font-bold text-[#262626]">
                            {formatRupiah(bundleAccumulation.totalNormal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: REKOMENDASI (Smart AI Promo Recommendations)          */}
      {/* ============================================================ */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#262626] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Rekomendasi Cerdas Anti-Rugi</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Peluang promo otomatis berdasarkan margin profit tebal, cuci gudang dead stock, dan subsidi silang bundling.
              </p>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#e2e2e2] shadow-2xs">
              <PackageCheck className="w-10 h-10 stroke-1 mx-auto mb-2 text-gray-400" />
              <h3 className="font-bold text-sm text-[#262626]">
                Memindai data... Tidak ada rekomendasi saat ini
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Tambahkan lebih banyak produk atau kelola stok agar sistem dapat menemukan peluang diskon terbaik untuk Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => {
                const isDeadStock = rec.type.includes('Dead Stock')
                const isBundle = rec.type.includes('Bundling')

                return (
                  <div
                    key={index}
                    className={`rounded-2xl border p-5 flex flex-col justify-between shadow-2xs transition hover:shadow-md ${
                      isDeadStock
                        ? 'bg-[#fffdfa] border-amber-200'
                        : isBundle
                        ? 'bg-[#fafaff] border-indigo-200'
                        : 'bg-[#f8fdf9] border-[#b8e8cc]'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Badge */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                            isDeadStock
                              ? 'bg-amber-100 text-amber-800'
                              : isBundle
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-[#eef8f2] text-[#00A250]'
                          }`}
                        >
                          {isDeadStock ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : isBundle ? (
                            <Layers className="w-3 h-3" />
                          ) : (
                            <TrendingUp className="w-3 h-3" />
                          )}
                          <span>{rec.type}</span>
                        </span>

                        <span className="text-[11px] font-semibold text-gray-500">
                          {rec.suggestedAction}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                        {rec.productName}
                      </h3>

                      {/* Reason Description */}
                      <p className="text-xs text-gray-600 leading-relaxed">{rec.reason}</p>

                      {/* Details Box */}
                      <div className="p-3 bg-white/80 backdrop-blur-xs rounded-xl border border-gray-200/60 text-[11px] text-gray-700 font-medium">
                        {rec.details}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-2">
                      <button
                        onClick={() => handleApplyRecommendation(rec)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                          isDeadStock
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : isBundle
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-[#00A250] hover:bg-[#008f46] text-white'
                        }`}
                      >
                        <span>Terapkan Promo Sekarang</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal (Mirrors BarakahPopupDialog) */}
      <BarakahPopupModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmButtonText={confirmDialog.confirmText}
        dismissButtonText="Batal"
        icon={confirmDialog.icon}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}

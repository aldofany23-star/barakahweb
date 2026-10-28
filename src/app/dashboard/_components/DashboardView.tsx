'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'
import {
  Order,
  Product,
  Category,
  StoreProfile,
  Profile,
} from '@/types/database'
import { UserSession } from '@/lib/session'
import { formatRupiah, formatDateTime, getOrderPaymentBreakdown, formatPaymentMethodLabel } from '@/lib/utils'
import { OrderDetailModal } from '@/app/laporan-penjualan/_components/OrderDetailModal'
import {
  RotateCw,
  TrendingUp,
  CreditCard,
  Banknote,
  ShoppingCart,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Flame,
  Turtle,
  PackageX,
  HelpCircle,
  QrCode,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface DashboardOrderItem {
  id: string
  order_id: string
  product_id?: string | null
  qty: number
  unit_price: number
  total_price: number
  bundle_name?: string | null
  applied_promo_name?: string | null
  created_at?: string
}

interface DashboardViewProps {
  initialOrders: Order[]
  initialOrderItems: DashboardOrderItem[]
  products: Product[]
  categories: Category[]
  profiles: Profile[]
  storeProfile: StoreProfile | null
  currentUserSession: UserSession | null
}

type DateFilterType = 'today' | '7days' | 'month' | '30days'
type MovementTab = 'fast' | 'slow' | 'non'

export function DashboardView({
  initialOrders,
  initialOrderItems,
  products,
  categories,
  profiles,
  storeProfile,
  currentUserSession,
}: DashboardViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filter Waktu (Default: 'month' / Bulan Ini, sama persis seperti Android DashboardViewModel)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month')

  // Filter User Transaction
  const [selectedCashier, setSelectedCashier] = useState<string>('all')
  const [searchTransaction, setSearchTransaction] = useState<string>('')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 10

  // Filter Product Movement
  const [movementTab, setMovementTab] = useState<MovementTab>('fast')
  const [searchMovement, setSearchMovement] = useState<string>('')

  // Modal Detail Transaksi
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // State Export Excel
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // 1. Filter Orders & Items Berdasarkan Periode Terpilih
  const { filteredOrders, filteredItems, dateRangeLabel } = useMemo(() => {
    const now = new Date()
    let startLimit: Date

    if (dateFilter === 'today') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (dateFilter === '7days') {
      startLimit = new Date()
      startLimit.setDate(startLimit.getDate() - 7)
      startLimit.setHours(0, 0, 0, 0)
    } else if (dateFilter === 'month') {
      // Sama seperti Android: Calendar.set(Calendar.DAY_OF_MONTH, 1)
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    } else {
      // 30 hari
      startLimit = new Date()
      startLimit.setDate(startLimit.getDate() - 30)
      startLimit.setHours(0, 0, 0, 0)
    }

    const fOrders = initialOrders.filter((o) => {
      const d = new Date(o.created_at)
      return d >= startLimit
    })

    const orderIdSet = new Set(fOrders.map((o) => o.id))
    const fItems = initialOrderItems.filter((it) => orderIdSet.has(it.order_id))

    const labelMap: Record<DateFilterType, string> = {
      today: 'Hari Ini',
      '7days': '7 Hari Terakhir',
      month: 'Bulan Ini (' + now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + ')',
      '30days': '30 Hari Terakhir',
    }

    return {
      filteredOrders: fOrders,
      filteredItems: fItems,
      dateRangeLabel: labelMap[dateFilter],
    }
  }, [initialOrders, initialOrderItems, dateFilter])

  // 2. Perhitungan Metrik Utama (Sama Persis dengan Logika Android DashboardViewModel.kt:197-257)
  const analytics = useMemo(() => {
    const completedOrders = filteredOrders.filter((o) => o.status === 'completed')
    const completedOrderIds = new Set(completedOrders.map((o) => o.id))
    const completedItems = filteredItems.filter((it) => completedOrderIds.has(it.order_id))

    // Total Omset
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

    // Total Barang Keluar / Terjual (Pcs)
    const stockSold = completedItems.reduce((sum, it) => sum + (it.qty || 0), 0)

    // Peta Produk untuk kalkulasi laba & valuasi
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Estimasi Laba Bersih (Untung)
    // Formula Android: sum((item.unit_price - product.buy_price) * item.qty) - order.custom_discount
    let totalProfit = 0
    completedOrders.forEach((order) => {
      const itemsForThis = completedItems.filter((it) => it.order_id === order.id)
      itemsForThis.forEach((item) => {
        const prod = item.product_id ? productMap.get(item.product_id) : null
        if (prod) {
          const margin = (item.unit_price || 0) - (prod.buy_price || 0)
          totalProfit += margin * (item.qty || 1)
        }
      })
      totalProfit -= order.custom_discount || 0
    })

    // Margin Persentase
    const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

    // Valuasi Aset Stok Toko (Stock Valuation - Retail vs Modal)
    const valuasiBeli = products.reduce(
      (sum, p) => sum + (p.stock_qty || 0) * (p.buy_price || 0),
      0
    )
    const valuasiJual = products.reduce(
      (sum, p) => sum + (p.stock_qty || 0) * (p.sell_price || 0),
      0
    )
    const potensiUntung = valuasiJual - valuasiBeli

    // Breakdown Metode Pembayaran
    let cashRevenue = 0
    let cashCount = 0
    let qrisRevenue = 0
    let qrisCount = 0
    let transferRevenue = 0
    let transferCount = 0

    completedOrders.forEach((o) => {
      const bd = getOrderPaymentBreakdown(o)
      if (bd.cash > 0) {
        cashRevenue += bd.cash
        cashCount++
      }
      if (bd.qris > 0) {
        qrisRevenue += bd.qris
        qrisCount++
      }
      if (bd.transfer > 0) {
        transferRevenue += bd.transfer
        transferCount++
      }
    })

    // Rata-rata per struk
    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

    // Stok Menipis
    const lowStockCount = products.filter(
      (p) => !p.is_deleted && p.stock_qty <= p.low_stock_threshold
    ).length

    // Chart Tren Harian (7 atau 14 titik)
    const daysMap = new Map<string, { date: string; total: number; count: number }>()
    const daysCount = dateFilter === 'today' ? 1 : dateFilter === '7days' ? 7 : 14
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
      daysMap.set(key, { date: label, total: 0, count: 0 })
    }

    completedOrders.forEach((o) => {
      const key = o.created_at.split('T')[0]
      if (daysMap.has(key)) {
        const item = daysMap.get(key)!
        item.total += o.total || 0
        item.count += 1
      }
    })

    const dailyChart = Array.from(daysMap.values())
    const maxDaily = Math.max(...dailyChart.map((d) => d.total), 1)

    // Pergerakan Produk (Product Movement: Fast, Slow, Non Moving)
    const soldQtyMap = new Map<string, number>()
    completedItems.forEach((it) => {
      if (it.product_id) {
        soldQtyMap.set(it.product_id, (soldQtyMap.get(it.product_id) || 0) + (it.qty || 0))
      }
    })

    const soldProducts = products.filter((p) => (soldQtyMap.get(p.id) || 0) > 0)
    const totalSoldQty = Array.from(soldQtyMap.values()).reduce((a, b) => a + b, 0)
    const averageQty = soldProducts.length > 0 ? totalSoldQty / soldProducts.length : 0

    const fastMoving: Array<Product & { soldQty: number }> = []
    const slowMoving: Array<Product & { soldQty: number }> = []
    const nonMoving: Array<Product & { soldQty: number }> = []

    products.forEach((p) => {
      const qty = soldQtyMap.get(p.id) || 0
      if (qty === 0) {
        nonMoving.push({ ...p, soldQty: 0 })
      } else if (qty >= averageQty) {
        fastMoving.push({ ...p, soldQty: qty })
      } else {
        slowMoving.push({ ...p, soldQty: qty })
      }
    })

    fastMoving.sort((a, b) => b.soldQty - a.soldQty)
    slowMoving.sort((a, b) => b.soldQty - a.soldQty)

    // User / Cashier Breakdown (Performa per Kasir)
    const cashierMap = new Map<
      string,
      {
        name: string
        orderCount: number
        totalRevenue: number
        cashTotal: number
        qrisTotal: number
        transferTotal: number
        avgOrder: number
        contributionPct: number
      }
    >()

    completedOrders.forEach((o) => {
      const name = o.cashier_name?.trim() || 'Kasir Barakah'
      if (!cashierMap.has(name)) {
        cashierMap.set(name, {
          name,
          orderCount: 0,
          totalRevenue: 0,
          cashTotal: 0,
          qrisTotal: 0,
          transferTotal: 0,
          avgOrder: 0,
          contributionPct: 0,
        })
      }
      const entry = cashierMap.get(name)!
      entry.orderCount += 1
      entry.totalRevenue += o.total || 0

      const bd = getOrderPaymentBreakdown(o)
      entry.cashTotal += bd.cash
      entry.qrisTotal += bd.qris
      entry.transferTotal += bd.transfer
    })

    // Hitung rata-rata dan kontribusi
    const cashierList = Array.from(cashierMap.values()).map((c) => ({
      ...c,
      avgOrder: c.orderCount > 0 ? c.totalRevenue / c.orderCount : 0,
      contributionPct: totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0,
    }))
    cashierList.sort((a, b) => b.totalRevenue - a.totalRevenue)

    return {
      completedOrders,
      totalRevenue,
      totalProfit,
      marginPct,
      stockSold,
      valuasiBeli,
      valuasiJual,
      potensiUntung,
      cashRevenue,
      cashCount,
      qrisRevenue,
      qrisCount,
      transferRevenue,
      transferCount,
      averageOrderValue,
      lowStockCount,
      dailyChart,
      maxDaily,
      averageQty,
      fastMoving,
      slowMoving,
      nonMoving,
      cashierList,
    }
  }, [filteredOrders, filteredItems, products, dateFilter])

  // 3. User Transaction List Filter & Pagination
  const userFilteredTransactions = useMemo(() => {
    return analytics.completedOrders.filter((order) => {
      // Filter Kasir
      if (selectedCashier !== 'all') {
        const orderCashier = (order.cashier_name || '').toLowerCase()
        if (!orderCashier.includes(selectedCashier.toLowerCase())) {
          return false
        }
      }

      // Filter Metode Pembayaran
      if (paymentFilter !== 'all') {
        const method = order.payment_method?.toLowerCase()
        if (paymentFilter === 'split') {
          if (method !== 'split') return false
        } else if (paymentFilter === 'cash') {
          if (method !== 'cash' && method !== 'tunai') {
            const bd = getOrderPaymentBreakdown(order)
            if (bd.cash <= 0) return false
          }
        } else if (paymentFilter === 'qris') {
          if (method !== 'qris') {
            const bd = getOrderPaymentBreakdown(order)
            if (bd.qris <= 0) return false
          }
        } else if (paymentFilter === 'transfer') {
          if (method !== 'transfer' && method !== 'card') {
            const bd = getOrderPaymentBreakdown(order)
            if (bd.transfer <= 0) return false
          }
        }
      }

      // Search (No. Order atau Pelanggan/Meja)
      if (searchTransaction.trim()) {
        const q = searchTransaction.toLowerCase().trim()
        const matchOrder = order.order_number?.toLowerCase().includes(q)
        const matchTable = order.table_number?.toLowerCase().includes(q)
        if (!matchOrder && !matchTable) return false
      }

      return true
    })
  }, [analytics.completedOrders, selectedCashier, paymentFilter, searchTransaction])

  // Pagination transaksi
  const totalTransactionPages = Math.max(
    1,
    Math.ceil(userFilteredTransactions.length / itemsPerPage)
  )
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return userFilteredTransactions.slice(start, start + itemsPerPage)
  }, [userFilteredTransactions, currentPage])

  // 4. Product Movement List Filter
  const displayedMovements = useMemo(() => {
    let list: Array<Product & { soldQty: number }> = []
    if (movementTab === 'fast') list = analytics.fastMoving
    else if (movementTab === 'slow') list = analytics.slowMoving
    else list = analytics.nonMoving

    if (searchMovement.trim()) {
      const q = searchMovement.toLowerCase().trim()
      return list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      )
    }
    return list
  }, [movementTab, searchMovement, analytics])

  // 5. Muat Ulang Manual (Tanpa Polling, hemat 100% egress)
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  // 6. Export ke Excel (.xlsx) dengan ExcelJS (Identik dengan Android ExportHelper & Brand Cloudflare Green)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Barakah Fauna POS'
      workbook.created = new Date()

      // Sheet 1: Ringkasan Analitik
      const summarySheet = workbook.addWorksheet('Ringkasan Analitik')
      summarySheet.views = [{ showGridLines: true }]

      // Header Toko
      summarySheet.mergeCells('A1:E1')
      const titleCell = summarySheet.getCell('A1')
      titleCell.value = (storeProfile?.store_name || 'BARAKAH FAUNA').toUpperCase()
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00A250' },
      }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      summarySheet.getRow(1).height = 30

      summarySheet.mergeCells('A2:E2')
      const subTitleCell = summarySheet.getCell('A2')
      subTitleCell.value = `Laporan Dashboard & Analitik Kasir (${dateRangeLabel})`
      subTitleCell.font = { bold: true, size: 11, color: { argb: 'FF262626' } }
      subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      summarySheet.getRow(2).height = 22

      summarySheet.addRow([])

      // Metrik Utama Table
      const metricHeaders = summarySheet.addRow(['METRIK', 'NILAI / JUMLAH', 'KETERANGAN'])
      metricHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      metricHeaders.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A250' } }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })

      summarySheet.addRow(['Total Omset Penjualan', analytics.totalRevenue, 'Total penerimaan dari transaksi selesai'])
      summarySheet.addRow(['Estimasi Laba Bersih', analytics.totalProfit, `Margin Keuntungan: ${analytics.marginPct}%`])
      summarySheet.addRow(['Total Transaksi Selesai', analytics.completedOrders.length, 'Jumlah struk berhasil'])
      summarySheet.addRow(['Stok Terjual (Total Barang Keluar)', `${analytics.stockSold} Pcs`, 'Total kuantitas barang fisik keluar'])
      summarySheet.addRow(['Valuasi Stok Jual (Retail)', analytics.valuasiJual, 'Potensi omset dari seluruh stok saat ini'])
      summarySheet.addRow(['Valuasi Stok Modal (HPP)', analytics.valuasiBeli, 'Modal tersimpan dalam inventaris'])
      summarySheet.addRow(['Potensi Laba Inventaris Toko', analytics.potensiUntung, 'Selisih nilai retail vs nilai modal'])
      summarySheet.addRow(['Pendapatan Tunai (Cash)', analytics.cashRevenue, `${analytics.cashCount} transaksi`])
      summarySheet.addRow(['Pendapatan QRIS', analytics.qrisRevenue, `${analytics.qrisCount} transaksi`])
      summarySheet.addRow(['Pendapatan Transfer Bank', analytics.transferRevenue, `${analytics.transferCount} transaksi`])

      summarySheet.getColumn(1).width = 35
      summarySheet.getColumn(2).width = 25
      summarySheet.getColumn(3).width = 45

      // Sheet 2: Transaksi Pengguna (User Transactions)
      const trxSheet = workbook.addWorksheet('User Transactions')
      trxSheet.views = [{ showGridLines: true }]

      const trxHeaders = trxSheet.addRow([
        'No',
        'Waktu',
        'No. Order',
        'Kasir (User)',
        'Pelanggan / Meja',
        'Metode',
        'Status',
        'Total (Rp)',
      ])
      trxHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      trxHeaders.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A250' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      analytics.completedOrders.forEach((o, idx) => {
        const row = trxSheet.addRow([
          idx + 1,
          formatDateTime(o.created_at),
          o.order_number,
          o.cashier_name || 'Kasir',
          o.table_number || 'Umum',
          formatPaymentMethodLabel(o),
          'SELESAI',
          o.total,
        ])
        if (idx % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
          })
        }
      })

      trxSheet.getColumn(1).width = 8
      trxSheet.getColumn(2).width = 22
      trxSheet.getColumn(3).width = 18
      trxSheet.getColumn(4).width = 24
      trxSheet.getColumn(5).width = 20
      trxSheet.getColumn(6).width = 14
      trxSheet.getColumn(7).width = 14
      trxSheet.getColumn(8).width = 18

      // Sheet 3: Pergerakan Produk (Product Movements)
      const moveSheet = workbook.addWorksheet('Pergerakan Produk')
      moveSheet.views = [{ showGridLines: true }]

      const moveHeaders = moveSheet.addRow([
        'No',
        'Nama Produk',
        'SKU',
        'Kategori Pergerakan',
        'Terjual (Pcs)',
        'Sisa Stok',
        'Harga Jual (Rp)',
        'Harga Modal (Rp)',
      ])
      moveHeaders.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      moveHeaders.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A250' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      let mIdx = 1
      const appendMovementRows = (
        list: Array<Product & { soldQty: number }>,
        categoryName: string
      ) => {
        list.forEach((p) => {
          const row = moveSheet.addRow([
            mIdx++,
            p.name,
            p.sku || '-',
            categoryName,
            p.soldQty,
            p.stock_qty,
            p.sell_price,
            p.buy_price,
          ])
          if (mIdx % 2 === 0) {
            row.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
            })
          }
        })
      }

      appendMovementRows(analytics.fastMoving, 'Fast Moving')
      appendMovementRows(analytics.slowMoving, 'Slow Moving')
      appendMovementRows(analytics.nonMoving, 'Non Moving')

      moveSheet.getColumn(1).width = 8
      moveSheet.getColumn(2).width = 38
      moveSheet.getColumn(3).width = 16
      moveSheet.getColumn(4).width = 20
      moveSheet.getColumn(5).width = 14
      moveSheet.getColumn(6).width = 12
      moveSheet.getColumn(7).width = 16
      moveSheet.getColumn(8).width = 16

      // Unduh File
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `Dashboard_Barakah_Fauna_${dateFilter}_${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Gagal export excel:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* =========================================================================
          1. CLOUDFLARE TOPBAR & AUDIT HEADER
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-[#e2e2e2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Dashboard & Analitik
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              Data Database Real
            </span>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Performa omset, estimasi laba bersih, valuasi inventaris stok, dan audit transaksi kasir Barakah Fauna.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Export XLSX Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white hover:bg-[#f3f3f3] border border-[#e2e2e2] text-[#262626] text-xs font-semibold rounded-md transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Download Laporan Excel Komprehensif"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 text-[#00A250] animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00A250]" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export XLSX'}</span>
          </button>

          {/* Muat Ulang (Manual on-demand refresh, 0 background polling) */}
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="p-1.5 bg-white border border-[#e2e2e2] hover:bg-gray-50 text-gray-600 rounded-md transition shadow-2xs cursor-pointer flex items-center justify-center"
            title="Muat ulang data terbaru dari database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#00A250]' : ''}`} />
          </button>

          {/* Link Kasir POS */}
          <Link
            href="/kasir"
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#00A250] hover:bg-[#008f46] text-white text-xs font-semibold rounded-md transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Buka Kasir</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. CLOUDFLARE FILTER TOOLBAR (Hari Ini, 7 Hari, Bulan Ini, 30 Hari)
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Period Pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#e2e2e2] rounded-md text-xs text-[#262626] shadow-2xs">
            <span className="text-gray-400">Periode:</span>
            <span className="font-semibold text-[#00A250]">{dateRangeLabel}</span>
          </div>

          <div className="text-[11px] text-gray-500 font-medium">
            Total: <span className="font-bold text-[#262626]">{analytics.completedOrders.length}</span> transaksi selesai
          </div>
        </div>

        {/* Date Selector Segmented Buttons */}
        <div className="inline-flex items-center bg-white border border-[#e2e2e2] rounded-md shadow-2xs text-xs overflow-hidden">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 font-medium transition cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-[#f3f3f3] text-[#262626] font-bold border-b-2 border-[#00A250]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3 py-1.5 font-medium border-l border-[#e2e2e2] transition cursor-pointer ${
              dateFilter === '7days'
                ? 'bg-[#f3f3f3] text-[#262626] font-bold border-b-2 border-[#00A250]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 font-medium border-l border-[#e2e2e2] transition cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-[#f3f3f3] text-[#262626] font-bold border-b-2 border-[#00A250]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setDateFilter('30days')}
            className={`px-3 py-1.5 font-medium border-l border-[#e2e2e2] transition cursor-pointer ${
              dateFilter === '30days'
                ? 'bg-[#f3f3f3] text-[#262626] font-bold border-b-2 border-[#00A250]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            30 Hari
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. EMPAT METRIK UTAMA (Total Omset, Est. Untung, Stok Terjual, Valuasi Stok)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Omset */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#757575]">Total Omset</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              Pendapatan
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#00A250]">
              {formatRupiah(analytics.totalRevenue)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Dari {analytics.completedOrders.length} transaksi selesai
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Rata-rata Struk:</span>
            <span className="font-semibold text-[#262626]">
              {formatRupiah(analytics.averageOrderValue)}
            </span>
          </div>
        </div>

        {/* Card 2: Est. Untung (Laba Bersih & Margin) */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#757575]">Est. Untung (Laba)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
              Margin {analytics.marginPct}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#262626]">
              {formatRupiah(analytics.totalProfit)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Laba kotor dikurangi diskon toko
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Status Profit:</span>
            <span className="font-semibold text-[#00A250] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Positif
            </span>
          </div>
        </div>

        {/* Card 3: Stok Terjual (Total Barang Keluar) */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#757575]">Stok Terjual</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
              Stock Out
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[#262626]">
              {analytics.stockSold.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-gray-400">Pcs</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Total fisik barang keluar toko
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Stok Menipis:</span>
            <span
              className={`font-semibold ${
                analytics.lowStockCount > 0 ? 'text-red-600' : 'text-gray-600'
              }`}
            >
              {analytics.lowStockCount} produk
            </span>
          </div>
        </div>

        {/* Card 4: Valuasi Stok Toko (Retail vs Modal) */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#757575]">Valuasi Aset Stok</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
              +{formatRupiah(analytics.potensiUntung)}
            </span>
          </div>
          <div className="my-2">
            <div className="text-base sm:text-lg font-extrabold text-[#262626] truncate" title={formatRupiah(analytics.valuasiJual)}>
              {formatRupiah(analytics.valuasiJual)}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Modal HPP: {formatRupiah(analytics.valuasiBeli)}
            </p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Potensi Laba Toko:</span>
            <span className="font-semibold text-emerald-600">
              {formatRupiah(analytics.potensiUntung)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. METODE PEMBAYARAN RINGKAS (Tunai, QRIS, Transfer)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tunai */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A250]">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-medium">Tunai (Cash)</div>
              <div className="text-sm font-bold text-[#262626]">
                {formatRupiah(analytics.cashRevenue)}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {analytics.cashCount} order
          </span>
        </div>

        {/* QRIS */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-medium">QRIS Digital</div>
              <div className="text-sm font-bold text-[#262626]">
                {formatRupiah(analytics.qrisRevenue)}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {analytics.qrisCount} order
          </span>
        </div>

        {/* Transfer Bank */}
        <div className="bg-white border border-[#e2e2e2] rounded-xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-medium">Transfer Bank</div>
              <div className="text-sm font-bold text-[#262626]">
                {formatRupiah(analytics.transferRevenue)}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {analytics.transferCount} order
          </span>
        </div>
      </div>

      {/* =========================================================================
          5. TREN OMSET KASIR OVER TIME (Grafik Harian)
         ========================================================================= */}
      <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#262626]">Tren Omset Kasir Over Time</h3>
            <p className="text-[11px] text-[#757575]">
              Fluktuasi omset harian Barakah Fauna dalam rentang periode aktif
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00A250]" />
              <span>Pendapatan Selesai</span>
            </span>
          </div>
        </div>

        <div className="h-44 sm:h-52 flex items-end gap-1.5 sm:gap-3 pt-4 pb-2 border-b border-gray-100 overflow-x-auto no-scrollbar">
          {analytics.dailyChart.map((item, idx) => {
            const heightPct = Math.max(6, Math.round((item.total / analytics.maxDaily) * 100))
            return (
              <div
                key={idx}
                className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                title={`${item.date}: ${formatRupiah(item.total)} (${item.count} order)`}
              >
                <div className="text-[10px] font-semibold text-gray-400 group-hover:text-[#00A250] transition">
                  {item.total > 0 ? `${(item.total / 1000).toFixed(0)}k` : '0'}
                </div>
                <div className="w-full bg-[#f3f3f3] rounded-t-sm h-full flex items-end overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-[#00A250] group-hover:bg-[#008f46] rounded-t-sm transition-all duration-300"
                  />
                </div>
                <div className="text-[10px] text-gray-500 truncate w-full text-center">
                  {item.date}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          6. ANALISIS PERGERAKAN PRODUK (Fast Moving, Slow Moving, Non Moving)
             Logika identik dengan Android ProductMovementSection (DashboardViewModel:247-257)
         ========================================================================= */}
      <div className="bg-white border border-[#e2e2e2] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#e2e2e2] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                Analisis Pergerakan Produk
              </h3>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                Rata-rata: {analytics.averageQty.toFixed(1)} pcs
              </span>
            </div>
            <p className="text-xs text-[#757575] mt-0.5">
              Klasifikasi kecepatan penjualan barang untuk optimalisasi stok dan restock petshop.
            </p>
          </div>

          {/* Search Box inside Product Movements */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchMovement}
              onChange={(e) => setSearchMovement(e.target.value)}
              placeholder="Cari produk pergerakan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#00A250] shadow-2xs"
            />
          </div>
        </div>

        {/* Tab Selector (Fast, Slow, Non Moving) */}
        <div className="flex border-b border-[#e2e2e2] bg-[#fafafa]">
          <button
            onClick={() => setMovementTab('fast')}
            className={`flex-1 py-3 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              movementTab === 'fast'
                ? 'border-amber-500 text-amber-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Fast Moving ({analytics.fastMoving.length})</span>
          </button>

          <button
            onClick={() => setMovementTab('slow')}
            className={`flex-1 py-3 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              movementTab === 'slow'
                ? 'border-blue-500 text-blue-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Turtle className="w-4 h-4 text-blue-500" />
            <span>Slow Moving ({analytics.slowMoving.length})</span>
          </button>

          <button
            onClick={() => setMovementTab('non')}
            className={`flex-1 py-3 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              movementTab === 'non'
                ? 'border-gray-500 text-gray-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <PackageX className="w-4 h-4 text-gray-400" />
            <span>Non Moving ({analytics.nonMoving.length})</span>
          </button>
        </div>

        {/* Movement Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f8f8] text-[#757575] font-semibold border-b border-[#e2e2e2]">
              <tr>
                <th className="py-2.5 px-4">Nama Produk</th>
                <th className="py-2.5 px-4">SKU Barcode</th>
                <th className="py-2.5 px-4 text-center">Terjual</th>
                <th className="py-2.5 px-4 text-center">Sisa Stok</th>
                <th className="py-2.5 px-4 text-right">Harga Jual</th>
                <th className="py-2.5 px-4 text-center">Klasifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e2e2]">
              {displayedMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Tidak ada produk pada kelompok ini
                  </td>
                </tr>
              ) : (
                displayedMovements.slice(0, 15).map((p) => (
                  <tr key={p.id} className="hover:bg-[#fcfcfc] transition">
                    <td className="py-2.5 px-4 font-semibold text-[#262626]">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">
                      {p.sku || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-[#262626]">
                      {p.soldQty} <span className="font-normal text-gray-400">pcs</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stock_qty <= p.low_stock_threshold
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.stock_qty} unit
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-[#00A250]">
                      {formatRupiah(p.sell_price)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {movementTab === 'fast' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3 text-amber-500" /> Fast Moving
                        </span>
                      ) : movementTab === 'slow' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <Turtle className="w-3 h-3 text-blue-500" /> Slow Moving
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          Non Moving
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          7. USER TRANSACTIONS (PENGGANTI "LOG TRANSAKSI TERAKHIR")
             Sesuai instruksi user: "Log Transaksi Terakhir ganti jadi user transaction saja atau tambah yang lain"
         ========================================================================= */}
      <div className="bg-white border border-[#e2e2e2] rounded-xl shadow-2xs overflow-hidden">
        {/* Header User Transactions */}
        <div className="p-4 sm:p-5 border-b border-[#e2e2e2]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00A250]" />
                <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                  User Transactions
                </h3>
              </div>
              <p className="text-xs text-[#757575] mt-0.5">
                Performa per kasir dan daftar riwayat transaksi
              </p>
            </div>

            <Link
              href="/laporan-penjualan"
              className="text-xs font-semibold text-[#00A250] hover:underline flex items-center gap-1"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Cashier Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {analytics.cashierList.map((cashier, idx) => {
              const isSelected = selectedCashier.toLowerCase() === cashier.name.toLowerCase()
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedCashier(isSelected ? 'all' : cashier.name)
                  }
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#00A250] bg-[#eef8f2] shadow-2xs ring-1 ring-[#00A250]'
                      : 'border-[#e2e2e2] bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00A250] font-bold text-xs flex items-center justify-center">
                        {cashier.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#262626] line-clamp-1">
                          {cashier.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {cashier.orderCount} transaksi
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[#00A250] bg-white border border-[#b8e8cc] px-1.5 py-0.5 rounded">
                      {cashier.contributionPct.toFixed(1)}% Omset
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 text-[11px]">Total Omset:</span>
                    <span className="font-extrabold text-[#00A250]">
                      {formatRupiah(cashier.totalRevenue)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter Controls for User Transactions */}
        <div className="p-3.5 sm:p-4 bg-[#fafafa] border-b border-[#e2e2e2] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kasir Dropdown */}
            <select
              value={selectedCashier}
              onChange={(e) => {
                setSelectedCashier(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-[#262626] focus:outline-none focus:border-[#00A250] shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Kasir</option>
              {analytics.cashierList.map((c, i) => (
                <option key={i} value={c.name}>
                  Kasir: {c.name}
                </option>
              ))}
            </select>

            {/* Filter Metode Pembayaran */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-[#262626] focus:outline-none focus:border-[#00A250] shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS Digital</option>
              <option value="transfer">Transfer Bank</option>
              <option value="split">Split Pembayaran</option>
            </select>

            {/* Clear filters button if active */}
            {(selectedCashier !== 'all' || paymentFilter !== 'all' || searchTransaction) && (
              <button
                onClick={() => {
                  setSelectedCashier('all')
                  setPaymentFilter('all')
                  setSearchTransaction('')
                  setCurrentPage(1)
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTransaction}
              onChange={(e) => {
                setSearchTransaction(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari No. Order / Pelanggan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#00A250] shadow-2xs"
            />
          </div>
        </div>

        {/* User Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f8f8] text-[#757575] font-semibold border-b border-[#e2e2e2]">
              <tr>
                <th className="py-2.5 px-3.5">Waktu Transaksi</th>
                <th className="py-2.5 px-3.5">No. Order</th>
                <th className="py-2.5 px-3.5">Kasir (User)</th>
                <th className="py-2.5 px-3.5">Pelanggan / Meja</th>
                <th className="py-2.5 px-3.5">Metode</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right font-bold text-[#262626]">Total</th>
                <th className="py-2.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e2e2]">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    Tidak ada transaksi yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-[#fcfcfc] transition cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5 text-gray-600 font-mono text-[11px]">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-[#262626] group-hover:text-[#00A250] transition">
                      {order.order_number}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {order.cashier_name || 'Kasir'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-gray-600">
                      {order.table_number || 'Umum / Guest'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.payment_method?.toLowerCase() === 'cash'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.payment_method?.toLowerCase() === 'qris'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : order.payment_method?.toLowerCase() === 'split'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00A250] bg-[#eef8f2] px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-extrabold text-[#262626]">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrder(order)
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-[#e2e2e2] text-gray-700 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3 text-[#00A250]" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalTransactionPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-[#e2e2e2] flex items-center justify-between text-xs bg-white">
            <div className="text-gray-500">
              Halaman <span className="font-bold text-[#262626]">{currentPage}</span> dari{' '}
              <span className="font-bold text-[#262626]">{totalTransactionPages}</span> (
              {userFilteredTransactions.length} transaksi)
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#e2e2e2] text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 font-semibold text-gray-700">
                {currentPage} / {totalTransactionPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalTransactionPages, p + 1))}
                disabled={currentPage === totalTransactionPages}
                className="p-1.5 rounded-lg border border-[#e2e2e2] text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          8. DETAIL TRANSAKSI MODAL (On-demand Item Fetching & Thermal Receipt)
         ========================================================================= */}
      <OrderDetailModal
        order={selectedOrder}
        storeProfile={storeProfile}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

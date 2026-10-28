'use client'

import { useState, useMemo } from 'react'
import { Order, Shift, StoreProfile } from '@/types/database'
import { OrderDetailModal } from './OrderDetailModal'
import { formatRupiah, formatDateTime, getOrderPaymentBreakdown, formatPaymentMethodLabel } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import ExcelJS from 'exceljs'
import {
  Receipt,
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

interface SalesReportsViewProps {
  initialOrders: Order[]
  initialShifts?: (Shift & { profile?: { name: string } | null })[]
  storeProfile: StoreProfile | null
}

const ORDERS_PER_PAGE = 20
const SHIFTS_PER_PAGE = 12

export function SalesReportsView({
  initialOrders,
  initialShifts = [],
  storeProfile,
}: SalesReportsViewProps) {
  const [dateFilter, setDateFilter] = useState<
    'today' | '7days' | '30days' | 'all' | 'shift'
  >('today')
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [shiftPage, setShiftPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // In-memory cache for loaded orders (Zero repeat queries to Supabase = safe egress & no polling)
  const [ordersCache, setOrdersCache] = useState<{ [key: string]: Order[] }>({
    today: initialOrders,
  })
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Export progress modal state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')

  // Current selected shift object
  const currentShift = useMemo(() => {
    if (!selectedShiftId) return null
    return initialShifts.find((s) => s.id === selectedShiftId) || null
  }, [initialShifts, selectedShiftId])

  // Derive current orders based on active tab / shift selection
  const currentOrders = useMemo(() => {
    if (dateFilter === 'shift' && selectedShiftId) {
      return ordersCache[`shift_${selectedShiftId}`] || []
    }
    return ordersCache[dateFilter] || ordersCache['today'] || initialOrders
  }, [dateFilter, selectedShiftId, ordersCache, initialOrders])

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return currentOrders

    return currentOrders.filter((order) => {
      const matchesNo = order.order_number?.toLowerCase().includes(q)
      const matchesKasir = order.cashier_name?.toLowerCase().includes(q)
      const matchesTable = order.table_number?.toLowerCase().includes(q)
      const matchesItem = order.order_items?.some(
        (i) =>
          i.product?.name?.toLowerCase().includes(q) ||
          i.bundle_name?.toLowerCase().includes(q)
      )
      return matchesNo || matchesKasir || matchesTable || matchesItem
    })
  }, [currentOrders, search])

  // Summary Metrics (Mirrors Android Shift/Dashboard breakdown: Cash, QRIS, Transfer)
  const metrics = useMemo(() => {
    const totalOmset =
      filteredOrders.length > 0
        ? filteredOrders.reduce((s, o) => s + (o.total || 0), 0)
        : dateFilter === 'shift' && currentShift?.status === 'closed'
        ? Number(currentShift.actual_revenue) || 0
        : 0
    const count = filteredOrders.length

    let cashRevenue = 0
    let qrisRevenue = 0
    let transferRevenue = 0
    let cashCount = 0
    let qrisCount = 0
    let transferCount = 0

    for (const o of filteredOrders) {
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
    }

    return {
      totalOmset,
      count,
      cashRevenue,
      cashCount,
      qrisRevenue,
      qrisCount,
      transferRevenue,
      transferCount,
    }
  }, [filteredOrders, dateFilter, currentShift])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE))
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE)
  }, [filteredOrders, currentPage])

  // Shift pagination & lazy slice
  const totalShiftPages = Math.max(
    1,
    Math.ceil(initialShifts.length / SHIFTS_PER_PAGE)
  )
  const paginatedShifts = useMemo(() => {
    const start = (shiftPage - 1) * SHIFTS_PER_PAGE
    return initialShifts.slice(start, start + SHIFTS_PER_PAGE)
  }, [initialShifts, shiftPage])

  // Lazy tab switcher (Fetches on demand if not cached; caches in memory to save egress)
  const handleFilterChange = async (
    tab: 'today' | '7days' | '30days' | 'all' | 'shift'
  ) => {
    setDateFilter(tab)
    if (tab !== 'shift') {
      setSelectedShiftId(null)
    }
    setCurrentPage(1)
    setShiftPage(1)

    if (tab === 'today') return

    // Lazy load 7 days
    if (tab === '7days' && !ordersCache['7days']) {
      setIsLoadingData(true)
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const supabase = createClient()
        const { data } = await supabase
          .from('orders')
          .select(
            'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, payment_details, created_at'
          )
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
        if (data) {
          setOrdersCache((prev) => ({ ...prev, '7days': data as Order[] }))
        }
      } finally {
        setIsLoadingData(false)
      }
    }
    // Lazy load 30 days
    else if (tab === '30days' && !ordersCache['30days']) {
      setIsLoadingData(true)
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const supabase = createClient()
        const { data } = await supabase
          .from('orders')
          .select(
            'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, payment_details, created_at'
          )
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
        if (data) {
          setOrdersCache((prev) => ({ ...prev, '30days': data as Order[] }))
        }
      } finally {
        setIsLoadingData(false)
      }
    }
    // Lazy load "Semua Data": Muat seluruh transaksi lengkap (chunking 1000 baris) agar 100% identik dengan database & excel
    else if (tab === 'all' && !ordersCache['all']) {
      setIsLoadingData(true)
      try {
        const supabase = createClient()
        let allOrders: Order[] = []
        let from = 0
        const batchSize = 1000

        while (true) {
          const { data, error } = await supabase
            .from('orders')
            .select(
              'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, payment_details, created_at'
            )
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1)

          if (error || !data || data.length === 0) break
          allOrders = allOrders.concat(data as Order[])
          if (data.length < batchSize) break
          from += batchSize
        }

        if (allOrders.length > 0) {
          setOrdersCache((prev) => ({ ...prev, all: allOrders }))
        }
      } finally {
        setIsLoadingData(false)
      }
    }
  }

  // Lazy load specific shift orders on click
  const handleSelectShift = async (shift: Shift) => {
    setSelectedShiftId(shift.id)
    setCurrentPage(1)
    const cacheKey = `shift_${shift.id}`
    if (!ordersCache[cacheKey]) {
      setIsLoadingData(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('orders')
          .select(
            'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, payment_details, created_at'
          )
          .eq('shift_id', shift.id)
          .order('created_at', { ascending: false })
        if (data) {
          setOrdersCache((prev) => ({ ...prev, [cacheKey]: data as Order[] }))
        }
      } finally {
        setIsLoadingData(false)
      }
    }
  }

  // Export to Excel with ExcelJS: Brand green theme, thin borders, zebra striping, accounting summary formulas
  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportProgress('Menyiapkan data transaksi...')

    try {
      let exportRows: Array<{
        order_number: string
        created_at: string
        cashier_name?: string | null
        table_number?: string | null
        payment_method?: string | null
        custom_discount?: number | null
        setupPromoDiscount?: number
        total: number
        status?: string | null
      }> = []

      // JIKA FILTER "SEMUA DATA": Gunakan seluruh 4.619 transaksi database
      if (dateFilter === 'all') {
        let allSource = ordersCache['all'] || []

        if (allSource.length === 0) {
          const supabase = createClient()
          setExportProgress('Menghitung total transaksi di database...')
          const { count: totalCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })

          const totalRows = totalCount || 0
          let from = 0
          const batchSize = 1000

          while (true) {
            setExportProgress(
              `Mengunduh data transaksi (${allSource.length.toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')})...`
            )
            const { data, error } = await supabase
              .from('orders')
              .select(
                'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, payment_details, created_at'
              )
              .order('created_at', { ascending: false })
              .range(from, from + batchSize - 1)

            if (error || !data || data.length === 0) break
            allSource = allSource.concat(data as Order[])
            if (data.length < batchSize) break
            from += batchSize
          }

          if (allSource.length > 0) {
            setOrdersCache((prev) => ({ ...prev, all: allSource }))
          }
        }

        exportRows = allSource.map((o) => ({
          order_number: o.order_number,
          created_at: o.created_at,
          cashier_name: o.cashier_name,
          table_number: o.table_number,
          payment_method: formatPaymentMethodLabel(o),
          custom_discount: o.custom_discount || 0,
          setupPromoDiscount: 0,
          total: o.total || 0,
          status: o.status,
        }))
      } else {
        // Tab Hari Ini, 7 Hari, 30 Hari, atau Sesi Shift: Gunakan filteredOrders di memori
        exportRows = filteredOrders.map((o) => {
          const setupPromoDiscount = (o.order_items || []).reduce((sum, item) => {
            const origPrice = item.product?.sell_price || item.unit_price
            return (
              sum +
              (origPrice > item.unit_price ? (origPrice - item.unit_price) * item.qty : 0)
            )
          }, 0)

          return {
            order_number: o.order_number,
            created_at: o.created_at,
            cashier_name: o.cashier_name,
            table_number: o.table_number,
            payment_method: formatPaymentMethodLabel(o),
            custom_discount: o.custom_discount || 0,
            setupPromoDiscount,
            total: o.total || 0,
            status: o.status,
          }
        })
      }

      if (exportRows.length === 0) {
        setIsExporting(false)
        return
      }

      setExportProgress('Menyusun file Excel dan memberikan styling...')

      const workbook = new ExcelJS.Workbook()
      workbook.creator = storeProfile?.store_name || 'Barakah Fauna'
      const sheet = workbook.addWorksheet('Laporan Penjualan', {
        views: [{ showGridLines: true }],
      })

      // Judul Toko (Baris 1)
      sheet.addRow([storeProfile?.store_name?.toUpperCase() || 'BARAKAH FAUNA'])
      sheet.getCell('A1').font = {
        name: 'Segoe UI',
        bold: true,
        size: 14,
        color: { argb: 'FF00A250' },
      }

      // Subtitle & Periode (Baris 2)
      const periodTitle =
        dateFilter === 'today'
          ? 'Hari Ini'
          : dateFilter === '7days'
          ? '7 Hari Terakhir'
          : dateFilter === '30days'
          ? '30 Hari Terakhir'
          : dateFilter === 'shift'
          ? `Sesi Shift: ${currentShift?.profile?.name || 'Kasir'}`
          : 'Semua Data'

      sheet.addRow([
        `Laporan Rekap Penjualan Kasir • Periode: ${periodTitle} • Total Transaksi: ${exportRows.length.toLocaleString('id-ID')}`,
      ])
      sheet.getCell('A2').font = {
        name: 'Segoe UI',
        size: 10,
        italic: true,
        color: { argb: 'FF757575' },
      }
      sheet.addRow([]) // Baris 3 Blank

      // Header Tabel (Baris 4)
      const headers = [
        'No. Order',
        'Waktu Transaksi',
        'Nama Kasir',
        'Pelanggan',
        'Metode Pembayaran',
        'Subtotal (Rp)',
        'Diskon Setup / Promo (Rp)',
        'Diskon Kasir (Rp)',
        'Total Diskon (Rp)',
        'Total Akhir (Rp)',
        'Status',
      ]
      const headerRow = sheet.addRow(headers)
      headerRow.height = 26
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00A250' },
        }
        cell.font = {
          name: 'Segoe UI',
          bold: true,
          size: 11,
          color: { argb: 'FFFFFFFF' },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF007A3D' } },
          left: { style: 'thin', color: { argb: 'FF007A3D' } },
          bottom: { style: 'medium', color: { argb: 'FF005E2E' } },
          right: { style: 'thin', color: { argb: 'FF007A3D' } },
        }
      })

      // Data Rows (Baris 5 sampai N+4)
      exportRows.forEach((row, idx) => {
        const setupDiscount = row.setupPromoDiscount || 0
        const cashierDiscount = row.custom_discount || 0
        const totalDiscount = setupDiscount + cashierDiscount
        const total = row.total || 0
        const subtotal = total + totalDiscount

        const r = sheet.addRow([
          row.order_number,
          formatDateTime(row.created_at),
          row.cashier_name || 'Staff',
          row.table_number || 'Umum',
          row.payment_method?.toUpperCase() || 'CASH',
          subtotal,
          setupDiscount,
          cashierDiscount,
          totalDiscount,
          total,
          row.status?.toUpperCase() || 'COMPLETED',
        ])
        r.height = 20

        const isOdd = idx % 2 === 1
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF262626' } }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          }
          if (isOdd) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            }
          }

          if (colNum >= 6 && colNum <= 10) {
            cell.numFmt = '#,##0'
            cell.alignment = { vertical: 'middle', horizontal: 'right' }
          } else if (colNum === 1 || colNum === 5 || colNum === 11) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' }
          }
        })
      })

      // Summary Total Row (Baris N+5)
      const startDataRow = 5
      const endDataRow = startDataRow + exportRows.length - 1
      const summaryRow = sheet.addRow([
        `TOTAL (${exportRows.length.toLocaleString('id-ID')} TRANSAKSI)`,
        '',
        '',
        '',
        '',
        { formula: `SUM(F${startDataRow}:F${endDataRow})` },
        { formula: `SUM(G${startDataRow}:G${endDataRow})` },
        { formula: `SUM(H${startDataRow}:H${endDataRow})` },
        { formula: `SUM(I${startDataRow}:I${endDataRow})` },
        { formula: `SUM(J${startDataRow}:J${endDataRow})` },
        '',
      ])
      summaryRow.height = 26
      summaryRow.eachCell((cell, colNum) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF8F1' },
        }
        cell.font = {
          name: 'Segoe UI',
          bold: true,
          size: 11,
          color: { argb: 'FF00A250' },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF00A250' } },
          bottom: { style: 'double', color: { argb: 'FF00A250' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }
        if (colNum >= 6 && colNum <= 10) {
          cell.numFmt = '#,##0'
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
        } else if (colNum === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        }
      })

      // Dynamic Auto-fit Columns: Menghitung panjang teks terpanjang di setiap kolom + padding
      sheet.columns.forEach((column) => {
        let maxLength = 0
        column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber <= 3) return // Lewati baris judul toko & periode
          let val = ''
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'formula' in cell.value) {
              val = '999,999,999'
            } else {
              val = String(cell.value)
            }
          }
          if (val.length > maxLength) {
            maxLength = val.length
          }
        })
        column.width = Math.min(Math.max(maxLength + 4, 15), 45)
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_Penjualan_${periodTitle.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-0 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="px-4 py-3 sm:px-0 sm:py-0 border-b border-[#e2e2e2] sm:border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Laporan Penjualan
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              Rekap Transaksi
            </span>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Riwayat struk transaksi, filter periode sesi kasir, dan rekap omset toko
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="px-4 py-2 bg-white hover:bg-gray-50 border border-[#e2e2e2] text-[#262626] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-stretch sm:self-auto justify-center disabled:opacity-40"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 text-[#00A250] animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-[#00A250]" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export XLSX'}</span>
        </button>
      </div>

      {/* Cloudflare Underline Filter Tabs */}
      <div className="border-b border-[#e2e2e2] flex items-center gap-1 overflow-x-auto no-scrollbar px-2 sm:px-0 bg-white">
        <button
          onClick={() => handleFilterChange('today')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            dateFilter === 'today'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Hari Ini
        </button>
        <button
          onClick={() => handleFilterChange('7days')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            dateFilter === '7days'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          7 Hari Terakhir
        </button>
        <button
          onClick={() => handleFilterChange('30days')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            dateFilter === '30days'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          30 Hari Terakhir
        </button>
        <button
          onClick={() => handleFilterChange('all')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            dateFilter === 'all'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Semua Data
        </button>
        <button
          onClick={() => handleFilterChange('shift')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            dateFilter === 'shift'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Per Sesi Shift</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* VIEW A: SHIFT LIST VIEW (When on 'Per Sesi Shift' and no shift is opened) */}
      {/* ============================================================ */}
      {dateFilter === 'shift' && !selectedShiftId && (
        <div className="px-3 sm:px-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#262626]">
                Daftar Sesi Kasir ({initialShifts.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pilih sesi kasir di bawah untuk melihat rincian omset dan transaksi kasir
              </p>
            </div>
          </div>

          {initialShifts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="font-bold text-sm text-[#262626]">
                Belum ada sesi kasir
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sesi kasir akan otomatis tercatat saat kasir membuka shift di aplikasi/kasir.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedShifts.map((shift) => {
                  const isClosed = shift.status === 'closed'
                  const shiftRevenue = isClosed
                    ? shift.actual_revenue !== null && shift.actual_revenue !== undefined
                      ? Number(shift.actual_revenue)
                      : 0
                    : Number(shift.system_revenue) || 0

                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleSelectShift(shift)}
                      className="bg-white rounded-xl border border-[#e2e2e2] p-4 shadow-2xs hover:border-[#00A250] transition cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 rounded-lg border shrink-0 ${
                              isClosed
                                ? 'bg-gray-100 text-gray-400 border-gray-200'
                                : 'bg-amber-50 text-amber-500 border-amber-200'
                            }`}
                          >
                            <Clock
                              className={`w-4 h-4 ${
                                isClosed ? 'text-gray-400' : 'text-amber-500'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#262626]">
                              {shift.profile?.name || 'Kasir Staff'}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {isClosed
                                ? shiftRevenue > 0
                                  ? 'Selesai'
                                  : '0 Transaksi'
                                : 'Sesi Berjalan'}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isClosed
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {!isClosed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          )}
                          {isClosed ? 'Closed' : 'Active'}
                        </span>
                      </div>

                      <div className="py-2 border-y border-gray-100 text-[11px] space-y-1">
                        <div className="flex justify-between text-gray-500">
                          <span>Sesi Buka:</span>
                          <span className="font-medium text-gray-800">
                            {formatDateTime(shift.start_time)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Sesi Tutup:</span>
                          <span className="font-medium text-gray-800">
                            {shift.end_time
                              ? formatDateTime(shift.end_time)
                              : 'Masih Berjalan'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            Total Omset Sesi
                          </div>
                          <div className="text-sm font-bold text-[#00A250]">
                            {formatRupiah(shiftRevenue)}
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-[#00A250] group-hover:translate-x-1 transition flex items-center gap-0.5">
                          <span>Buka Sesi</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Shift Pagination Controls */}
              {totalShiftPages > 1 && (
                <div className="px-4 py-3 bg-white rounded-xl border border-[#e2e2e2] flex items-center justify-between text-xs shadow-2xs">
                  <div className="text-gray-500 font-medium">
                    Halaman {shiftPage} dari {totalShiftPages} ({initialShifts.length} sesi kasir)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShiftPage((p) => Math.max(1, p - 1))}
                      disabled={shiftPage === 1}
                      className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() =>
                        setShiftPage((p) => Math.min(totalShiftPages, p + 1))
                      }
                      disabled={shiftPage === totalShiftPages}
                      className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW B: ORDERS / DETAIL VIEW (For regular tabs OR when a shift is selected) */}
      {/* ============================================================ */}
      {(dateFilter !== 'shift' || selectedShiftId) && (
        <div className="space-y-4 sm:space-y-6">
          {/* Shift Active Banner (Shown when inspecting a specific shift) */}
          {dateFilter === 'shift' && currentShift && (
            <div className="px-3 sm:px-0">
              <div className="p-3.5 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedShiftId(null)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 bg-[#fafafa] hover:bg-gray-100 border border-[#e2e2e2] text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Daftar Sesi</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        currentShift.status === 'closed'
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-amber-50 text-amber-500 border-amber-200'
                      }`}
                    >
                      <Clock
                        className={`w-4 h-4 ${
                          currentShift.status === 'closed'
                            ? 'text-gray-400'
                            : 'text-amber-500'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#262626]">
                        Sesi: {currentShift.profile?.name || 'Staff'} (
                        {currentShift.status === 'closed' ? 'CLOSED' : 'ACTIVE'})
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Mulai: {formatDateTime(currentShift.start_time)} • Selesai:{' '}
                        {currentShift.end_time
                          ? formatDateTime(currentShift.end_time)
                          : 'Masih Berjalan'}
                      </div>
                      {currentShift.status === 'closed' &&
                        currentShift.actual_revenue !== null && (
                          <div className="text-[11px] text-gray-600 font-medium mt-0.5">
                            Omset Tercatat:{' '}
                            <span className="font-bold text-[#00A250]">
                              {formatRupiah(Number(currentShift.actual_revenue))}
                            </span>
                            {currentShift.starting_cash
                              ? ` • Modal Awal: ${formatRupiah(
                                  Number(currentShift.starting_cash)
                                )}`
                              : ''}
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="text-right self-end sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                      currentShift.status === 'closed'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {currentShift.status !== 'closed' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    {currentShift.status === 'closed' ? 'Shift Selesai' : 'Shift Aktif'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards (Cloudflare Card Style: Cash, QRIS, Transfer separated) */}
          <div className="px-3 sm:px-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
                <div className="text-xs font-medium text-gray-500 mb-1">Total Omset</div>
                <div className="text-lg sm:text-xl font-bold text-[#00A250]">
                  {formatRupiah(metrics.totalOmset)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {metrics.count} total transaksi
                </div>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
                <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                  <span>Uang Tunai (Cash)</span>
                  <Banknote className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-[#262626]">
                  {formatRupiah(metrics.cashRevenue)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {metrics.cashCount} transaksi tunai
                </div>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
                <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                  <span>QRIS</span>
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-[#262626]">
                  {formatRupiah(metrics.qrisRevenue)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {metrics.qrisCount} transaksi QRIS
                </div>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#e2e2e2] shadow-2xs">
                <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                  <span>Transfer Bank</span>
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-[#262626]">
                  {formatRupiah(metrics.transferRevenue)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {metrics.transferCount} transaksi transfer
                </div>
              </div>
            </div>
          </div>

          {/* Cloudflare Search Box */}
          <div className="px-3 sm:px-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Cari No. Order, nama kasir, pelanggan..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs sm:text-sm text-[#262626] placeholder:text-gray-400 focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
              />
            </div>
          </div>

          {/* Orders Table (Cloudflare Style Data Table) */}
          <div className="px-3 sm:px-0">
            <div className="bg-white rounded-xl border border-[#e2e2e2] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#f8f8f8] text-[#757575] uppercase tracking-wider font-semibold border-b border-[#e2e2e2]">
                    <tr>
                      <th className="py-3 px-4">No. Order</th>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Kasir</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4">Diskon</th>
                      <th className="py-3 px-4 font-bold text-[#262626]">Total</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e2e2]">
                    {isLoadingData ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#00A250]" />
                            <span className="text-xs font-medium">
                              Memuat data transaksi...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          Tidak ada transaksi pada filter periode ini
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => {
                        const setupPromoDiscount = (order.order_items || []).reduce(
                          (sum, item) => {
                            const origPrice =
                              item.product?.sell_price || item.unit_price
                            return (
                              sum +
                              (origPrice > item.unit_price
                                ? (origPrice - item.unit_price) * item.qty
                                : 0)
                            )
                          },
                          0
                        )
                        const totalDiscount =
                          (order.custom_discount || 0) + setupPromoDiscount
                        const hasDiscount = totalDiscount > 0

                        const method = order.payment_method?.toLowerCase()
                        const badgeClass =
                          method === 'cash' || method === 'tunai'
                            ? 'bg-[#eef8f2] text-[#00A250] border-[#b8e8cc]'
                            : method === 'qris'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : method === 'transfer'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : method === 'split'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-[#fafafa] transition"
                          >
                            <td className="py-3.5 px-4 align-middle">
                              <span
                                className={`font-mono text-xs ${
                                  hasDiscount
                                    ? 'font-extrabold text-red-600'
                                    : 'font-bold text-[#1E1E1E]'
                                }`}
                              >
                                {order.order_number}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 align-middle text-gray-500 font-medium">
                              {formatDateTime(order.created_at)}
                            </td>
                            <td className="py-3.5 px-4 align-middle text-[#262626] font-medium">
                              {order.cashier_name || 'Staff'}
                            </td>
                            <td className="py-3.5 px-4 align-middle text-gray-600">
                              {order.table_number || 'Umum'}
                            </td>
                            <td className="py-3.5 px-4 align-middle">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${badgeClass}`}
                              >
                                {order.payment_method}
                              </span>
                              {order.payment_method?.toLowerCase() === 'split' && order.payment_details?.payments && (
                                <div className="text-[10px] text-gray-500 mt-0.5 font-sans">
                                  {order.payment_details.payments.map((p) => `${p.method.toUpperCase()}: ${formatRupiah(p.amount)}`).join(' + ')}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-middle">
                              {totalDiscount > 0 ? (
                                <span className="text-red-600 font-bold text-xs">
                                  -{formatRupiah(totalDiscount)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 align-middle font-extrabold text-[#00A250] text-xs">
                              {formatRupiah(order.total)}
                            </td>
                            <td className="py-3.5 px-4 align-middle text-right">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                title="Lihat & Cetak Receipt"
                                className="px-2.5 py-1.5 bg-white hover:bg-[#eef8f2] border border-[#e2e2e2] hover:border-[#b8e8cc] text-[#262626] hover:text-[#00A250] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                              >
                                <Receipt className="w-3.5 h-3.5 text-[#00A250]" />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Orders Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-[#fafafa] border-t border-[#e2e2e2] flex items-center justify-between text-xs">
                  <div className="text-gray-500 font-medium">
                    Halaman {currentPage} dari {totalPages} ({filteredOrders.length}{' '}
                    transaksi)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-xl p-5 max-w-sm w-full space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc]">
                <FileSpreadsheet className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#262626]">
                  Menyiapkan File Excel
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {exportProgress || 'Mohon tunggu sebentar...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-gray-700 bg-[#fafafa] p-3 rounded-xl border border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin text-[#00A250] shrink-0" />
              <span className="font-medium">{exportProgress}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Receipt Modal */}
      <OrderDetailModal
        order={selectedOrder}
        storeProfile={storeProfile}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

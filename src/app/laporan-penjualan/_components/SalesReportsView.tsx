'use client'

import { useState, useMemo } from 'react'
import { Order, StoreProfile } from '@/types/database'
import { OrderDetailModal } from './OrderDetailModal'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import {
  Receipt,
  Search,
  DollarSign,
  CreditCard,
  Banknote,
  Download,
  Eye,
} from 'lucide-react'

interface SalesReportsViewProps {
  initialOrders: Order[]
  storeProfile: StoreProfile | null
}

export function SalesReportsView({
  initialOrders,
  storeProfile,
}: SalesReportsViewProps) {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('today')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Filter orders by date & search
  const filteredOrders = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000

    return initialOrders.filter((order) => {
      const orderTime = new Date(order.created_at).getTime()

      if (dateFilter === 'today' && orderTime < todayStart) return false
      if (dateFilter === '7days' && orderTime < sevenDaysAgo) return false
      if (dateFilter === '30days' && orderTime < thirtyDaysAgo) return false

      const q = search.toLowerCase().trim()
      if (q) {
        const matchesNo = order.order_number?.toLowerCase().includes(q)
        const matchesKasir = order.cashier_name?.toLowerCase().includes(q)
        const matchesTable = order.table_number?.toLowerCase().includes(q)
        if (!matchesNo && !matchesKasir && !matchesTable) return false
      }

      return true
    })
  }, [initialOrders, dateFilter, search])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalOmset = filteredOrders.reduce((s, o) => s + (o.total || 0), 0)
    const count = filteredOrders.length
    const avg = count > 0 ? totalOmset / count : 0

    const cashRevenue = filteredOrders
      .filter((o) => o.payment_method?.toLowerCase() === 'cash')
      .reduce((s, o) => s + (o.total || 0), 0)

    const nonCashRevenue = totalOmset - cashRevenue

    return { totalOmset, count, avg, cashRevenue, nonCashRevenue }
  }, [filteredOrders])

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) return

    const headers = [
      'No Order',
      'Waktu',
      'Kasir',
      'Meja/Catatan',
      'Metode Pembayaran',
      'Subtotal',
      'Diskon',
      'Total',
      'Status',
    ]

    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${formatDateTime(o.created_at)}"`,
      `"${o.cashier_name || 'Staff'}"`,
      `"${o.table_number || ''}"`,
      `"${o.payment_method}"`,
      o.subtotal,
      o.custom_discount,
      o.total,
      `"${o.status}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Laporan_Penjualan_${dateFilter}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
            Laporan Penjualan
          </h1>
          <p className="text-xs text-[#8B8B8B] mt-0.5">
            Riwayat struk transaksi, filter periode, dan rekap pendapatan
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredOrders.length === 0}
          className="px-5 py-2.5 bg-white border border-[#E5E7EB] hover:bg-[#F9F9F9] text-[#1E1E1E] rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Download className="w-4 h-4 text-[#00A250]" />
          <span>Ekspor CSV / Excel</span>
        </button>
      </div>

      {/* KPI Cards (Clean White Surface, Border #E5E7EB, Smooth Shadows) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Total Omset</div>
          <div className="text-lg sm:text-xl font-black text-[#00A250]">
            {formatRupiah(metrics.totalOmset)}
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">{metrics.count} transaksi</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Total Transaksi</div>
          <div className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            {metrics.count} struk
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Rata-rata: {formatRupiah(metrics.avg)}</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Uang Tunai (Cash)</div>
          <div className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            {formatRupiah(metrics.cashRevenue)}
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Laci kasir</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">QRIS & Transfer</div>
          <div className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            {formatRupiah(metrics.nonCashRevenue)}
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Rekening bank / QRIS</div>
        </div>
      </div>

      {/* iOS Segmented Tabs */}
      <div className="ios-segmented-container">
        <button
          onClick={() => setDateFilter('today')}
          className={`ios-segmented-tab ${dateFilter === 'today' ? 'ios-segmented-tab-active' : ''}`}
        >
          Hari Ini
        </button>
        <button
          onClick={() => setDateFilter('7days')}
          className={`ios-segmented-tab ${dateFilter === '7days' ? 'ios-segmented-tab-active' : ''}`}
        >
          7 Hari
        </button>
        <button
          onClick={() => setDateFilter('30days')}
          className={`ios-segmented-tab ${dateFilter === '30days' ? 'ios-segmented-tab-active' : ''}`}
        >
          30 Hari
        </button>
        <button
          onClick={() => setDateFilter('all')}
          className={`ios-segmented-tab ${dateFilter === 'all' ? 'ios-segmented-tab-active' : ''}`}
        >
          Semua
        </button>
      </div>

      {/* iOS Search Box */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-[#8B8B8B]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari No. Order, nama kasir, atau meja..."
          className="w-full pl-11 pr-4 py-3 bg-[#E5E5EA] border-0 rounded-full text-sm text-[#1E1E1E] placeholder:text-[#8B8B8B] focus:outline-none focus:ring-2 focus:ring-[#00A250]"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden smooth-card-static">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F9] text-[#8B8B8B] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3.5 px-4">No. Order</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Kasir</th>
                <th className="py-3.5 px-4">Catatan</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4">Diskon</th>
                <th className="py-3.5 px-4 font-bold">Total</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8B8B8B]">
                    Tidak ada transaksi pada filter periode ini
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1E1E1E]">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B8B] whitespace-nowrap">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-[#1E1E1E]">
                      {order.cashier_name || 'Staff'}
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B8B]">
                      {order.table_number || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E5E5EA] text-[#1E1E1E]">
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B8B]">
                      {order.custom_discount > 0 ? (
                        <span className="text-[#EF4444] font-bold">
                          -{formatRupiah(order.custom_discount)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-[#00A250]">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="Lihat & Cetak Struk"
                        className="px-3 py-1.5 bg-[#E5E5EA] hover:bg-[#d8d8de] text-[#1E1E1E] rounded-full text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Struk</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        storeProfile={storeProfile}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

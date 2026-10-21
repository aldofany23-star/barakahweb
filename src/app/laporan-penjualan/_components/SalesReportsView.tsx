'use client'

import { useState, useMemo } from 'react'
import { Order, StoreProfile } from '@/types/database'
import { OrderDetailModal } from './OrderDetailModal'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import {
  Receipt,
  Search,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Download,
  Eye,
  TrendingUp,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Laporan Penjualan & Transaksi</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Riwayat seluruh struk transaksi kasir, filter periode, dan ekspor data penjualan
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredOrders.length === 0}
          className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Ekspor CSV / Excel</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Total Omset</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-extrabold text-emerald-600">
            {formatRupiah(metrics.totalOmset)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            Dari {metrics.count} transaksi
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Total Transaksi</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
            {metrics.count} struk
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            Rata-rata: {formatRupiah(metrics.avg)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Pendapatan Tunai</span>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
            {formatRupiah(metrics.cashRevenue)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Metode Cash di kasir</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Non-Tunai (QRIS/Bank)</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
            {formatRupiah(metrics.nonCashRevenue)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">QRIS & Transfer rekening</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. Order, nama kasir, atau meja..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Date Filter Tabs */}
        <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg transition ${
              dateFilter === 'today'
                ? 'bg-white dark:bg-zinc-800 shadow-sm font-semibold text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3 py-1.5 rounded-lg transition ${
              dateFilter === '7days'
                ? 'bg-white dark:bg-zinc-800 shadow-sm font-semibold text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setDateFilter('30days')}
            className={`px-3 py-1.5 rounded-lg transition ${
              dateFilter === '30days'
                ? 'bg-white dark:bg-zinc-800 shadow-sm font-semibold text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            30 Hari Terakhir
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              dateFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 shadow-sm font-semibold text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">No. Order</th>
                <th className="py-3 px-4">Waktu Transaksi</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Catatan/Meja</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Diskon</th>
                <th className="py-3 px-4 font-bold">Total</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    Tidak ada transaksi pada filter periode ini
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {order.order_number}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      {order.cashier_name || 'Staff'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {order.table_number || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {order.custom_discount > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          -{formatRupiah(order.custom_discount)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="Lihat & Cetak Struk"
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Reprint Modal */}
      <OrderDetailModal
        order={selectedOrder}
        storeProfile={storeProfile}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

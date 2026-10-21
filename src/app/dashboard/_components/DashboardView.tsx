'use client'

import { useMemo } from 'react'
import { Order, Product, Category } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Award,
  CreditCard,
  Banknote,
  Calendar,
  Layers,
} from 'lucide-react'

interface DashboardViewProps {
  orders: Order[]
  products: Product[]
  categories: Category[]
}

export function DashboardView({ orders, products, categories }: DashboardViewProps) {
  // Calculations
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
    const totalTransactions = orders.length
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    const cashRevenue = orders
      .filter((o) => o.payment_method?.toLowerCase() === 'cash')
      .reduce((s, o) => s + (o.total || 0), 0)
    const qrisRevenue = orders
      .filter((o) => o.payment_method?.toLowerCase() === 'qris')
      .reduce((s, o) => s + (o.total || 0), 0)
    const transferRevenue = orders
      .filter((o) => o.payment_method?.toLowerCase() === 'transfer')
      .reduce((s, o) => s + (o.total || 0), 0)

    // Daily breakdown for last 7 days
    const daysMap = new Map<string, { date: string; total: number; count: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      daysMap.set(key, { date: label, total: 0, count: 0 })
    }

    orders.forEach((o) => {
      const key = o.created_at.split('T')[0]
      if (daysMap.has(key)) {
        const item = daysMap.get(key)!
        item.total += o.total || 0
        item.count += 1
      }
    })

    const dailyChart = Array.from(daysMap.values())
    const maxDaily = Math.max(...dailyChart.map((d) => d.total), 1)

    // Low stock count
    const lowStockProducts = products.filter(
      (p) => !p.is_deleted && p.stock_qty <= p.low_stock_threshold
    )

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      cashRevenue,
      qrisRevenue,
      transferRevenue,
      dailyChart,
      maxDaily,
      lowStockProducts,
    }
  }, [orders, products])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <span>Dashboard & Analitik Bisnis</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Ringkasan performa penjualan, tren pendapatan, dan status inventaris toko
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>Total Pendapatan</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-600">
            {formatRupiah(stats.totalRevenue)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Akumulasi seluruh transaksi</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>Total Transaksi</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {stats.totalTransactions} struk
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Order kasir selesai</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>Rata-Rata Belanja (AOV)</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {formatRupiah(stats.averageOrderValue)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Nilai per keranjang belanja</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>Peringatan Stok Menipis</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-red-600">
            {stats.lowStockProducts.length} produk
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Perlu segera di-restock</div>
        </div>
      </div>

      {/* Main Grid: 7-day Sales Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Bar */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Tren Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-[11px] text-zinc-400">Total omset harian kasir</p>
            </div>
            <Calendar className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="h-52 flex items-end gap-3 pt-6 pb-2">
            {stats.dailyChart.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.total / stats.maxDaily) * 100))
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {formatRupiah(item.total)}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[40px] bg-emerald-500/80 group-hover:bg-emerald-600 rounded-t-xl transition-all shadow-sm"
                  />
                  <span className="text-[10px] font-semibold text-zinc-500">{item.date}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Metode Pembayaran
            </h2>
            <p className="text-[11px] text-zinc-400 mb-4">Distribusi transaksi pelanggan</p>
          </div>

          <div className="space-y-4 my-auto">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Banknote className="w-4 h-4 text-amber-500" />
                  <span>Tunai (Cash)</span>
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatRupiah(stats.cashRevenue)}
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  style={{
                    width: `${stats.totalRevenue > 0 ? (stats.cashRevenue / stats.totalRevenue) * 100 : 0}%`,
                  }}
                  className="bg-amber-500 h-full rounded-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>QRIS</span>
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatRupiah(stats.qrisRevenue)}
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  style={{
                    width: `${stats.totalRevenue > 0 ? (stats.qrisRevenue / stats.totalRevenue) * 100 : 0}%`,
                  }}
                  className="bg-purple-500 h-full rounded-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>Transfer Bank</span>
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatRupiah(stats.transferRevenue)}
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  style={{
                    width: `${stats.totalRevenue > 0 ? (stats.transferRevenue / stats.totalRevenue) * 100 : 0}%`,
                  }}
                  className="bg-blue-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 text-center">
            Data tersinkronisasi langsung dari database Supabase
          </div>
        </div>
      </div>

      {/* Low Stock Warning Table */}
      {stats.lowStockProducts.length > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/40 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Peringatan Stok Menipis ({stats.lowStockProducts.length} Produk)
              </h2>
              <p className="text-[11px] text-zinc-400">Segera lakukan pembelian stok baru ke distributor</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stats.lowStockProducts.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 flex justify-between items-center text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-zinc-400">{formatRupiah(p.sell_price)}</div>
                </div>
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 rounded font-bold text-[10px] shrink-0">
                  Sisa: {p.stock_qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Order, Product, Category } from '@/types/database'
import { formatRupiah } from '@/lib/utils'
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Banknote,
  Calendar,
} from 'lucide-react'

interface DashboardViewProps {
  orders: Order[]
  products: Product[]
  categories: Category[]
}

export function DashboardView({ orders, products }: DashboardViewProps) {
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
          Dashboard & Analitik
        </h1>
        <p className="text-xs text-[#8B8B8B] mt-0.5">
          Performa omset, tren transaksi kasir, dan ringkasan stok toko
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Total Omset</div>
          <div className="text-lg sm:text-xl font-black text-[#00A250]">
            {formatRupiah(stats.totalRevenue)}
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Akumulasi pendapatan</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Total Transaksi</div>
          <div className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            {stats.totalTransactions} struk
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Order selesai</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Rata-Rata Keranjang</div>
          <div className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            {formatRupiah(stats.averageOrderValue)}
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Nilai per pelanggan</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E5E7EB] smooth-card">
          <div className="text-xs font-medium text-[#8B8B8B] mb-1">Stok Menipis</div>
          <div className="text-lg sm:text-xl font-black text-[#EF4444]">
            {stats.lowStockProducts.length} produk
          </div>
          <div className="text-[10px] text-[#8B8B8B] mt-1">Perlu restock</div>
        </div>
      </div>

      {/* 7-Day Sales Trend & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Chart Bar */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-white rounded-3xl border border-[#E5E7EB] smooth-card-static flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-[#1E1E1E]">
                Tren Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-[11px] text-[#8B8B8B]">Total pendapatan harian kasir</p>
            </div>
            <Calendar className="w-4 h-4 text-[#8B8B8B]" />
          </div>

          <div className="h-48 sm:h-56 flex items-end gap-2 sm:gap-3 pt-6 pb-2">
            {stats.dailyChart.map((item, idx) => {
              const heightPercent = Math.max(10, Math.round((item.total / stats.maxDaily) * 100))
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-[#1E1E1E] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {formatRupiah(item.total)}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[42px] bg-[#00A250] group-hover:bg-[#008f46] rounded-t-xl transition-all"
                  />
                  <span className="text-[10px] font-bold text-[#8B8B8B]">{item.date}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-[#E5E7EB] smooth-card-static flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-sm text-[#1E1E1E] mb-1">
              Metode Pembayaran
            </h2>
            <p className="text-[11px] text-[#8B8B8B] mb-4">Distribusi transaksi kasir</p>
          </div>

          <div className="space-y-4 my-auto">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#1E1E1E] font-medium">
                  <Banknote className="w-4 h-4 text-amber-500" />
                  <span>Tunai (Cash)</span>
                </span>
                <span className="font-bold text-[#1E1E1E]">
                  {formatRupiah(stats.cashRevenue)}
                </span>
              </div>
              <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
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
                <span className="flex items-center gap-1.5 text-[#1E1E1E] font-medium">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>QRIS</span>
                </span>
                <span className="font-bold text-[#1E1E1E]">
                  {formatRupiah(stats.qrisRevenue)}
                </span>
              </div>
              <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
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
                <span className="flex items-center gap-1.5 text-[#1E1E1E] font-medium">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>Transfer Bank</span>
                </span>
                <span className="font-bold text-[#1E1E1E]">
                  {formatRupiah(stats.transferRevenue)}
                </span>
              </div>
              <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
                <div
                  style={{
                    width: `${stats.totalRevenue > 0 ? (stats.transferRevenue / stats.totalRevenue) * 100 : 0}%`,
                  }}
                  className="bg-blue-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] text-[10px] text-[#8B8B8B] text-center">
            Sinkronisasi otomatis dengan aplikasi Android
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Shift } from '@/types/database'
import { startShiftAction, endShiftAction, getShiftSummary } from '@/lib/actions/shiftActions'
import { formatRupiah } from '@/lib/utils'
import { Clock, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'

interface ShiftModalProps {
  currentShift: Shift | null
  isOpen: boolean
  onClose: () => void
}

export function ShiftModal({ currentShift, isOpen, onClose }: ShiftModalProps) {
  const [isPending, startTransition] = useTransition()
  const [actualRevenue, setActualRevenue] = useState<string>('')
  const [summary, setSummary] = useState<{
    totalRevenue: number
    cashRevenue: number
    qrisRevenue: number
    transferRevenue: number
    totalOrders: number
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleOpenEndShift = async () => {
    if (!currentShift) return
    setLoadingSummary(true)
    setError(null)
    try {
      const res = await getShiftSummary(currentShift.id)
      setSummary(res)
      setActualRevenue(res.totalRevenue.toString())
    } catch {
      setError('Gagal memuat ringkasan shift')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleStartShift = () => {
    setError(null)
    startTransition(async () => {
      const res = await startShiftAction()
      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal memulai shift')
      }
    })
  }

  const handleEndShift = () => {
    if (!currentShift) return
    const num = parseFloat(actualRevenue) || 0
    setError(null)
    startTransition(async () => {
      const res = await endShiftAction(currentShift.id, num)
      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menutup shift')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${currentShift ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {currentShift ? 'Tutup Shift Kasir' : 'Mulai Shift Kasir'}
              </h3>
              <p className="text-xs text-zinc-500">
                {currentShift ? 'Akhiri sesi kerja dan laporkan kas' : 'Buka sesi kasir untuk memulai transaksi'}
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!currentShift ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Anda belum memiliki shift aktif. Klik tombol di bawah untuk membuka sesi shift Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {!summary && (
                <div className="text-center py-2">
                  <button
                    onClick={handleOpenEndShift}
                    disabled={loadingSummary}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    {loadingSummary ? 'Memuat Data Penjualan...' : 'Hitung Ringkasan Pendapatan Shift'}
                  </button>
                </div>
              )}

              {summary && (
                <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Total Transaksi Selesai:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{summary.totalOrders} order</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Pendapatan Tunai (Cash):</span>
                    <span className="font-semibold text-emerald-600">{formatRupiah(summary.cashRevenue)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Pendapatan Non-Tunai (QRIS/Transfer):</span>
                    <span className="font-semibold text-blue-600">{formatRupiah(summary.qrisRevenue + summary.transferRevenue)}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                    <span className="text-zinc-800 dark:text-zinc-100">Total Omset Shift:</span>
                    <span className="text-zinc-900 dark:text-zinc-50">{formatRupiah(summary.totalRevenue)}</span>
                  </div>
                </div>
              )}

              {summary && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Uang Kas Aktual di Laci / Rekap Akhir (Rp)
                  </label>
                  <input
                    type="number"
                    value={actualRevenue}
                    onChange={(e) => setActualRevenue(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Masukkan nominal uang kas..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition"
          >
            Batal
          </button>
          {!currentShift ? (
            <button
              onClick={handleStartShift}
              disabled={isPending}
              className="px-5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Mulai Shift Sekarang</span>
            </button>
          ) : (
            <button
              onClick={handleEndShift}
              disabled={isPending || !summary}
              className="px-5 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Konfirmasi Tutup Shift</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

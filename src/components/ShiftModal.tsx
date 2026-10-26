'use client'

import { useState, useTransition, useEffect } from 'react'
import { Shift } from '@/types/database'
import { startShiftAction, endShiftAction, getShiftSummary } from '@/lib/actions/shiftActions'
import { formatRupiah } from '@/lib/utils'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Banknote,
  QrCode,
  CreditCard,
  Timer,
  ShoppingBag,
} from 'lucide-react'

interface ShiftModalProps {
  currentShift: Shift | null
  isOpen: boolean
  onClose: () => void
}

function formatShiftDateTime(dateStr?: string | null) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return (
      date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
      ', ' +
      date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) +
      ' WIB'
    )
  } catch {
    return dateStr
  }
}

function getShiftDuration(startDateStr?: string | null) {
  if (!startDateStr) return '-'
  try {
    const start = new Date(startDateStr).getTime()
    const now = Date.now()
    const diffMs = Math.max(0, now - start)
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60

    if (hours === 0) {
      return `${Math.max(1, mins)} menit`
    }
    return `${hours} jam ${mins} menit`
  } catch {
    return '-'
  }
}

export function ShiftModal({ currentShift, isOpen, onClose }: ShiftModalProps) {
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = useState<{
    totalRevenue: number
    cashRevenue: number
    qrisRevenue: number
    transferRevenue: number
    totalOrders: number
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Otomatis muat ringkasan pendapatan shift saat modal dibuka
  useEffect(() => {
    if (isOpen && currentShift) {
      setLoadingSummary(true)
      setError(null)
      getShiftSummary(currentShift.id)
        .then((res) => {
          setSummary(res)
        })
        .catch(() => {
          setError('Gagal memuat ringkasan shift')
        })
        .finally(() => {
          setLoadingSummary(false)
        })
    } else {
      setSummary(null)
      setError(null)
    }
  }, [isOpen, currentShift])

  if (!isOpen) return null

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
    setError(null)
    startTransition(async () => {
      const actualRevenue = summary?.totalRevenue || 0
      const res = await endShiftAction(currentShift.id, actualRevenue)
      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menutup shift')
      }
    })
  }

  const shiftStartTime = currentShift?.start_time || currentShift?.created_at

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#e2e2e2] overflow-hidden">
        {/* Header (Cloudflare Modal Header) */}
        <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                currentShift
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-[#eef8f2] text-[#00A250] border-[#b8e8cc]'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#262626]">
                {currentShift ? 'Tutup Shift Kasir' : 'Mulai Shift Kasir'}
              </h3>
              <p className="text-[11px] text-[#757575]">
                {currentShift
                  ? 'Akhiri sesi kerja dan rekap pendapatan transaksi'
                  : 'Buka sesi kasir untuk memulai transaksi'}
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!currentShift ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 mx-auto bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc] rounded-full flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#262626]">Belum Ada Shift Aktif</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                  Buka sesi shift kasir baru untuk mulai memproses transaksi dan cetak struk penjualan.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Info Waktu & Durasi Shift */}
              <div className="bg-[#fafafa] border border-[#e2e2e2] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-[#00A250]" />
                    <span className="text-[11px] font-medium">Shift Dimulai Sejak:</span>
                  </div>
                  <span className="font-semibold text-xs text-[#262626]">
                    {formatShiftDateTime(shiftStartTime)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#e2e2e2]/70">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Timer className="w-3.5 h-3.5 text-[#00A250]" />
                    <span className="text-[11px] font-medium">Sudah Berjalan Selama:</span>
                  </div>
                  <span className="font-semibold text-xs text-[#262626]">
                    {getShiftDuration(shiftStartTime)}
                  </span>
                </div>
              </div>

              {/* Status Loading Summary */}
              {loadingSummary && (
                <div className="py-6 text-center space-y-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#00A250]" />
                  <p className="text-xs font-medium">Menghitung rincian omset shift...</p>
                </div>
              )}

              {/* Rincian Ringkasan & Metode Pembayaran */}
              {summary && !loadingSummary && (
                <div className="space-y-3">
                  {/* Metode Pembayaran (Cash, QRIS, Transfer) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
                      Metode Pembayaran
                    </div>

                    <div className="bg-white border border-[#e2e2e2] rounded-xl divide-y divide-[#e2e2e2] shadow-2xs overflow-hidden">
                      {/* Tunai (Cash) */}
                      <div className="flex items-center justify-between p-3 hover:bg-[#fafafa] transition">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-emerald-50 text-[#00A250] border border-emerald-200 rounded-lg">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-[#262626]">Tunai (Cash)</div>
                            <div className="text-[10px] text-gray-400">Penerimaan uang fisik kasir</div>
                          </div>
                        </div>
                        <div className="font-bold text-xs text-[#262626]">
                          {formatRupiah(summary.cashRevenue)}
                        </div>
                      </div>

                      {/* QRIS */}
                      <div className="flex items-center justify-between p-3 hover:bg-[#fafafa] transition">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-[#262626]">QRIS</div>
                            <div className="text-[10px] text-gray-400">Pembayaran digital via barcode</div>
                          </div>
                        </div>
                        <div className="font-bold text-xs text-[#262626]">
                          {formatRupiah(summary.qrisRevenue)}
                        </div>
                      </div>

                      {/* Transfer */}
                      <div className="flex items-center justify-between p-3 hover:bg-[#fafafa] transition">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-[#262626]">Transfer Bank</div>
                            <div className="text-[10px] text-gray-400">Transfer rekening toko</div>
                          </div>
                        </div>
                        <div className="font-bold text-xs text-[#262626]">
                          {formatRupiah(summary.transferRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Total Omset Shift (Ditaruh Dibawah Sendiri) */}
                  <div className="bg-[#eef8f2] border border-[#b8e8cc] rounded-xl p-3.5 text-center shadow-2xs space-y-1">
                    <div className="text-[11px] font-semibold text-gray-600">
                      Total Omset Shift
                    </div>
                    <div className="text-2xl font-bold text-[#00A250] tracking-tight">
                      {formatRupiah(summary.totalRevenue)}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#00A250]" />
                      <span>{summary.totalOrders} Transaksi Selesai</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (Cloudflare Modal Footer) */}
        <div className="px-5 py-3.5 bg-[#fbfbfb] border-t border-[#e2e2e2] flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          {!currentShift ? (
            <button
              onClick={handleStartShift}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold bg-[#00A250] hover:bg-[#008f46] disabled:opacity-60 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Mulai Shift Sekarang</span>
            </button>
          ) : (
            <button
              onClick={handleEndShift}
              disabled={isPending || loadingSummary || !summary}
              className="px-4 py-2 text-xs font-semibold bg-[#00A250] hover:bg-[#008f46] disabled:opacity-60 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
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

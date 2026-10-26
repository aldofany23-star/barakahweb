'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react'
import { WorkReport } from '@/types/database'
import { NewReportModal } from './NewReportModal'
import { togglePinAction, deleteWorkReportAction } from '../_actions/workReportActions'
import {
  Plus,
  Pin,
  Clock,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  AlertCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react'

interface WorkReportFeedProps {
  initialReports: WorkReport[]
  currentUserId: string
  currentUserName: string
  isAdmin: boolean
}

function formatFullReportDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function WorkReportFeed({
  initialReports,
  currentUserId,
  currentUserName: _currentUserName,
  isAdmin,
}: WorkReportFeedProps) {
  const [reports, setReports] = useState<WorkReport[]>(initialReports)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'month'>('all')

  // Lightbox Modal State
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)

  // Delete Confirmation Modal State
  const [reportToDelete, setReportToDelete] = useState<WorkReport | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pin & Global Action States
  const [isPending, startTransition] = useTransition()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Sinkronisasi data awal jika initialReports berubah dari server
  useEffect(() => {
    setReports(initialReports)
  }, [initialReports])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    const t = setTimeout(() => setToastMessage(null), 3500)
    return () => clearTimeout(t)
  }, [])

  // Toggle Pin (Sesuai Android: Maksimal 2 laporan yang disematkan)
  const handleTogglePin = (report: WorkReport) => {
    if (!report.is_pinned) {
      const currentPinnedCount = reports.filter((r) => r.is_pinned).length
      if (currentPinnedCount >= 2) {
        showToast('Maksimal pin hanya 2 laporan')
        return
      }
    }

    // Optimistic UI update
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, is_pinned: !report.is_pinned } : r))
    )

    startTransition(async () => {
      const res = await togglePinAction(report.id, report.is_pinned)
      if (!res.success) {
        showToast(res.error || 'Gagal mengubah status pin')
        // Rollback
        setReports(initialReports)
      }
    })
  }

  // Delete Report
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return
    setIsDeleting(true)

    const res = await deleteWorkReportAction(reportToDelete.id)
    setIsDeleting(false)

    if (res.success) {
      setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id))
      setReportToDelete(null)
      showToast('Laporan berhasil dihapus')
    } else {
      showToast(res.error || 'Gagal menghapus laporan')
    }
  }

  // Filter & Sort Reports (is_pinned DESC, created_at DESC)
  const filteredReports = useMemo(() => {
    let list = [...reports]

    // Tab Filter
    if (activeTab === 'pinned') {
      list = list.filter((r) => r.is_pinned)
    } else if (activeTab === 'month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      list = list.filter((r) => new Date(r.created_at).getTime() >= startOfMonth)
    }

    // Search Filter
    const q = search.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (r) =>
          r.user_name?.toLowerCase().includes(q) ||
          r.caption?.toLowerCase().includes(q)
      )
    }

    // Sort: Pinned on top, then newest
    return list.sort((a, b) => {
      if (a.is_pinned === b.is_pinned) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return a.is_pinned ? -1 : 1
    })
  }, [reports, activeTab, search])

  // Open Lightbox
  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImages.length === 0) return
      if (e.key === 'Escape') setLightboxImages([])
      if (e.key === 'ArrowRight') {
        setLightboxIndex((idx) => (idx + 1) % lightboxImages.length)
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((idx) => (idx - 1 + lightboxImages.length) % lightboxImages.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImages])

  return (
    <div className="w-full max-w-[1400px] mx-auto p-0 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#262626] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 sm:px-0 sm:py-0 border-b border-[#e2e2e2] sm:border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Laporan Kerja & Serah Terima
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#00A250] bg-[#eef8f2] border border-[#b8e8cc]">
              Log Shift
            </span>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Catatan log aktivitas harian, pesan kasir, dan info serah terima tugas
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#00A250] hover:bg-[#008f46] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* Cloudflare Underline Filter Tabs */}
      <div className="border-b border-[#e2e2e2] flex items-center gap-1 overflow-x-auto no-scrollbar px-2 sm:px-0 bg-white">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Semua Laporan ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('month')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'month'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Bulan Ini
        </button>
        <button
          onClick={() => setActiveTab('pinned')}
          className={`py-2.5 px-4 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pinned'
              ? 'border-[#00A250] text-[#00A250]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Pin className="w-3.5 h-3.5 fill-current" />
          <span>Disematkan ({reports.filter((r) => r.is_pinned).length}/2)</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 sm:px-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari catatan laporan atau nama staf..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs sm:text-sm text-[#262626] placeholder:text-gray-400 focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] shadow-2xs transition"
          />
        </div>
      </div>

      {/* Reports Feed List */}
      <div className="px-3 sm:px-0 space-y-4">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[#e2e2e2] text-gray-500 shadow-2xs">
            <MessageSquare className="w-12 h-12 stroke-1 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-[#262626]">
              {search ? 'Tidak ada laporan yang cocok dengan pencarian' : 'Belum ada laporan kerja'}
            </p>
            <p className="text-xs text-[#757575] mt-1">
              {search
                ? 'Coba gunakan kata kunci pencarian yang lain'
                : 'Klik "Buat Laporan Baru" untuk mencatat serah terima tugas'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isAuthor = report.user_id === currentUserId
            const canDelete = isAuthor || isAdmin
            const images = report.image_urls || []

            return (
              <ReportCardItem
                key={report.id}
                report={report}
                canDelete={canDelete}
                isPending={isPending}
                onTogglePin={() => handleTogglePin(report)}
                onDelete={() => setReportToDelete(report)}
                onImageClick={(idx) => openLightbox(images, idx)}
              />
            )
          })
        )}
      </div>

      {/* Lightbox Fullscreen Modal (Mirrors Android Dialog with Fullscreen Image) */}
      {lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-6 select-none"
          onClick={() => setLightboxImages([])}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxImages([])}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(
                  (idx) => (idx - 1 + lightboxImages.length) % lightboxImages.length
                )
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition cursor-pointer"
              title="Foto Sebelumnya (Arrow Left)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Active Image */}
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            {lightboxImages.length > 1 && (
              <div className="mt-3 px-3 py-1 bg-black/60 text-white text-xs rounded-full font-medium">
                {lightboxIndex + 1} dari {lightboxImages.length} Foto
              </div>
            )}
          </div>

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((idx) => (idx + 1) % lightboxImages.length)
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition cursor-pointer"
              title="Foto Berikutnya (Arrow Right)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal (Mirrors Android BarakahPopupDialog) */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e2e2e2] shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#262626]">
                  Hapus Laporan Kerja?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <p className="text-xs text-[#262626] leading-relaxed bg-[#fafafa] p-3 rounded-xl border border-gray-200">
              Apakah Anda yakin ingin menghapus laporan ini? Foto dan catatan serah terima yang dihapus akan terhapus permanen dari sistem.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#e2e2e2] rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Hapus Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Report Modal */}
      <NewReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => showToast('Laporan kerja berhasil diposting')}
      />
    </div>
  )
}

/**
 * Single Report Card Component
 * Fully styled in Cloudflare Card style with photo carousel & Android feature parity
 */
function ReportCardItem({
  report,
  canDelete,
  isPending,
  onTogglePin,
  onDelete,
  onImageClick,
}: {
  report: WorkReport
  canDelete: boolean
  isPending: boolean
  onTogglePin: () => void
  onDelete: () => void
  onImageClick: (idx: number) => void
}) {
  const images = report.image_urls || []
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0)

  return (
    <div
      className={`p-4 sm:p-5 bg-white rounded-xl border transition shadow-2xs ${
        report.is_pinned
          ? 'border-[#00A250] ring-1 ring-[#00A250]/40'
          : 'border-[#e2e2e2] hover:border-gray-300'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc] flex items-center justify-center font-bold text-sm shrink-0">
            {report.user_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-bold text-sm text-[#262626] flex items-center gap-2">
              <span>{report.user_name}</span>
              {report.is_pinned && (
                <span className="px-2 py-0.5 bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc] text-[10px] font-bold rounded-md flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-[#00A250]" />
                  <span>Disematkan</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#757575] flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatFullReportDate(report.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Pin & Delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePin}
            disabled={isPending}
            title={report.is_pinned ? 'Lepas Sematan' : 'Sematkan di Atas (Maks. 2)'}
            className={`p-2 rounded-lg transition cursor-pointer ${
              report.is_pinned
                ? 'text-[#00A250] bg-[#eef8f2] hover:bg-[#ddf2e5]'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Pin className={`w-4 h-4 ${report.is_pinned ? 'fill-current' : ''}`} />
          </button>

          {canDelete && (
            <button
              onClick={onDelete}
              disabled={isPending}
              title="Hapus Laporan Ini"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Caption Text */}
      {report.caption && (
        <p className="text-xs sm:text-sm text-[#262626] whitespace-pre-wrap leading-relaxed">
          {report.caption}
        </p>
      )}

      {/* Photos Carousel / Grid (Mirrors Android HorizontalPager with Indicator Dots) */}
      {images.length > 0 && (
        <div className="mt-3.5 space-y-2">
          {images.length === 1 ? (
            // Single Photo View
            <div
              onClick={() => onImageClick(0)}
              className="relative max-w-xl max-h-[360px] overflow-hidden rounded-xl border border-[#e2e2e2] cursor-pointer group bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[0]}
                alt="Dokumentasi Laporan"
                className="w-full h-full object-cover group-hover:scale-[1.01] transition duration-200"
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/75 text-white text-[10px] rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <ImageIcon className="w-3 h-3" />
                <span>Klik untuk perbesar</span>
              </div>
            </div>
          ) : (
            // Multi-Photo Carousel
            <div className="relative max-w-xl rounded-xl overflow-hidden border border-[#e2e2e2] bg-gray-900 group">
              <div
                onClick={() => onImageClick(currentPhotoIdx)}
                className="aspect-video w-full overflow-hidden cursor-pointer flex items-center justify-center bg-gray-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentPhotoIdx]}
                  alt={`Dokumentasi ${currentPhotoIdx + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Prev Arrow */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentPhotoIdx((idx) => (idx - 1 + images.length) % images.length)
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer"
                title="Foto sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next Arrow */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentPhotoIdx((idx) => (idx + 1) % images.length)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer"
                title="Foto berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Counter Pill */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-md font-semibold">
                {currentPhotoIdx + 1} / {images.length}
              </div>

              {/* Indicator Dots (Mirrors Android pager dots) */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/60 rounded-full flex items-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentPhotoIdx(i)
                    }}
                    className={`transition-all rounded-full ${
                      currentPhotoIdx === i
                        ? 'w-2 h-2 bg-[#00A250]'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Thumbnail Strip (For quick selection when multiple photos) */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              {images.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentPhotoIdx(i)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                    currentPhotoIdx === i
                      ? 'border-[#00A250] ring-1 ring-[#00A250]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

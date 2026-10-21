'use client'

import { useState, useTransition } from 'react'
import { WorkReport } from '@/types/database'
import { NewReportModal } from './NewReportModal'
import { togglePinAction } from '../_actions/workReportActions'
import { formatDateTime } from '@/lib/utils'
import {
  ClipboardList,
  Plus,
  Pin,
  Clock,
  User,
  MessageSquare,
} from 'lucide-react'

interface WorkReportFeedProps {
  initialReports: WorkReport[]
}

export function WorkReportFeed({ initialReports }: WorkReportFeedProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleTogglePin = (id: string, currentPin: boolean) => {
    startTransition(async () => {
      await togglePinAction(id, currentPin)
    })
  }

  // Pinned reports on top
  const sortedReports = [...initialReports].sort((a, b) => {
    if (a.is_pinned === b.is_pinned) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return a.is_pinned ? -1 : 1
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
            <span>Laporan Kerja & Serah Terima Shift</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Catatan log aktivitas harian, pesan kasir, dan info penting antar petugas
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* Reports Feed */}
      <div className="space-y-4">
        {sortedReports.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400">
            <MessageSquare className="w-12 h-12 stroke-1 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs font-medium text-zinc-500">Belum ada laporan kerja yang dibuat</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Klik &quot;Buat Laporan Baru&quot; untuk mencatat serah terima tugas
            </p>
          </div>
        ) : (
          sortedReports.map((report) => (
            <div
              key={report.id}
              className={`p-5 bg-white dark:bg-zinc-900 rounded-2xl border transition shadow-sm ${
                report.is_pinned
                  ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {report.user_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{report.user_name}</span>
                      {report.is_pinned && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(report.created_at)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePin(report.id, report.is_pinned)}
                  disabled={isPending}
                  title={report.is_pinned ? 'Lepas Pin' : 'Sematkan di Atas'}
                  className={`p-1.5 rounded-lg transition ${
                    report.is_pinned
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${report.is_pinned ? 'fill-amber-500' : ''}`} />
                </button>
              </div>

              {/* Caption */}
              <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {report.caption}
              </p>

              {/* Images if any */}
              {report.image_urls && report.image_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.image_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt="Lampiran laporan"
                      className="w-24 h-24 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <NewReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { WorkReport } from '@/types/database'
import { NewReportModal } from './NewReportModal'
import { togglePinAction } from '../_actions/workReportActions'
import { formatDateTime } from '@/lib/utils'
import {
  Plus,
  Pin,
  Clock,
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
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
            Laporan Kerja & Serah Terima
          </h1>
          <p className="text-xs text-[#8B8B8B] mt-0.5">
            Catatan log aktivitas harian, pesan kasir, dan info pergantian shift
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#00A250] hover:bg-[#008f46] text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* Reports Feed */}
      <div className="space-y-3.5">
        {sortedReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E7EB] text-[#8B8B8B]">
            <MessageSquare className="w-12 h-12 stroke-1 mx-auto mb-2 text-[#8B8B8B]" />
            <p className="text-sm font-semibold text-[#1E1E1E]">Belum ada laporan kerja</p>
            <p className="text-xs text-[#8B8B8B] mt-1">
              Klik &quot;Buat Laporan Baru&quot; untuk mencatat serah terima tugas
            </p>
          </div>
        ) : (
          sortedReports.map((report) => (
            <div
              key={report.id}
              className={`p-5 bg-white rounded-3xl border transition shadow-xs ${
                report.is_pinned
                  ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                  : 'border-[#E5E7EB]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D6F0E0] text-[#00A250] flex items-center justify-center font-bold text-sm">
                    {report.user_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#1E1E1E] flex items-center gap-2">
                      <span>{report.user_name}</span>
                      {report.is_pinned && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8B8B8B] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(report.created_at)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePin(report.id, report.is_pinned)}
                  disabled={isPending}
                  title={report.is_pinned ? 'Lepas Pin' : 'Sematkan di Atas'}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    report.is_pinned
                      ? 'text-amber-500 hover:bg-amber-100'
                      : 'text-[#8B8B8B] hover:text-[#1E1E1E] hover:bg-[#F9F9F9]'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${report.is_pinned ? 'fill-amber-500' : ''}`} />
                </button>
              </div>

              {/* Caption */}
              <p className="text-xs text-[#1E1E1E] whitespace-pre-wrap leading-relaxed">
                {report.caption}
              </p>

              {/* Images */}
              {report.image_urls && report.image_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.image_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt="Lampiran laporan"
                      className="w-24 h-24 object-cover rounded-2xl border border-[#E5E7EB]"
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

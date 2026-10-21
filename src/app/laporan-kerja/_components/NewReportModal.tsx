'use client'

import { useState, useTransition } from 'react'
import { createWorkReportAction } from '../_actions/workReportActions'
import { X, Loader2, Send, ClipboardList } from 'lucide-react'

interface NewReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewReportModal({ isOpen, onClose }: NewReportModalProps) {
  const [caption, setCaption] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption.trim()) return

    setError(null)
    startTransition(async () => {
      const res = await createWorkReportAction(caption)
      if (res.success) {
        setCaption('')
        onClose()
      } else {
        setError(res.error || 'Gagal mengirim laporan')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Buat Laporan Kerja Baru
              </h3>
              <p className="text-[11px] text-zinc-500">Catatan serah terima shift, stok, atau pekerjaan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Catatan Laporan *
            </label>
            <textarea
              rows={5}
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tuliskan aktivitas shift, kondisi hewan/grooming, stok barang yang hampir habis, atau pesan untuk kasir shift selanjutnya..."
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || !caption.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Kirim Laporan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

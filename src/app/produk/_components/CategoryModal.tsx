'use client'

import { useState, useTransition } from 'react'
import { Category } from '@/types/database'
import { createCategoryAction } from '../_actions/productActions'
import { X, Loader2, FolderPlus, Layers } from 'lucide-react'

interface CategoryModalProps {
  categories: Category[]
  isOpen: boolean
  onClose: () => void
}

export function CategoryModal({ categories, isOpen, onClose }: CategoryModalProps) {
  const [isPending, startTransition] = useTransition()
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) return

    setError(null)
    startTransition(async () => {
      const res = await createCategoryAction(categoryName.trim())
      if (res.success) {
        setCategoryName('')
        onClose()
      } else {
        setError(res.error || 'Gagal menambahkan kategori')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Kelola Kategori Produk
              </h3>
              <p className="text-[11px] text-zinc-500">Daftar kategori barang POS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nama Kategori Baru..."
              className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending || !categoryName.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tambah</span>
            </button>
          </form>

          <div>
            <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Kategori yang Sudah Ada:
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

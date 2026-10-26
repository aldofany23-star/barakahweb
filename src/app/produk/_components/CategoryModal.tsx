'use client'

import { useState, useTransition } from 'react'
import { Category } from '@/types/database'
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '../_actions/productActions'
import { BarakahPopupModal } from '@/components/ui/BarakahPopupModal'
import { X, Loader2, FolderPlus, Pencil, Trash2, Check } from 'lucide-react'

interface CategoryModalProps {
  categories: Category[]
  isOpen: boolean
  onClose: () => void
}

export function CategoryModal({ categories, isOpen, onClose }: CategoryModalProps) {
  const [isPending, startTransition] = useTransition()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setError(null)
    startTransition(async () => {
      const res = await createCategoryAction(newCategoryName.trim())
      if (res.success) {
        setNewCategoryName('')
      } else {
        setError(res.error || 'Gagal menambahkan kategori')
      }
    })
  }

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditingName(cat.name)
    setError(null)
  }

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return

    setError(null)
    startTransition(async () => {
      const res = await updateCategoryAction(id, editingName.trim())
      if (res.success) {
        setEditingId(null)
        setEditingName('')
      } else {
        setError(res.error || 'Gagal mengubah nama kategori')
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return
    const id = categoryToDelete.id
    setCategoryToDelete(null)

    startTransition(async () => {
      const res = await deleteCategoryAction(id)
      if (!res.success) {
        setError(res.error || 'Gagal menghapus kategori')
      }
    })
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 animate-in fade-in duration-150"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#eef8f2] text-[#00A250] rounded-xl border border-[#b8e8cc]">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#262626]">
                  Kelola Kategori Produk
                </h3>
                <p className="text-[11px] text-[#757575]">Tambah, edit, dan hapus kategori produk</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            )}

            {/* Form Tambah Kategori */}
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama Kategori Baru..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
              />
              <button
                type="submit"
                disabled={isPending || !newCategoryName.trim()}
                className="px-4 py-2.5 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-50 text-white font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Tambah</span>
              </button>
            </form>

            {/* List Kategori dengan Edit & Delete (Mirrors ProductManageScreen.kt:183-250) */}
            <div>
              <div className="font-semibold text-[#262626] mb-2 flex items-center justify-between">
                <span>Daftar Kategori:</span>
                <span className="text-[11px] text-gray-400">{categories.length} kategori</span>
              </div>

              {categories.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-[#e2e2e2]">
                  Belum ada kategori ditambahkan
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-[#f8f8f8] hover:bg-white rounded-xl border border-[#e2e2e2] flex items-center justify-between gap-2 transition shadow-2xs"
                    >
                      {editingId === c.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(c.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#00A250] rounded-lg text-xs font-bold text-[#262626] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(c.id)}
                            className="p-1.5 bg-[#00A250] text-white rounded-lg hover:bg-[#008f46] transition cursor-pointer"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg transition cursor-pointer"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#eef8f2] text-[#00A250] font-bold text-xs flex items-center justify-center border border-[#b8e8cc] shrink-0">
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-[#262626] truncate">
                              {c.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                              title="Edit Kategori"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(c)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3.5 bg-[#fbfbfb] border-t border-[#e2e2e2] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e2e2e2] rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Mirrors BarakahPopupDialog "Hapus Kategori?") */}
      <BarakahPopupModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Hapus Kategori?"
        message={`Apakah Anda yakin ingin menghapus kategori '${categoryToDelete?.name}'? Semua produk di dalamnya mungkin akan kehilangan referensi kategori.`}
        confirmButtonText="Hapus"
        dismissButtonText="Batal"
        icon="warning"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

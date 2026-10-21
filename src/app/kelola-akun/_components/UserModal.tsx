'use client'

import { useState, useTransition } from 'react'
import { Profile } from '@/types/database'
import { createStaffAction, updateStaffAction } from '../_actions/userActions'
import { X, Loader2, Users, Shield, Key } from 'lucide-react'

interface UserModalProps {
  user: Profile | null
  isOpen: boolean
  onClose: () => void
}

const AVAILABLE_MENUS = [
  'Kasir',
  'Produk & Stok',
  'Setup Diskon',
  'Laporan Penjualan',
  'Laporan Kerja',
  'Dashboard',
  'Pengaturan',
]

export function UserModal({ user, isOpen, onClose }: UserModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!user

  const [selectedMenus, setSelectedMenus] = useState<string[]>(
    user?.menu_access || ['Kasir', 'Laporan Penjualan', 'Laporan Kerja', 'Dashboard']
  )

  if (!isOpen) return null

  const handleToggleMenu = (menu: string) => {
    setSelectedMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const name = formData.get('name')?.toString() || ''
    const email = formData.get('email')?.toString() || ''
    const password = formData.get('password')?.toString() || ''
    const role = formData.get('role')?.toString() || 'staff'

    if (!name || !email || (!isEditing && !password)) {
      setError('Lengkapi semua field yang wajib diisi')
      return
    }

    startTransition(async () => {
      let res
      if (isEditing) {
        res = await updateStaffAction(user.id, {
          name,
          email,
          password: password || undefined,
          role,
          menuAccess: selectedMenus,
        })
      } else {
        res = await createStaffAction({
          name,
          email,
          password,
          role,
          menuAccess: selectedMenus,
        })
      }

      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Gagal menyimpan data pengguna')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Ubah Akun Pengguna' : 'Tambah Akun Kasir / Staf'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                Atur username, password, dan izin hak akses menu
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nama Lengkap *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={user?.name || ''}
              placeholder="Contoh: Siti Rahmawati"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Username / Email Login *
              </label>
              <input
                type="text"
                name="email"
                required
                defaultValue={user?.email || ''}
                placeholder="Contoh: sitir@pos.com atau siti"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Role Pengguna
              </label>
              <select
                name="role"
                defaultValue={user?.role || 'staff'}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
              >
                <option value="staff">Staff / Kasir</option>
                <option value="owner">Owner / Pemilik</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Password {isEditing ? '(Kosongkan jika tidak ingin mengubah)' : '*'}
            </label>
            <input
              type="password"
              name="password"
              required={!isEditing}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Hak Akses Menu (Centang yang diizinkan)
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              {AVAILABLE_MENUS.map((menu) => {
                const isChecked = selectedMenus.includes(menu)
                return (
                  <label
                    key={menu}
                    className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMenu(menu)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{menu}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

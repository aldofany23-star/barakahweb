'use client'

import { useState, useTransition, useEffect } from 'react'
import { Profile } from '@/types/database'
import { createStaffAction, updateStaffAction } from '../_actions/userActions'
import { X, Loader2, Users, Eye, EyeOff, ShieldCheck, CheckSquare, Square } from 'lucide-react'

interface UserModalProps {
  user: Profile | null
  isOpen: boolean
  onClose: () => void
  isOwnerLoggedIn?: boolean
}

const ALL_MENUS = [
  'Kasir',
  'Produk & Stok',
  'Setup Diskon',
  'Laporan Penjualan',
  'Laporan Kerja',
  'Dashboard',
  'Pengaturan',
]

const DEFAULT_STAFF_MENUS = ['Kasir', 'Laporan Penjualan', 'Laporan Kerja', 'Dashboard']

export function UserModal({ user, isOpen, onClose, isOwnerLoggedIn: _isOwnerLoggedIn = true }: UserModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!user

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'staff' | 'owner'>('staff')
  const [selectedMenus, setSelectedMenus] = useState<string[]>(DEFAULT_STAFF_MENUS)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPassword(user.raw_password || '')
      setRole(user.role?.toLowerCase() === 'owner' ? 'owner' : 'staff')
      setSelectedMenus(user.menu_access || DEFAULT_STAFF_MENUS)
    } else {
      setName('')
      setEmail('')
      setPassword('')
      setRole('staff')
      setSelectedMenus(DEFAULT_STAFF_MENUS)
    }
    setShowPassword(false)
    setError(null)
  }, [user, isOpen])

  if (!isOpen) return null

  const handleToggleMenu = (menu: string) => {
    setSelectedMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    )
  }

  const handleSelectAllMenus = () => {
    if (selectedMenus.length === ALL_MENUS.length) {
      setSelectedMenus(['Kasir'])
    } else {
      setSelectedMenus([...ALL_MENUS])
    }
  }

  const handleRoleChange = (newRole: 'staff' | 'owner') => {
    setRole(newRole)
    if (newRole === 'owner') {
      setSelectedMenus([...ALL_MENUS])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nama lengkap tidak boleh kosong')
      return
    }

    if (!email.trim()) {
      setError('Username / Email login tidak boleh kosong')
      return
    }

    if (!isEditing && (!password || password.length < 3)) {
      setError('Password minimal 3 karakter')
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
        setError(res.error || 'Gagal menyimpan data akun')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#e2e2e2] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#eef8f2] text-[#00A250] rounded-lg border border-[#b8e8cc]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#262626]">
                {isEditing ? `Ubah Akun: ${user.name}` : 'Tambah Akun Baru'}
              </h3>
              <p className="text-[11px] text-[#757575]">
                {isEditing
                  ? 'Perbarui data staf, username, password, dan izin menu'
                  : 'Buat akun pengguna baru untuk kasir atau pemilik toko'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#262626] mb-1.5">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Username / Email Login *
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#262626] mb-1.5">
                Role Pengguna *
              </label>
              {/* Drop down role HANYA ada staff dan owner sesuai permintaan user */}
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as 'staff' | 'owner')}
                className="w-full px-3 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-[#262626]">
                Password {isEditing ? '(Bisa dilihat & diubah oleh Owner)' : '*'}
              </label>
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#00A250] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Sembunyikan' : 'Lihat Password'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!isEditing}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Masukkan password baru atau biarkan' : 'Minimal 6 karakter'}
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-xs font-mono text-[#262626] focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] focus:outline-none placeholder:text-gray-400 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Menu Access Checkbox List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#262626] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00A250]" />
                <span>Hak Akses Menu POS</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllMenus}
                className="text-[11px] font-semibold text-[#00A250] hover:underline cursor-pointer"
              >
                {selectedMenus.length === ALL_MENUS.length ? 'Reset Pilihan' : 'Pilih Semua'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-xl border border-[#e2e2e2]">
              {ALL_MENUS.map((menu) => {
                const isChecked = selectedMenus.includes(menu)
                return (
                  <label
                    key={menu}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white transition cursor-pointer select-none text-[#262626]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMenu(menu)}
                      className="hidden"
                    />
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#00A250] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="font-medium text-xs">{menu}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-[#e2e2e2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#e2e2e2] rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-40"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-[#00A250] hover:bg-[#008f46] disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Buat Akun'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

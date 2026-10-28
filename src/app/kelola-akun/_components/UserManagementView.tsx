'use client'

import { useState, useTransition } from 'react'
import { Profile } from '@/types/database'
import { UserModal } from './UserModal'
import { deleteStaffAction } from '../_actions/userActions'
import { BarakahPopupModal } from '@/components/ui/BarakahPopupModal'
import { Users, Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check, ShieldCheck, User } from 'lucide-react'

interface UserManagementViewProps {
  initialUsers: Profile[]
  currentUserId: string
  currentUserRole?: string
}

function PasswordCell({ password }: { password?: string | null }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!password) {
    return <span className="text-gray-400 italic text-[11px]">- Belum diset -</span>
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#fafafa] border border-[#e2e2e2] px-2.5 py-1 rounded-lg">
      <span className="font-mono text-xs text-[#262626] font-semibold select-all min-w-[55px]">
        {show ? password : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition cursor-pointer"
        title={show ? 'Sembunyikan password' : 'Lihat password'}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 text-gray-400 hover:text-[#00A250] hover:bg-emerald-50 rounded transition cursor-pointer"
        title="Salin password"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[#00A250]" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export function UserManagementView({
  initialUsers,
  currentUserId,
  currentUserRole,
}: UserManagementViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwner = currentUserRole?.toLowerCase() === 'owner' || currentUserRole?.toLowerCase() === 'admin'

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)

    startTransition(async () => {
      const res = await deleteStaffAction(id)
      if (!res.success) {
        setErrorMessage(res.error || 'Gagal menghapus user')
      }
    })
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-0 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="px-4 py-3 sm:px-0 sm:py-0 border-b border-[#e2e2e2] sm:border-b-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
              Kelola Akun & Hak Akses
            </h1>
          </div>
          <p className="text-xs text-[#757575] mt-0.5">
            Manajemen akun kasir, staf toko, dan pembatasan akses menu
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null)
            setIsModalOpen(true)
          }}
          className="px-4 py-2 bg-[#00A250] hover:bg-[#008f46] text-white rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun</span>
        </button>
      </div>

      {/* Users Table Card (Cloudflare Table) */}
      <div className="px-3 sm:px-0">
        <div className="bg-white rounded-lg border border-[#e2e2e2] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f8f8] text-[#757575] uppercase tracking-wider font-semibold border-b border-[#e2e2e2]">
              <tr>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Username Login</th>
                <th className="py-3 px-4">Role</th>
                {isOwner && <th className="py-3 px-4">Password Staff</th>}
                <th className="py-3 px-4">Izin Akses Menu</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e2e2]">
              {initialUsers.map((u) => {
                const isCurrent = u.id === currentUserId
                const isOwnerRow = u.role?.toLowerCase() === 'owner' || u.role?.toLowerCase() === 'admin'
                return (
                  <tr key={u.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1E1E1E]">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-[#eef8f2] text-[#00A250] text-[10px] rounded-full font-bold border border-[#b8e8cc]">
                            Akun Anda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#757575] font-mono">
                      {u.email || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {isOwnerRow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc]">
                          <User className="w-3.5 h-3.5 text-[#00A250]" />
                          Staff
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="py-3.5 px-4">
                        {!isOwnerRow || isCurrent ? (
                          <PasswordCell password={u.raw_password} />
                        ) : (
                          <span className="text-gray-400 font-mono text-xs">••••••••</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {u.menu_access && u.menu_access.length > 0 ? (
                          u.menu_access.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-[#f8f8f8] border border-[#e2e2e2] text-[#262626] rounded-md text-[10px] font-medium"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#00A250] text-[11px] font-medium">Semua Menu (Full Akses)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(u)
                            setIsModalOpen(true)
                          }}
                          title="Ubah Data"
                          className="p-1.5 text-[#757575] hover:text-[#262626] hover:bg-gray-100 rounded-lg transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isCurrent && !isOwnerRow && (
                          <button
                            onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                            disabled={isPending}
                            title="Hapus Akun"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      <UserModal
        user={editingUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isOwnerLoggedIn={isOwner}
      />

      {/* Delete Confirmation Modal */}
      <BarakahPopupModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Akun"
        message={`Apakah Anda yakin ingin menghapus akun "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmButtonText="Hapus"
        dismissButtonText="Batal"
        icon="warning"
        onConfirm={handleConfirmDelete}
      />

      {/* Error Modal */}
      <BarakahPopupModal
        isOpen={Boolean(errorMessage)}
        onClose={() => setErrorMessage(null)}
        title="Terjadi Kesalahan"
        message={errorMessage || ''}
        confirmButtonText="Tutup"
        icon="error"
      />
    </div>
  )
}

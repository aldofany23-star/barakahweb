'use client'

import { useState, useTransition } from 'react'
import { Profile } from '@/types/database'
import { UserModal } from './UserModal'
import { deleteStaffAction } from '../_actions/userActions'
import { formatDateTime } from '@/lib/utils'
import { Users, Plus, Shield, Pencil, Trash2, Key, Check } from 'lucide-react'

interface UserManagementViewProps {
  initialUsers: Profile[]
  currentUserId: string
}

export function UserManagementView({
  initialUsers,
  currentUserId,
}: UserManagementViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun "${name}"?`)) {
      startTransition(async () => {
        const res = await deleteStaffAction(id)
        if (!res.success) {
          alert(res.error || 'Gagal menghapus user')
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Kelola Akun & Hak Akses Pengguna</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manajemen akun kasir, staf toko, dan pembatasan akses fitur aplikasi
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null)
            setIsModalOpen(true)
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Username / Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Izin Menu Akses</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {initialUsers.map((u) => {
                const isCurrent = u.id === currentUserId
                return (
                  <tr key={u.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] rounded-full font-bold">
                          Akun Anda
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {u.email || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.role === 'owner' || u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {u.menu_access && u.menu_access.length > 0 ? (
                          u.menu_access.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[10px]"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 text-[10px]">Semua Menu (Full Akses)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(u)
                            setIsModalOpen(true)
                          }}
                          title="Ubah Data"
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={isPending}
                            title="Hapus Akun"
                            className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
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

      <UserModal
        user={editingUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

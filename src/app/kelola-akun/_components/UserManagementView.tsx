'use client'

import { useState, useTransition } from 'react'
import { Profile } from '@/types/database'
import { UserModal } from './UserModal'
import { deleteStaffAction } from '../_actions/userActions'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'

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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
            Kelola Akun & Hak Akses
          </h1>
          <p className="text-xs text-[#8B8B8B] mt-0.5">
            Manajemen akun kasir, staf toko, dan pembatasan akses menu POS
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null)
            setIsModalOpen(true)
          }}
          className="px-5 py-2.5 bg-[#00A250] hover:bg-[#008f46] text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun</span>
        </button>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F9] text-[#8B8B8B] uppercase tracking-wider font-bold border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3.5 px-4">Nama Pengguna</th>
                <th className="py-3.5 px-4">Username Login</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Izin Akses Menu</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {initialUsers.map((u) => {
                const isCurrent = u.id === currentUserId
                return (
                  <tr key={u.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="py-3.5 px-4 font-bold text-[#1E1E1E] flex items-center gap-2">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 bg-[#D6F0E0] text-[#00A250] text-[10px] rounded-full font-bold">
                          Akun Anda
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#8B8B8B]">
                      {u.email || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold capitalize ${
                          u.role === 'owner' || u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-[#E5E5EA] text-[#1E1E1E]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {u.menu_access && u.menu_access.length > 0 ? (
                          u.menu_access.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 bg-[#F9F9F9] border border-[#E5E7EB] text-[#1E1E1E] rounded-full text-[10px] font-medium"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8B8B8B] text-[10px]">Semua Menu (Full Akses)</span>
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
                          className="p-2 text-[#1E1E1E] hover:bg-[#E5E5EA] rounded-xl transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={isPending}
                            title="Hapus Akun"
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
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

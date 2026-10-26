'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shift } from '@/types/database'
import { UserSession } from '@/lib/session'
import { ShiftModal } from './ShiftModal'
import { logoutAction } from '@/app/(auth)/login/_actions/logoutAction'
import {
  PawPrint,
  ChevronsUpDown,
  LogOut,
  CheckCircle2,
  ExternalLink,
  Menu,
} from 'lucide-react'

interface HeaderProps {
  session: UserSession | null
  currentShift: Shift | null
}

export function Header({ session, currentShift }: HeaderProps) {
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  useEffect(() => {
    const handleOpenShift = () => setIsShiftModalOpen(true)
    window.addEventListener('open-shift-modal', handleOpenShift)
    return () => window.removeEventListener('open-shift-modal', handleOpenShift)
  }, [])

  const userDisplayName = session?.email || (session?.name ? `${session.name.toLowerCase()}@barakah.id` : 'andysilvano2406@gmail.com')

  return (
    <>
      {/* Cloudflare Top Header Bar */}
      <header className="h-12 bg-white border-b border-[#e2e2e2] px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40 shrink-0">
        {/* Left Side: Cloud Logo + Account Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
            className="md:hidden p-1 -ml-1 text-gray-600 hover:text-[#262626] hover:bg-[#f3f3f3] rounded-md transition cursor-pointer"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 group py-1"
            title="Barakah Fauna Petshop Dashboard"
          >
            {/* Animal Paw Icon in Barakah Green */}
            <div className="w-7 h-7 flex items-center justify-center text-[#00A250] group-hover:scale-110 transition-transform">
              <PawPrint className="w-6 h-6 fill-[#00A250] text-[#00A250]" />
            </div>
          </Link>

          {/* Account Selector (Matching Cloudflare "Andysilvano2406@... ⬍") */}
          <div className="relative">
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-[#262626] hover:bg-[#f3f3f3] transition cursor-pointer"
            >
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {userDisplayName}
              </span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isAccountMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsAccountMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-lg border border-[#e2e2e2] shadow-lg p-2 z-40 text-xs">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Akun Terhubung
                    </div>
                    <div className="font-bold text-[#262626] mt-0.5 truncate">
                      {session?.name || 'Kasir'}
                    </div>
                    <div className="text-gray-500 text-[11px] truncate">
                      {userDisplayName}
                    </div>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#eef8f2] text-[#00A250] text-[10px] font-semibold mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Role: {session?.role || 'staff'}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/pengaturan"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-[#f3f3f3] rounded-md transition"
                    >
                      <span>Profil Toko</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Redesigned Shift Status Pill */}
        <div className="flex items-center">
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 border ${
              currentShift
                ? 'bg-[#ecfdf5] text-[#00A250] border-[#b8e8cc] hover:bg-[#dff4e7] hover:border-[#86e2ae]'
                : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a] hover:bg-[#fef3c7] hover:border-[#fcd34d]'
            }`}
            title={currentShift ? 'Kelola / Akhiri Shift Aktif' : 'Klik untuk Membuka Shift Kasir'}
          >
            {currentShift ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A250] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A250]"></span>
                </span>
                <span className="tracking-tight">Shift Aktif</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="tracking-tight">Mulai Shift</span>
              </>
            )}
          </button>
        </div>
      </header>

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentShift={currentShift}
      />
    </>
  )
}

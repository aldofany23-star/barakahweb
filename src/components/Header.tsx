'use client'

import { useState } from 'react'
import { Shift } from '@/types/database'
import { UserSession } from '@/lib/session'
import { ShiftModal } from './ShiftModal'
import { logoutAction } from '@/app/(auth)/login/_actions/logoutAction'
import { Clock, LogOut, UserCircle2 } from 'lucide-react'

interface HeaderProps {
  session: UserSession | null
  currentShift: Shift | null
}

export function Header({ session, currentShift }: HeaderProps) {
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)

  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <>
      <header className="h-16 px-6 bg-white border-b border-[#E5E7EB] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8B8B8B]">
            <span className="font-bold text-[#00A250]">Barakah Fauna POS</span>
            <span>•</span>
            <span>{currentDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Shift status pill */}
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${
              currentShift
                ? 'bg-[#D6F0E0] text-[#00A250] border-[#B2E4C4] hover:bg-[#c4ebd1]'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-[#00A250] animate-pulse' : 'bg-amber-500'}`} />
            <Clock className="w-3.5 h-3.5" />
            <span>{currentShift ? 'Shift Aktif' : 'Mulai Shift Kasir'}</span>
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <UserCircle2 className="w-7 h-7 text-[#8B8B8B]" />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-[#1E1E1E] leading-tight">
                  {session?.name || 'Kasir'}
                </div>
                <div className="text-[10px] text-[#8B8B8B] capitalize">
                  {session?.role || 'staff'}
                </div>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar"
                className="p-1.5 text-[#8B8B8B] hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
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

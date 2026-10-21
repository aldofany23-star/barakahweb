'use client'

import { useState } from 'react'
import { Shift } from '@/types/database'
import { UserSession } from '@/lib/session'
import { ShiftModal } from './ShiftModal'
import { logoutAction } from '@/app/(auth)/login/_actions/logoutAction'
import { Clock, LogOut, UserCircle2, Store } from 'lucide-react'

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
      <header className="h-16 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
            <Store className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">BARAKAH FAUNA</span>
            <span>•</span>
            <span>{currentDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Shift status pill */}
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
              currentShift
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <Clock className="w-3.5 h-3.5" />
            <span>{currentShift ? 'Shift Aktif' : 'Shift Non-Aktif'}</span>
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <UserCircle2 className="w-6 h-6 text-zinc-400" />
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                  {session?.name || 'Kasir'}
                </div>
                <div className="text-[10px] text-zinc-400 capitalize">
                  {session?.role || 'staff'}
                </div>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar"
                className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
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

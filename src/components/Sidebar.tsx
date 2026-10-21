'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserSession } from '@/lib/session'
import {
  ShoppingCart,
  Package,
  Percent,
  Receipt,
  ClipboardList,
  LayoutDashboard,
  Users,
  Settings,
  Store,
  ChevronLeft,
  Menu,
} from 'lucide-react'

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ALL_MENUS: MenuItem[] = [
  { name: 'Kasir', href: '/kasir', icon: ShoppingCart },
  { name: 'Produk & Stok', href: '/produk', icon: Package },
  { name: 'Setup Diskon', href: '/diskon', icon: Percent },
  { name: 'Laporan Penjualan', href: '/laporan-penjualan', icon: Receipt },
  { name: 'Laporan Kerja', href: '/laporan-kerja', icon: ClipboardList },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Kelola Akun', href: '/kelola-akun', icon: Users },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
]

interface SidebarProps {
  session: UserSession | null
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filter menu berdasarkan hak akses akun
  const allowedMenus = ALL_MENUS.filter((item) => {
    if (!session) return false
    if (session.role === 'owner' || session.role === 'admin') return true
    const menuAccess = session.menu_access || ['Kasir']
    return menuAccess.some((m) => m.toLowerCase() === item.name.toLowerCase())
  })

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3.5 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <Link href="/kasir" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Store className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wide text-zinc-900 dark:text-zinc-100">
                  BARAKAH FAUNA
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Pet Shop POS</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {allowedMenus.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Info footer */}
        {!isCollapsed && session && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {session.name}
            </div>
            <div className="text-[10px] text-zinc-400 capitalize">
              Role: {session.role}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

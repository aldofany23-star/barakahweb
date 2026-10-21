'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserSession } from '@/lib/session'
import {
  ShoppingCart,
  Package,
  Tag,
  Receipt,
  ClipboardList,
  LayoutDashboard,
  Users,
  Settings,
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
  { name: 'Setup Diskon', href: '/diskon', icon: Tag },
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

  // Filter menu berdasarkan hak akses akun (persis seperti di Android MainDashboardScreen.kt)
  const allowedMenus = ALL_MENUS.filter((item) => {
    if (!session) return false
    if (session.role === 'owner') return true
    if (item.name === 'Kelola Akun') {
      return session.role === 'owner'
    }
    const menuAccess = session.menu_access || ['Kasir']
    return menuAccess.some((m) => m.toLowerCase() === item.name.toLowerCase())
  })

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3.5 bg-[#00A250] text-white rounded-full shadow-xl hover:bg-[#008f46]"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-[#E5E7EB] flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand / Logo (Matches Android: "Barakah Fauna" 22sp ExtraBold #00A250) */}
        <div className="h-16 px-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <Link href="/kasir" className="flex items-center gap-2.5 overflow-hidden">
            {!isCollapsed ? (
              <span className="text-xl font-extrabold text-[#00A250] tracking-tight">
                Barakah Fauna
              </span>
            ) : (
              <span className="text-xl font-black text-[#00A250]">BF</span>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-[#8B8B8B] hover:text-[#1E1E1E] hover:bg-[#F9F9F9] rounded-lg transition"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedMenus.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs transition-all ${
                  isActive
                    ? 'bg-[#D6F0E0] text-[#00A250] font-bold shadow-xs'
                    : 'text-[#1E1E1E] font-medium hover:bg-[#F9F9F9] hover:text-[#00A250]'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00A250]' : 'text-[#8B8B8B]'}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Info footer */}
        {!isCollapsed && session && (
          <div className="p-4 border-t border-[#E5E7EB] bg-[#F9F9F9]">
            <div className="text-xs font-bold text-[#1E1E1E] truncate">
              {session.name}
            </div>
            <div className="text-[11px] text-[#8B8B8B] capitalize mt-0.5">
              Role: {session.role}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

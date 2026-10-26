'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserSession } from '@/lib/session'
import { Shift } from '@/types/database'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Receipt,
  ClipboardList,
  Users,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  History,
} from 'lucide-react'

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: 'operasional' | 'laporan' | 'pengaturan'
  badge?: string
  subtext?: string
}

const ALL_MENUS: MenuItem[] = [
  {
    name: 'Kasir POS',
    href: '/kasir',
    icon: ShoppingCart,
    section: 'operasional',
    subtext: 'Transaksi & cetak struk',
  },
  {
    name: 'Produk & Stock',
    href: '/produk',
    icon: Package,
    section: 'operasional',
    subtext: 'Stok pakan & aksesoris',
  },
  {
    name: 'Setup Diskon',
    href: '/diskon',
    icon: Tag,
    section: 'operasional',
    subtext: 'Promo nominal & persen',
  },
  {
    name: 'Laporan Penjualan',
    href: '/laporan-penjualan',
    icon: Receipt,
    section: 'laporan',
    subtext: 'Rekap omset harian',
  },
  {
    name: 'Laporan Kerja',
    href: '/laporan-kerja',
    icon: ClipboardList,
    section: 'laporan',
    subtext: 'Log pergantian shift',
  },
  {
    name: 'Kelola Akun',
    href: '/kelola-akun',
    icon: Users,
    section: 'pengaturan',
    subtext: 'Role & hak akses kasir',
  },
  {
    name: 'Pengaturan Toko',
    href: '/pengaturan',
    icon: Settings,
    section: 'pengaturan',
    subtext: 'Profil & printer thermal',
  },
]

interface SidebarProps {
  session: UserSession | null
  currentShift?: Shift | null
}

export function Sidebar({ session, currentShift }: SidebarProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [recentsOpen, setRecentsOpen] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Hotkey Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Listen for mobile sidebar toggle from Header
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  // Filter allowed menus
  const allowedMenus = ALL_MENUS.filter((item) => {
    if (!session) return false
    if (session.role === 'owner') return true
    if (item.name === 'Kelola Akun') {
      return session.role === 'owner'
    }
    const menuAccess = session.menu_access || ['Kasir']
    return menuAccess.some((m) => m.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]))
  })

  const filteredMenus = allowedMenus.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const operasionalMenus = filteredMenus.filter((m) => m.section === 'operasional')
  const laporanMenus = filteredMenus.filter((m) => m.section === 'laporan')
  const pengaturanMenus = filteredMenus.filter((m) => m.section === 'pengaturan')

  const isHomeActive = pathname === '/dashboard' || pathname === '/'

  const renderNavigationContent = () => (
    <>
      {/* Quick Search Input (Matching Cloudflare "Quick search... Ctrl K") */}
      <div className="p-3 pb-2 shrink-0">
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-[#e2e2e2] rounded-md text-xs hover:border-gray-400 transition">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu kasir..."
              className="bg-transparent border-none outline-none text-xs text-[#262626] placeholder:text-gray-400 w-full"
            />
          </div>
          <kbd className="hidden sm:inline-block text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-1 py-0.5 rounded shrink-0">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-1 space-y-4 overflow-y-auto text-xs">
        {/* Dashboard */}
        <div>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition ${
              isHomeActive
                ? 'bg-[#f3f3f3] text-[#262626] font-semibold'
                : 'text-gray-700 hover:bg-[#f3f3f3]'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${isHomeActive ? 'text-[#00A250]' : 'text-gray-500'}`} />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Terakhir Dibuka (Collapsible exactly like Cloudflare Recents) */}
        <div>
          <button
            onClick={() => setRecentsOpen(!recentsOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-gray-500 hover:text-gray-800 font-medium transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-gray-400" />
              <span>Terakhir Dibuka</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                recentsOpen ? '' : '-rotate-90'
              }`}
            />
          </button>

          {recentsOpen && (
            <div className="mt-1 pl-6 space-y-0.5">
              {allowedMenus.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-1 px-2 rounded-md hover:bg-[#f3f3f3] transition group"
                >
                  <div className="text-[#262626] font-medium text-[11px] group-hover:text-[#00A250] truncate">
                    {item.name}
                  </div>
                  {item.subtext && (
                    <div className="text-[10px] text-gray-400 truncate">
                      {item.subtext}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section: Operasional (sebelumnya Build) */}
        {operasionalMenus.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 mb-1">
              Operasional Toko
            </div>
            <div className="space-y-0.5">
              {operasionalMenus.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-[#f3f3f3] text-[#262626] font-semibold'
                        : 'text-gray-700 hover:bg-[#f3f3f3]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#00A250]' : 'text-gray-500'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Section: Laporan & Analitik (sebelumnya Protect) */}
        {laporanMenus.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 mb-1">
              Laporan & Rekap
            </div>
            <div className="space-y-0.5">
              {laporanMenus.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-[#f3f3f3] text-[#262626] font-semibold'
                        : 'text-gray-700 hover:bg-[#f3f3f3]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#00A250]' : 'text-gray-500'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Section: Pengaturan & Akses (sebelumnya Connect) */}
        {pengaturanMenus.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2.5 mb-1">
              Pengaturan & Akses
            </div>
            <div className="space-y-0.5">
              {pengaturanMenus.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-[#f3f3f3] text-[#262626] font-semibold'
                        : 'text-gray-700 hover:bg-[#f3f3f3]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#00A250]' : 'text-gray-500'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer: System Status */}
      <div className="p-3 border-t border-[#e2e2e2] bg-[#fafafa] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A250] animate-pulse" />
            <span className="text-[11px] font-medium text-gray-600">Sistem Berjalan Normal</span>
          </div>
          <span className="text-[10px] text-gray-400">v1.2</span>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar (Permanent, Always visible on md: 768px+) */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 bg-white border-r border-[#e2e2e2] flex-col sticky top-12 h-[calc(100vh-3rem)] z-30">
        {renderNavigationContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden"
        />
      )}

      {/* Mobile Drawer (Slide-Over for < md) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-[#e2e2e2] flex flex-col transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="h-12 px-3 border-b border-[#e2e2e2] flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-[#262626]">Menu Barakah Fauna</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {renderNavigationContent()}
      </aside>

      {/* Mobile Bottom Navigation Bar (Cloudflare Quick Mobile Access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e2e2] px-3 py-1.5 flex items-center justify-around shadow-sm">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1 px-2 rounded-md ${
            isHomeActive ? 'text-[#00A250] font-bold' : 'text-gray-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </Link>
        <Link
          href="/kasir"
          className={`flex flex-col items-center py-1 px-2 rounded-md ${
            pathname.startsWith('/kasir') ? 'text-[#00A250] font-bold' : 'text-gray-500'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Kasir</span>
        </Link>
        <Link
          href="/produk"
          className={`flex flex-col items-center py-1 px-2 rounded-md ${
            pathname.startsWith('/produk') ? 'text-[#00A250] font-bold' : 'text-gray-500'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Produk</span>
        </Link>
        <Link
          href="/laporan-penjualan"
          className={`flex flex-col items-center py-1 px-2 rounded-md ${
            pathname.startsWith('/laporan-penjualan') ? 'text-[#00A250] font-bold' : 'text-gray-500'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Laporan</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-md text-gray-500 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </>
  )
}

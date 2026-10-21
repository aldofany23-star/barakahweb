import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { getSession } from '@/lib/session'
import { getActiveShift } from '@/lib/actions/shiftActions'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Barakah Fauna POS - Sistem Kasir Modern',
  description: 'Web Point of Sale untuk Barakah Fauna Petshop',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()
  const currentShift = session ? await getActiveShift() : null

  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F9F9F9] text-[#1E1E1E] min-h-screen`}>
        {session ? (
          <div className="flex min-h-screen">
            <Sidebar session={session} />
            <div className="flex-1 flex flex-col min-w-0">
              <Header session={session} currentShift={currentShift} />
              <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}

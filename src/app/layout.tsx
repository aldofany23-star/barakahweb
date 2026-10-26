import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'
import { getSession } from '@/lib/session'
import { getActiveShift } from '@/lib/actions/shiftActions'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { PageTransitionLoader } from '@/components/PageTransitionLoader'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-archivo',
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
    <html lang="id" className={archivo.variable}>
      <body className="antialiased bg-white text-[#262626] min-h-screen">
        <Suspense fallback={null}>
          <PageTransitionLoader />
        </Suspense>
        {session ? (
          <div className="flex flex-col min-h-screen bg-white">
            <Header session={session} currentShift={currentShift} />
            <div className="flex flex-1 min-h-0">
              <Sidebar session={session} currentShift={currentShift} />
              <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white min-w-0 pb-16 md:pb-0">
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

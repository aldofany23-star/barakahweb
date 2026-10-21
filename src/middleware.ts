import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'barakah-fauna-pos-secret-key-32-chars-long!!'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Lewati semua aset internal Next.js, static files, fonts, dan images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('barakah_session')?.value

  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY)
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  const isLoginPage = pathname === '/login'

  // Halaman Root: redirect ke /kasir jika login, atau ke /login jika belum
  if (pathname === '/') {
    return NextResponse.redirect(new URL(isAuthenticated ? '/kasir' : '/login', request.url))
  }

  // Belum login dan mencoba mengakses halaman privat
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Sudah login tapi masih di halaman /login
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/kasir', request.url))
  }

  return NextResponse.next()
}

export const matcher = [
  /*
   * Cocokkan semua request kecuali file statis
   */
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|json|png|jpg|jpeg|svg|webp|woff|woff2|ttf|ico)$).*)',
]

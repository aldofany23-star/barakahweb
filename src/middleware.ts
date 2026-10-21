import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'barakah-fauna-pos-secret-key-32-chars-long!!'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
  const isApi = pathname.startsWith('/api')

  // Landing page redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(isAuthenticated ? '/kasir' : '/login', request.url))
  }

  // Belum login tapi mengakses halaman terlindungi
  if (!isAuthenticated && !isLoginPage && !isApi) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // Sudah login tapi mencoba akses /login
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/kasir', request.url))
  }

  return NextResponse.next()
}

export const matcher = [
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]

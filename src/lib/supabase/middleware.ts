import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lrqtacaddbrmmopuliqc.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_cu-byDH17eSvUmu85Mwi1Q_-L1s8GNB'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to /login if user is not authenticated and trying to access protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isPublicApi = request.nextUrl.pathname.startsWith('/api/public')

  if (!user && !isAuthPage && !isPublicApi && request.nextUrl.pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If already logged in and navigating to /login, redirect to /kasir
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/kasir'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { Profile } from '@/types/database'

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'barakah-fauna-pos-secret-key-32-chars-long!!'
)

const COOKIE_NAME = 'barakah_session'

export interface UserSession {
  id: string
  name: string
  email: string
  role: string
  menu_access: string[]
  loginDateWib: string
}

function getTodayWib(): string {
  const now = new Date()
  const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const year = wibTime.getFullYear()
  const month = String(wibTime.getMonth() + 1).padStart(2, '0')
  const day = String(wibTime.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function createSession(profile: Profile) {
  const todayWib = getTodayWib()
  const sessionPayload: UserSession = {
    id: profile.id,
    name: profile.name,
    email: profile.email || '',
    role: profile.role,
    menu_access: profile.menu_access || ['Kasir'],
    loginDateWib: todayWib,
  }

  const token = await new SignJWT({ ...sessionPayload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return sessionPayload
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    const session = payload as unknown as UserSession

    // Auto-logout jika hari sudah berganti (melewati tengah malam WIB, sama seperti di Android)
    const todayWib = getTodayWib()
    if (session.loginDateWib && session.loginDateWib !== todayWib) {
      await deleteSession()
      return null
    }

    return session
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

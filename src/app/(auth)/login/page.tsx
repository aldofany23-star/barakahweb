import { LoginForm } from './_components/LoginForm'

export const metadata = {
  title: 'Login - Barakah Fauna POS',
  description: 'Sistem Kasir & Point of Sale Barakah Fauna',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-emerald-950 via-zinc-950 to-zinc-900">
      <LoginForm />
    </main>
  )
}

import { LoginForm } from './_components/LoginForm'

export const metadata = {
  title: 'Login - Barakah Fauna POS',
  description: 'Sistem Kasir & Point of Sale Barakah Fauna',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F9F9F9]">
      {/* Left Brand Panel (Matches Android isWide LoginScreen) */}
      <div className="w-full lg:w-1/2 bg-[#00A250] py-16 lg:py-0 flex flex-col items-center justify-center text-center px-6 shadow-md lg:shadow-none">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-wider">
          BARAKAH
        </h1>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-[#D6F0E0] mt-1 tracking-wide">
          FAUNA POS
        </h2>
      </div>

      {/* Right Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <LoginForm />
      </div>
    </main>
  )
}

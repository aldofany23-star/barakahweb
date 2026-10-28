import Image from 'next/image'
import { LoginForm } from './_components/LoginForm'

export const metadata = {
  title: 'Masuk - Barakah Fauna POS',
  description: 'Sistem Kasir & Point of Sale Barakah Fauna',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Kolom Kiri: Formulir Login (Di tengah layar pada perangkat mobile) */}
      <div className="w-full lg:w-1/2 min-h-screen lg:min-h-0 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <LoginForm />
      </div>

      {/* Kolom Kanan: Gambar Full Penuh (Hilang di Layar Kecil, Tanpa Shape dalam Shape) */}
      <div className="hidden lg:flex lg:w-1/2 p-4 sm:p-6 lg:p-8 items-center justify-center">
        <div className="relative w-full h-full min-h-[calc(100vh-4rem)] rounded-3xl overflow-hidden shadow-xs border border-emerald-100/60 bg-[#F8FAF6]">
          <Image
            src="/loginpage.jpg"
            alt="Ilustrasi Kasir Barakah Fauna POS"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />
        </div>
      </div>
    </main>
  )
}

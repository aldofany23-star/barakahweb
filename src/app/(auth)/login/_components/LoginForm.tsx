'use client'

import { useState, useTransition } from 'react'
import { loginAction } from '../_actions/loginAction'
import { Eye, EyeOff, Loader2, KeyRound, ShieldCheck, X } from 'lucide-react'

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await loginAction(formData)
      if (res.success) {
        setIsRedirecting(true)
        window.location.href = '/kasir'
      } else {
        setError(res.error || 'Login gagal')
      }
    })
  }

  return (
    <div className="w-full max-w-[400px] mx-auto text-left">
      <div className="mb-8 text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-[#1E1E1E] tracking-tight">
          Selamat Datang!
        </h1>
        <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-[360px]">
          Permudah transaksi dan kelola toko hewan Anda bersama{' '}
          <span className="font-semibold text-gray-700">Barakah Fauna POS</span>.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-medium leading-relaxed text-left">
          {error}
        </div>
      )}

      <form method="POST" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="identifier"
            required
            autoFocus
            placeholder="Nama Pengguna / Email"
            className="w-full px-4 py-3.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1E1E1E] text-left placeholder:text-left placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] transition shadow-xs"
          />
        </div>

        <div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              placeholder="Kata Sandi"
              className="w-full pl-4 pr-11 py-3.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1E1E1E] text-left placeholder:text-left placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] transition shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#1E1E1E] transition cursor-pointer"
              title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-xs font-medium text-gray-500 hover:text-[#00A250] transition cursor-pointer"
          >
            Lupa Kata Sandi?
          </button>
        </div>

        <button
          type="submit"
          disabled={isPending || isRedirecting}
          className="w-full h-12 bg-[#1E1E1E] hover:bg-black active:scale-[0.99] disabled:opacity-75 text-white font-bold rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-5"
        >
          {isRedirecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Login Berhasil! Membuka Kasir...</span>
            </>
          ) : isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <span>Masuk</span>
          )}
        </button>
      </form>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#e2e2e2] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc] flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#262626]">
                    Reset Kata Sandi
                  </h3>
                  <p className="text-[11px] text-[#757575]">
                    Bantuan Akses Akun Barakah Fauna POS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#262626]">
              <div className="p-3.5 bg-[#F8FAF9] border border-[#E2F3E7] rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#00A250] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800 leading-snug">
                    Kebijakan Keamanan Akun Toko
                  </p>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Demi keamanan data toko dan transaksi kasir, pengaturan ulang kata sandi staf hanya dapat dilakukan oleh <strong className="text-gray-800">Administrator</strong> atau <strong className="text-gray-800">Pemilik Toko</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="font-bold text-[11px] uppercase tracking-wider text-gray-400">
                  Panduan Pemulihan Akses
                </p>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-white">
                  <span className="w-5 h-5 rounded-full bg-[#eef8f2] text-[#00A250] font-bold text-[10px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p className="text-xs text-gray-600 leading-snug">
                    Hubungi Pemilik Toko atau Administrator yang bertugas.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-white">
                  <span className="w-5 h-5 rounded-full bg-[#eef8f2] text-[#00A250] font-bold text-[10px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p className="text-xs text-gray-600 leading-snug">
                    Administrator dapat masuk ke menu <strong className="text-gray-800">Kelola Akun</strong> untuk mengatur ulang kata sandi akun Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-gray-50/80 border-t border-[#e2e2e2] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

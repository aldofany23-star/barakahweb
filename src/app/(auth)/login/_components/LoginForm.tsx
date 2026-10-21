'use client'

import { useState, useTransition } from 'react'
import { loginAction } from '../_actions/loginAction'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await loginAction(formData)
      if (res.success) {
        window.location.href = '/kasir'
      } else {
        setError(res.error || 'Login gagal')
      }
    })
  }

  return (
    <div className="w-full max-w-[420px] bg-white rounded-3xl border border-[#E5E7EB] p-8 sm:p-10 smooth-card-static">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1E1E1E]">Welcome Back</h2>
        <p className="text-sm text-[#8B8B8B] mt-2">Please log in to your account</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          {error}
        </div>
      )}

      <form method="POST" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#1E1E1E] mb-1.5">
            Email
          </label>
          <input
            type="text"
            name="identifier"
            required
            autoFocus
            placeholder="barakahfauna@admin.com / nama staf"
            className="w-full px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1E1E1E] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E1E1E] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              placeholder="••••••••"
              className="w-full pl-4 pr-11 py-3 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1E1E1E] focus:outline-none focus:border-[#00A250] focus:ring-1 focus:ring-[#00A250] transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8B8B8B] hover:text-[#1E1E1E] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 bg-[#00A250] hover:bg-[#008f46] active:bg-[#007a3c] disabled:opacity-60 text-white font-bold rounded-lg text-base shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-6"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Log in</span>
          )}
        </button>
      </form>
    </div>
  )
}

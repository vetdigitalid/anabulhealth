'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isRegister) {
      // Registrasi Akun Baru
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage('Gagal mendaftar: ' + error.message)
      } else {
        setMessage('Pendaftaran berhasil! Silakan klik tombol Login di bawah untuk masuk.')
        setIsRegister(false)
      }
    } else {
      // Login Akun
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage('Gagal login: ' + error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">🐾 PASPOR ANABUL</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister
              ? 'Buat akun Paspor Anabul Anda'
              : 'Masuk ke akun Paspor Anabul Anda'}
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 text-xs rounded-xl border ${
              message.includes('berhasil')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email:
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password:
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-medium text-white rounded-xl transition-all shadow-sm text-sm"
          >
            {loading
              ? 'Memproses...'
              : isRegister
              ? 'Daftar Akun Baru'
              : 'Masuk (Login)'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setMessage('')
            }}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium underline"
          >
            {isRegister
              ? 'Sudah punya akun? Login di sini'
              : 'Belum punya akun? Daftar di sini'}
          </button>
        </div>
      </div>
    </main>
  )
}

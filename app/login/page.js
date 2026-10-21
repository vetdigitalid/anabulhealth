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
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 w-full max-w-md text-center space-y-5">
        
        {/* LOGO RESMI PASPOR ANABUL */}
        <div className="flex justify-center pt-2">
          <img
            src="/logo.png"
            alt="Logo Paspor Anabul"
            className="w-24 h-24 object-contain"
          />
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            PASPOR ANABUL
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'Buat akun Paspor Anabul Anda'
              : 'Masuk ke akun Paspor Anabul Anda'}
          </p>
        </div>

        {message && (
          <div
            className={`p-3 text-xs rounded-xl border text-left ${
              message.includes('berhasil')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email:
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password:
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all"
          >
            {loading
              ? 'Memproses...'
              : isRegister
              ? 'Daftar Akun Baru'
              : 'Masuk (Login)'}
          </button>
        </form>

        <div className="pt-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setMessage('')
            }}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium underline transition-all"
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

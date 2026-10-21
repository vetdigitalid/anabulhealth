'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [supabase, setSupabase] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      const client = createClient(supabaseUrl, supabaseAnonKey)
      setSupabase(client)

      client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push('/')
        }
      })
    }
  }, [router])

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!supabase) {
      setMessage('Gagal: Konfigurasi Supabase belum siap. Periksa Environment Variables di Vercel.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi atau langsung masuk.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (err) {
      setMessage(`Gagal: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 mx-auto flex items-center justify-center text-3xl shadow-lg">
            🐾
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-wide uppercase">
            PASPOR ANABUL
          </h1>
          <p className="text-xs text-slate-500">
            {isRegister ? 'Buat akun baru untuk anabul Anda' : 'Masuk untuk mengelola rekam medis anabul'}
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs ${message.startsWith('Gagal') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-800 bg-slate-50/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kata Sandi / Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-slate-800 bg-slate-50/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Akun Baru' : 'Masuk Akun'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setMessage('')
            }}
            className="text-xs text-amber-600 font-semibold hover:underline"
          >
            {isRegister ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar gratis'}
          </button>
        </div>
      </div>
    </main>
  )
}

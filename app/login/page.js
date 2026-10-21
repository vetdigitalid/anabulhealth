'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isRegister) {
        // --- PROSES REGISTRASI DENGAN REDIRECT KE DOMAIN RESMI ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://pasporanabulku.web.id',
          },
        })

        if (error) {
          setMessage({ type: 'error', text: 'Gagal mendaftar: ' + error.message })
        } else {
          setIsEmailSent(true)
        }
      } else {
        // --- PROSES LOGIN ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setMessage({
              type: 'error',
              text: '⚠️ Email Anda belum dikonfirmasi! Silakan buka email Anda dan klik link verifikasi terlebih dahulu.',
            })
          } else {
            setMessage({ type: 'error', text: 'Gagal login: ' + error.message })
          }
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm max-w-md w-full space-y-5 text-center">
        
        {/* LOGO RESMI PASPOR ANABUL */}
        <div className="flex justify-center pt-2">
          <img
            src="/logo.png"
            alt="Logo Paspor Anabul"
            className="w-20 h-20 object-contain"
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

        {/* NOTIFIKASI PESAN ERROR / ALERT */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium border text-left leading-relaxed ${
              message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* TAMPILAN INSTRUKSI SETELAH KLIK DAFTAR (PERINTAH CEK EMAIL) */}
        {isEmailSent ? (
          <div className="bg-sky-50 p-5 rounded-2xl border border-sky-200 text-center space-y-3">
            <div className="text-4xl">📩</div>
            <h3 className="font-bold text-sky-900 text-sm">Cek Email Anda!</h3>
            <p className="text-xs text-sky-800 leading-relaxed">
              Link konfirmasi pendaftaran telah dikirim ke <b>{email}</b>.
            </p>
            <p className="text-[11px] text-sky-700">
              Silakan buka inbox atau folder <b>Spam</b> email Anda, lalu klik link konfirmasi untuk mengaktifkan akun Paspor Anabul.
            </p>
            <button
              onClick={() => {
                setIsEmailSent(false)
                setIsRegister(false)
                setMessage(null)
              }}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline inline-block"
            >
              ← Sudah Konfirmasi? Login Di Sini
            </button>
          </div>
        ) : (
          /* FORM LOGIN / REGISTER MAIN */
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
        )}

        {/* SWITCHANTARA LOGIN DAN REGISTER */}
        {!isEmailSent && (
          <div className="pt-2">
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setMessage(null)
              }}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium underline transition-all"
            >
              {isRegister
                ? 'Sudah punya akun? Login di sini'
                : 'Belum punya akun? Daftar di sini'}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}

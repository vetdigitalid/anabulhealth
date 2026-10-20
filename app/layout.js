import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Paspor Anabul - Rekam Medis & Pengingat Kesehatan Hewan',
  description: 'Aplikasi pencatatan rekam medis, jadwal vaksinasi, obat cacing, dan pengingat otomatis untuk anabul kesayangan.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}

        {/* Script Snap Midtrans */}
        <Script
          src="https://app.midtrans.com/snap/snap.js" // Gunakan https://app.sandbox.midtrans.com/snap/snap.js jika masih pengujian Sandbox
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

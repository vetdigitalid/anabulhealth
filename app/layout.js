import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Paspor Anabul - Rekam Medis & Pengingat Kesehatan Hewan',
  description: 'Aplikasi pencatatan rekam medis, jadwal vaksinasi, obat cacing, dan pengingat otomatis untuk anabul kesayangan.',
  manifest: '/manifest.json',
  themeColor: '#d97706',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d97706" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paspor Anabul" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}

        {/* Script Snap Midtrans */}
        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

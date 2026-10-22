import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Paspor Anabul - Rekam Medis & Pengingat Kesehatan Hewan',
  description: 'Aplikasi pencatatan rekam medis, jadwal vaksinasi, obat cacing, dan pengingat otomatis untuk anabul kesayangan.',
  manifest: '/manifest.json',
  themeColor: '#d97706',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#d97706" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paspor Anabul" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}

        {/* Script Snap Midtrans Sandbox */}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

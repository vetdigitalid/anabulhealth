import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Paspor Anabul - Medical & Health Tracker',
  description: 'Rekam Medis & Paspor Digital Anabul Terintegrasi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-slate-100 text-slate-800 antialiased">
        {children}
        {/* Script Midtrans Production Aman */}
        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''}
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

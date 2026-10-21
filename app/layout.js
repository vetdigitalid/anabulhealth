import './globals.css'

export const metadata = {
  title: 'Paspor Anabul - Medical & Health Tracker',
  description: 'Rekam Medis & Paspor Digital Anabul Terintegrasi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        {/* Script Midtrans Snap Production */}
        <script
          type="text/javascript"
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        ></script>
      </head>
      <body className="bg-slate-100 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  )
}

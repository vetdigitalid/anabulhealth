import './globals.css'

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
      </body>
    </html>
  )
}

import './globals.css'

export const metadata = {
  title: 'Pet Health Tracker - Rekam Medis Anabul',
  description: 'Aplikasi pencatatan rekam medis dan kesehatan hewan peliharaan',
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

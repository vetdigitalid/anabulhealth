export const metadata = {
  title: 'Pet Health Tracker - Rekam Medis Anabul',
  description: 'Aplikasi pencatatan rekam medis dan kesehatan hewan peliharaan',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
        {children}
      </body>
    </html>
  )
}

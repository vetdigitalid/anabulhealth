export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#ffffff',
        padding: '2.5rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
          Pet Health Tracker
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          Catat rekam medis, riwayat vaksin, dan jadwal perawatan anabul kesayangan Anda secara rapi dan hemat.
        </p>
        <button style={{
          width: '100%',
          padding: '12px',
          fontSize: '1rem',
          fontWeight: '600',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>
          Mulai Sekarang (Gratis)
        </button>
      </div>
    </main>
  );
}

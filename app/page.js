'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inisialisasi Supabase Client dengan aman di Client Side
  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  // State Form
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Kucing');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ambil Data Pets dari Supabase
  const fetchPets = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching pets:', error);
    } else {
      setPets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (showApp) {
      fetchPets();
    }
  }, [showApp]);

  // Tambah Data Pet Baru
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('Koneksi Supabase belum siap. Periksa Environment Variables.');
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('pets').insert([
      {
        name,
        species,
        breed,
        age: age ? parseInt(age) : null,
        medical_history: medicalHistory,
      },
    ]);

    if (error) {
      alert('Gagal menyimpan data: ' + error.message);
    } else {
      setName('');
      setBreed('');
      setAge('');
      setMedicalHistory('');
      fetchPets();
    }
    setSubmitting(false);
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc',
      color: '#0f172a'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#ffffff',
        padding: '2rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>🐾</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.75rem', textAlign: 'center' }}>
          Pet Health Tracker
        </h1>

        {!showApp ? (
          // Landing Screen Awal Anda
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Catat rekam medis, riwayat vaksin, dan jadwal perawatan anabul kesayangan Anda secara rapi dan hemat.
            </p>
            <button 
              onClick={() => setShowApp(true)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Mulai Sekarang (Gratis)
            </button>
          </div>
        ) : (
          // Dashboard Form & Data Anabul
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                ➕ Tambah Anabul
              </h2>
              <button 
                onClick={() => setShowApp(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Kembali
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Nama Anabul:</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Contoh: Milo" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Jenis:</label>
                  <select 
                    value={species} 
                    onChange={(e) => setSpecies(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  >
                    <option value="Kucing">Kucing</option>
                    <option value="Anjing">Anjing</option>
                    <option value="Kelinci">Kelinci</option>
                    <option value="Burung">Burung</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Ras/Breed:</label>
                  <input 
                    type="text" 
                    value={breed} 
                    onChange={(e) => setBreed(e.target.value)} 
                    placeholder="Persia / Domestic" 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Umur (Bulan):</label>
                <input 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)} 
                  placeholder="12" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Catatan Medis:</label>
                <textarea 
                  value={medicalHistory} 
                  onChange={(e) => setMedicalHistory(e.target.value)} 
                  placeholder="Riwayat vaksin, alergi, atau penyakit..." 
                  rows="2"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Data Anabul'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }} />

            {/* Daftar Anabul */}
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
                📋 Daftar Rekam Medis
              </h2>

              {loading ? (
                <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>Memuat data...</p>
              ) : pets.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>Belum ada data anabul terdaftar.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pets.map((pet) => (
                    <div key={pet.id} style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      textAlign: 'left'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>
                        {pet.name} <span style={{ fontWeight: 'normal', fontSize: '0.85rem', color: '#64748b' }}>({pet.species} - {pet.breed || 'Umum'})</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                        <strong>Umur:</strong> {pet.age ? `${pet.age} Bulan` : '-'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                        <strong>Catatan:</strong> {pet.medical_history || 'Tidak ada catatan'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

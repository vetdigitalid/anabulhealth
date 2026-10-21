'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PublicVerifyPage() {
  const params = useParams()
  const petId = params.id
  const [pet, setPet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPetData = async () => {
      if (!petId) return
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single()

      if (!error) {
        setPet(data)
      }
      setLoading(false)
    }
    fetchPetData()
  }, [petId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs animate-pulse">Memuat data verifikasi paspor...</div>
  }

  if (!pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center max-w-sm w-full">
          <p className="text-2xl mb-2">❌</p>
          <h1 className="font-bold text-slate-800 text-sm">Paspor Tidak Ditemukan</h1>
          <p className="text-xs text-slate-500 mt-1">Data anabul tidak terdaftar atau QR Code tidak valid.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-xl mx-auto text-slate-800">
      <div className="bg-white p-6 rounded-3xl border-2 border-amber-600 shadow-md space-y-5">
        
        {/* Header Verifikasi */}
        <div className="text-center border-b pb-4">
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300 mb-2">
            ✔ PASPOR TERVERIFIKASI ASLI &amp; AKTIF
          </span>
          <h1 className="text-xl font-black text-amber-900 uppercase">REKAM MEDIS DIGITAL ANABUL</h1>
          <p className="text-[10px] text-slate-400">Sistem Otentikasi Paspor Kesehatan Hewan</p>
        </div>

        {/* Identitas Anabul */}
        <div className="flex gap-4 items-center bg-amber-50/40 p-4 rounded-2xl border border-amber-200">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="w-20 h-20 rounded-xl object-cover border shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-amber-100 flex items-center justify-center text-3xl border">🐾</div>
          )}
          <div className="space-y-1 text-xs">
            <h2 className="text-base font-bold text-slate-900">{pet.name}</h2>
            <p><b>Jenis:</b> {pet.species} {pet.breed ? `(${pet.breed})` : ''}</p>
            <p><b>Umur / Berat:</b> {pet.age ? `${pet.age} Bln` : '-'} | {pet.weight ? `${pet.weight} kg` : '-'}</p>
            <p className="text-blue-600 font-medium"><b>Kontak Pemilik:</b> +{pet.phone_number}</p>
          </div>
        </div>

        {/* Tabel Rekam Medis */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide border-b pb-1">Riwayat Tindakan &amp; Validasi Dokter</h3>
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <p className="font-bold text-emerald-900">💉 Vaksinasi Terakhir: {pet.last_vaccine || 'Belum ada'}</p>
              <p className="text-slate-600">Jenis: <b>{pet.vaccine_type || '-'}</b></p>
              <p className="text-emerald-800 font-medium">🩺 Dokter Pemeriksa: <b>{pet.vaccine_vet_name || '-'}</b></p>
              {pet.vaccine_proof_url && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-emerald-900 mb-1">Stiker / TTD Vet:</p>
                  <img src={pet.vaccine_proof_url} alt="Bukti Vaksin" className="w-20 h-20 object-cover rounded-lg border shadow-sm" />
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
              <p className="font-bold text-indigo-900">💊 Obat Cacing Terakhir: {pet.deworming_date || 'Belum ada'}</p>
              <p className="text-indigo-800 font-medium">🩺 Dokter Pemeriksa: <b>{pet.deworming_vet_name || '-'}</b></p>
              {pet.deworming_proof_url && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-indigo-900 mb-1">Cap / TTD Vet:</p>
                  <img src={pet.deworming_proof_url} alt="Bukti Obat Cacing" className="w-20 h-20 object-cover rounded-lg border shadow-sm" />
                </div>
              )}
            </div>
          </div>

          {pet.medical_history && (
            <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-700">Catatan Diagnosa / Pesan Dokter:</p>
              <p className="text-slate-600 italic">{pet.medical_history}</p>
            </div>
          )}
        </div>

        <div className="text-center pt-2 border-t text-[10px] text-slate-400">
          <p>Halaman ini dikelola secara resmi oleh sistem <b>Paspor Anabul Digital</b>.</p>
        </div>

      </div>
    </main>
  )
}

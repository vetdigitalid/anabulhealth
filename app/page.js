'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [user, setUser] = useState(null)
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingPet, setEditingPet] = useState(null)
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    species: 'Kucing',
    breed: '',
    age: '',
    last_vaccine: '',
    deworming_date: '',
    medical_history: ''
  })

  // Cek Sesi User saat Halaman Di-load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchPets(session.user.id)
      }
      setLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        fetchPets(session.user.id)
      } else {
        setUser(null)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Ambil data anabul milik user
  const fetchPets = async (userId) => {
    setLoading(true)
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pets:', error)
    } else {
      setPets(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return alert('Nama Anabul wajib diisi!')

    const payload = {
      user_id: user.id,
      name: form.name,
      species: form.species,
      breed: form.breed,
      age: form.age ? parseInt(form.age) : null,
      medical_history: form.medical_history,
      last_vaccine: form.last_vaccine || null,
      deworming_date: form.deworming_date || null
    }

    if (editingPet) {
      const { error } = await supabase
        .from('pets')
        .update(payload)
        .eq('id', editingPet.id)

      if (error) {
        alert('Gagal mengupdate data: ' + error.message)
      } else {
        alert('Data anabul berhasil diperbarui!')
        resetForm()
        fetchPets(user.id)
      }
    } else {
      const { error } = await supabase.from('pets').insert([payload])

      if (error) {
        alert('Gagal menyimpan data: ' + error.message)
      } else {
        alert('Data anabul berhasil disimpan!')
        resetForm()
        fetchPets(user.id)
      }
    }
  }

  const handleEdit = (pet) => {
    setEditingPet(pet)
    setForm({
      name: pet.name || '',
      species: pet.species || 'Kucing',
      breed: pet.breed || '',
      age: pet.age || '',
      last_vaccine: pet.last_vaccine || '',
      deworming_date: pet.deworming_date || '',
      medical_history: pet.medical_history || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id, name) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data rekam medis ${name}?`)) {
      const { error } = await supabase.from('pets').delete().eq('id', id)
      if (error) {
        alert('Gagal menghapus data: ' + error.message)
      } else {
        alert('Data berhasil dihapus!')
        fetchPets(user.id)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const resetForm = () => {
    setEditingPet(null)
    setForm({
      name: '',
      species: 'Kucing',
      breed: '',
      age: '',
      last_vaccine: '',
      deworming_date: '',
      medical_history: ''
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredPets = pets.filter((pet) =>
    pet.name.toLowerCase().includes(search.toLowerCase()) ||
    (pet.breed && pet.breed.toLowerCase().includes(search.toLowerCase())) ||
    (pet.medical_history && pet.medical_history.toLowerCase().includes(search.toLowerCase()))
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm animate-pulse">Memeriksa sesi login...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">🐾 Pet Health Tracker</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-all"
            title="Cetak Rekam Medis"
          >
            🖨️ Cetak
          </button>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-medium transition-all"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Form Tambah / Edit Anabul */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 print:hidden">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex justify-between items-center">
          <span>{editingPet ? '✏️ Edit Data Anabul' : '➕ Tambah Anabul'}</span>
          {editingPet && (
            <button
              onClick={resetForm}
              className="text-xs text-rose-500 hover:underline"
            >
              Batal Edit
            </button>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nama Anabul:
            </label>
            <input
              type="text"
              placeholder="Contoh: Milo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jenis:
              </label>
              <select
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white"
              >
                <option value="Kucing">Kucing</option>
                <option value="Anjing">Anjing</option>
                <option value="Kelinci">Kelinci</option>
                <option value="Burung">Burung</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ras/Breed:
              </label>
              <input
                type="text"
                placeholder="Persia / Domestic"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Umur (Bulan):
              </label>
              <input
                type="number"
                placeholder="12"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Vaksin Terakhir:
              </label>
              <input
                type="date"
                value={form.last_vaccine}
                onChange={(e) => setForm({ ...form, last_vaccine: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Obat Cacing:
              </label>
              <input
                type="date"
                value={form.deworming_date}
                onChange={(e) => setForm({ ...form, deworming_date: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan Medis & Keluhan:
            </label>
            <textarea
              rows="3"
              placeholder="Riwayat penyakit, pengobatan, alergi makanan, atau pesan dokter..."
              value={form.medical_history}
              onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            ></textarea>
          </div>

          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl font-medium text-white transition-all shadow-sm ${
              editingPet
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {editingPet ? 'Update Data Anabul' : 'Simpan Data Anabul'}
          </button>
        </form>
      </div>

      {/* Daftar Rekam Medis */}
      <div className="space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <h2 className="text-lg font-bold text-slate-800">
            📋 Rekam Medis Saya ({filteredPets.length})
          </h2>
        </div>

        <input
          type="text"
          placeholder="🔍 Cari nama, ras, atau riwayat medis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white shadow-sm print:hidden"
        />

        {loading ? (
          <p className="text-center text-slate-400 py-8 text-sm">Memuat data...</p>
        ) : filteredPets.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200">
            <p className="text-slate-400 text-sm">
              {search ? 'Tidak ada data yang cocok.' : 'Belum ada data anabul terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPets.map((pet) => (
              <div
                key={pet.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start gap-3"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base">{pet.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                        {pet.species} {pet.breed ? `- ${pet.breed}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        onClick={() => handleEdit(pet)}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded"
                        title="Edit Data"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(pet.id, pet.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Hapus Data"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {pet.age && <p><b>Umur:</b> {pet.age} Bulan</p>}
                    {pet.last_vaccine && (
                      <p className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <b>Vaksin:</b> {pet.last_vaccine}
                      </p>
                    )}
                    {pet.deworming_date && (
                      <p className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        <b>Obat Cacing:</b> {pet.deworming_date}
                      </p>
                    )}
                  </div>

                  {pet.medical_history && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                      <span className="font-semibold text-slate-700 block mb-0.5">Catatan Medis:</span>
                      {pet.medical_history}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingPet, setEditingPet] = useState(null) // Jika sedang mode edit

  const [form, setForm] = useState({
    name: '',
    species: 'Kucing',
    breed: '',
    age: '',
    medical_history: ''
  })

  // Fetch Data Pet dari Supabase
  const fetchPets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pets:', error)
    } else {
      setPets(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPets()
  }, [])

  // Simpan Data Baru atau Update Data
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return alert('Nama Anabul wajib diisi!')

    if (editingPet) {
      // Mode Edit (Update)
      const { error } = await supabase
        .from('pets')
        .update({
          name: form.name,
          species: form.species,
          breed: form.breed,
          age: form.age ? parseInt(form.age) : null,
          medical_history: form.medical_history
        })
        .eq('id', editingPet.id)

      if (error) {
        alert('Gagal mengupdate data: ' + error.message)
      } else {
        alert('Data anabul berhasil diperbarui!')
        resetForm()
        fetchPets()
      }
    } else {
      // Mode Tambah Baru (Insert)
      const { error } = await supabase.from('pets').insert([
        {
          name: form.name,
          species: form.species,
          breed: form.breed,
          age: form.age ? parseInt(form.age) : null,
          medical_history: form.medical_history
        }
      ])

      if (error) {
        alert('Gagal menyimpan data: ' + error.message)
      } else {
        alert('Data anabul berhasil disimpan!')
        resetForm()
        fetchPets()
      }
    }
  }

  // Mulai Edit Data
  const handleEdit = (pet) => {
    setEditingPet(pet)
    setForm({
      name: pet.name || '',
      species: pet.species || 'Kucing',
      breed: pet.breed || '',
      age: pet.age || '',
      medical_history: pet.medical_history || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Hapus Data
  const handleDelete = async (id, name) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data rekam medis ${name}?`)) {
      const { error } = await supabase.from('pets').delete().eq('id', id)
      if (error) {
        alert('Gagal menghapus data: ' + error.message)
      } else {
        alert('Data berhasil dihapus!')
        fetchPets()
      }
    }
  }

  // Batal Edit
  const resetForm = () => {
    setEditingPet(null)
    setForm({
      name: '',
      species: 'Kucing',
      breed: '',
      age: '',
      medical_history: ''
    })
  }

  // Filter Pencarian
  const filteredPets = pets.filter((pet) =>
    pet.name.toLowerCase().includes(search.toLowerCase()) ||
    (pet.breed && pet.breed.toLowerCase().includes(search.toLowerCase())) ||
    (pet.medical_history && pet.medical_history.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
          🐾 Pet Health Tracker
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Rekam Medis Digital & Catatan Kesehatan Anabul
        </p>
      </div>

      {/* Form Tambah / Edit Anabul */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
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
              Catatan Medis:
            </label>
            <textarea
              rows="3"
              placeholder="Riwayat vaksin, alergi, atau penyakit..."
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

      {/* Fitur Pencarian & Daftar Rekam Medis */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            📋 Daftar Rekam Medis ({filteredPets.length})
          </h2>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Cari berdasarkan nama, ras, atau rekam medis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white shadow-sm"
          />
        </div>

        {/* List Data */}
        {loading ? (
          <p className="text-center text-slate-400 py-8 text-sm">Memuat data rekam medis...</p>
        ) : filteredPets.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200">
            <p className="text-slate-400 text-sm">
              {search ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data anabul terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPets.map((pet) => (
              <div
                key={pet.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start gap-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">{pet.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                      {pet.species} {pet.breed ? `- ${pet.breed}` : ''}
                    </span>
                  </div>
                  {pet.age && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Umur:</span> {pet.age} Bulan
                    </p>
                  )}
                  {pet.medical_history && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                      <span className="font-semibold text-slate-700">Catatan:</span> {pet.medical_history}
                    </p>
                  )}
                </div>

                {/* Tombol Aksi: Edit & Hapus */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(pet)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    title="Edit Data"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(pet.id, pet.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Hapus Data"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

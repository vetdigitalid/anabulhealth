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
    phone_number: '',
    life_stage: 'Dewasa',
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

  // Helper konversi format nomor WhatsApp ke 62xxx
  const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1)
    }
    return cleaned
  }

  // Fungsi Pembantu: Menghitung tanggal berikutnya berdasarkan life stage
  const calculateNextDate = (dateString, isPuppyOrKitten = false, type = 'vaccine') => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null

    if (type === 'vaccine') {
      if (isPuppyOrKitten) {
        date.setMonth(date.getMonth() + 1)
      } else {
        date.setFullYear(date.getFullYear() + 1)
      }
    } else if (type === 'deworming') {
      if (isPuppyOrKitten) {
        date.setMonth(date.getMonth() + 1)
      } else {
        date.setMonth(date.getMonth() + 3)
      }
    }

    return date
  }

  // Format tanggal ke tampilan lokal Indonesia
  const formatDateLocale = (dateObj) => {
    if (!dateObj) return ''
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Menghitung sisa hari / status tenggat
  const getDueStatus = (nextDate) => {
    if (!nextDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const target = new Date(nextDate)
    target.setHours(0, 0, 0, 0)

    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: `Jatuh tempo (${Math.abs(diffDays)} hr lalu)`, color: 'bg-rose-100 text-rose-700 border-rose-200' }
    } else if (diffDays === 0) {
      return { label: 'Jadwal Hari Ini!', color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse' }
    } else if (diffDays <= 14) {
      return { label: `${diffDays} hari lagi`, color: 'bg-amber-50 text-amber-700 border-amber-200' }
    } else {
      return { label: `${diffDays} hari lagi`, color: 'bg-slate-100 text-slate-600 border-slate-200' }
    }
  }

  // Handler untuk memperbarui tindakan medis (Mark as Done)
  const handleMarkDone = async (petId, type) => {
    const typeText = type === 'vaccine' ? 'Vaksinasi' : 'Obat Cacing'
    if (!confirm(`Tandai ${typeText} sudah diberikan hari ini?`)) return

    try {
      const res = await fetch('/api/pets/mark-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, type }),
      })

      const result = await res.json()
      if (result.success) {
        alert(`Berhasil memperbarui tanggal ${typeText}!`)
        fetchPets(user.id) // Refresh data anabul dari Supabase
      } else {
        alert(`Gagal: ${result.error}`)
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return alert('Nama Anabul wajib diisi!')
    if (!form.phone_number) return alert('Nomor WhatsApp wajib diisi agar notifikasi pengingat dapat terkirim!')

    // Validasi Freemium: Cek apakah user sudah punya 1 anabul dan tidak sedang edit
    if (!editingPet && pets.length >= 1) {
      alert('⚠️ Batas Kuota Gratis Tercapai!\n\nAkun gratis hanya dapat mendaftarkan 1 Anabul. Silakan upgrade ke akun VIP untuk menambah lebih banyak anabul.')
      return
    }

    const formattedPhone = formatPhoneNumber(form.phone_number)

    const payload = {
      user_id: user.id,
      name: form.name,
      species: form.species,
      breed: form.breed,
      age: form.age ? parseInt(form.age) : null,
      phone_number: formattedPhone,
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
      phone_number: pet.phone_number || '',
      life_stage: pet.age && pet.age <= 6 ? 'Anak (Kitten/Puppy)' : 'Dewasa',
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
      phone_number: '',
      life_stage: 'Dewasa',
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
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">🐾 PASPOR ANABUL</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-all"
            title="Cetak Paspor Anabul"
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

      {/* Banner Himbauan Pengingat WA */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2 print:hidden">
        <span className="text-base">📲</span>
        <p>
          <b>Notifikasi Pengingat Ganda:</b> Masukkan nomor WhatsApp yang aktif agar Anda menerima jadwal vaksinasi & obat cacing via <b>Email</b> dan <b>WhatsApp</b>!
        </p>
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

        {pets.length >= 1 && !editingPet && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ⚠️ Kuota akun gratis Anda sudah terpakai (1/1 Anabul). Hapus data anabul yang ada atau upgrade ke VIP untuk menambah anabul baru.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nama Anabul <span className="text-rose-500">*</span>:
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
              Nomor WhatsApp Penerima Notifikasi <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              placeholder="081215667746 atau 6281215667746"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              required
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Wajib diisi agar notifikasi WhatsApp pengingat otomatis terkirim</p>
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
                onChange={(e) => {
                  const val = e.target.value
                  setForm({
                    ...form,
                    age: val,
                    life_stage: val && parseInt(val) <= 6 ? 'Anak (Kitten/Puppy)' : 'Dewasa'
                  })
                }}
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
              Status Program Vaksin:
            </label>
            <select
              value={form.life_stage}
              onChange={(e) => setForm({ ...form, life_stage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white"
            >
              <option value="Dewasa">Dewasa (Booster Tahunan / 1 Tahun Sekali)</option>
              <option value="Anak (Kitten/Puppy)">Anak / Kitten / Puppy (Seri Vaksin Primer / 1 Bulan Sekali)</option>
            </select>
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
                : pets.length >= 1
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={!editingPet && pets.length >= 1}
          >
            {editingPet ? 'Update Data Anabul' : pets.length >= 1 ? 'Batas Kuota Gratis (1/1 Anabul)' : 'Simpan Data Anabul'}
          </button>
        </form>
      </div>

      {/* Daftar Rekam Medis */}
      <div className="space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <h2 className="text-lg font-bold text-slate-800">
            📋 Paspor Anabul Saya ({filteredPets.length}/1 Kuota Gratis)
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
          <div className="space-y-4">
            {filteredPets.map((pet) => {
              const isYoung = pet.age && pet.age <= 6
              const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine') 
              const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming') 
              
              const vaccineStatus = getDueStatus(nextVaccine)
              const dewormingStatus = getDueStatus(nextDeworming)

              return (
                <div
                  key={pet.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">{pet.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                        {pet.species} {pet.breed ? `- ${pet.breed}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 print:hidden">
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

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {pet.age && <p><b>Umur:</b> {pet.age} Bulan</p>}
                    <span className="text-slate-300">|</span>
                    <p className="text-blue-600 font-medium">
                      Program: {isYoung ? 'Anak (Seri Vaksin 1 Bln)' : 'Dewasa (Booster 1 Thn)'}
                    </p>
                    {pet.phone_number && (
                      <>
                        <span className="text-slate-300">|</span>
                        <p className="text-slate-600">📱 WA: {pet.phone_number}</p>
                      </>
                    )}
                  </div>

                  {/* Kotak Pengingat & Jadwal Vaksin / Obat Cacing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    {/* Vaksin Section */}
                    {pet.last_vaccine ? (
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/80 flex flex-col justify-between">
                        <div>
                          <p className="text-emerald-800 font-semibold mb-1">
                            💉 Vaksin {isYoung ? 'Berikutnya (+1 Bln)' : 'Ulang (+1 Thn)'}
                          </p>
                          <p className="text-slate-600">Terakhir: <b>{pet.last_vaccine}</b></p>
                          <p className="text-emerald-700 font-bold mt-0.5">
                            Jatuh Tempo: {formatDateLocale(nextVaccine)}
                          </p>
                        </div>
                        {vaccineStatus && (
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md border font-medium ${vaccineStatus.color}`}>
                              {vaccineStatus.label}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-400">
                        💉 Belum ada riwayat vaksin
                      </div>
                    )}

                    {/* Obat Cacing Section */}
                    {pet.deworming_date ? (
                      <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100/80 flex flex-col justify-between">
                        <div>
                          <p className="text-indigo-800 font-semibold mb-1">
                            💊 Obat Cacing {isYoung ? '(+1 Bln)' : '(+3 Bln)'}
                          </p>
                          <p className="text-slate-600">Terakhir: <b>{pet.deworming_date}</b></p>
                          <p className="text-indigo-700 font-bold mt-0.5">
                            Jatuh Tempo: {formatDateLocale(nextDeworming)}
                          </p>
                        </div>
                        {dewormingStatus && (
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-md border font-medium ${dewormingStatus.color}`}>
                              {dewormingStatus.label}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-400">
                        💊 Belum ada riwayat obat cacing
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi Cepat: Mark as Done */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 print:hidden">
                    <button
                      onClick={() => handleMarkDone(pet.id, 'vaccine')}
                      className="px-3 py-1.5 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg flex items-center gap-1 transition-all"
                    >
                      ✅ Sudah Vaksin Hari Ini
                    </button>
                    <button
                      onClick={() => handleMarkDone(pet.id, 'deworming')}
                      className="px-3 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold rounded-lg flex items-center gap-1 transition-all"
                    >
                      ✅ Sudah Obat Cacing Hari Ini
                    </button>
                  </div>

                  {pet.medical_history && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                      <span className="font-semibold text-slate-700 block mb-1">Catatan Medis:</span>
                      {pet.medical_history}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

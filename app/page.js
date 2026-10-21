'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default function Home() {
  const [user, setUser] = useState(null)
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingPet, setEditingPet] = useState(null)
  const [isVip, setIsVip] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [supabase, setSupabase] = useState(null)
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    species: 'Kucing',
    breed: '',
    age: '',
    weight: '',
    phone_number: '',
    life_stage: 'Dewasa',
    last_vaccine: '',
    vaccine_type: 'Tricat (F3)',
    deworming_date: '',
    medical_history: '',
    photo_url: ''
  })

  // Inisialisasi Supabase Aman
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      const client = createClient(supabaseUrl, supabaseAnonKey)
      setSupabase(client)

      client.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.push('/login')
        } else {
          setUser(session.user)
          fetchUserData(client, session.user.id)
          fetchPets(client, session.user.id)
        }
        setLoading(false)
      }).catch(() => {
        router.push('/login')
      })

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setUser(session.user)
          fetchUserData(client, session.user.id)
          fetchPets(client, session.user.id)
        } else {
          setUser(null)
          router.push('/login')
        }
      })

      return () => subscription?.unsubscribe()
    } else {
      router.push('/login')
    }
  }, [router])

  const fetchUserData = async (client, userId) => {
    try {
      const { data } = await client
        .from('profiles')
        .select('is_vip')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setIsVip(data.is_vip || false)
      }
    } catch (e) {
      console.error('Error profile fetch:', e)
    }
  }

  const fetchPets = async (client, userId) => {
    try {
      setLoading(true)
      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setPets(data)
      }
    } catch (e) {
      console.error('Error pets fetch:', e)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    if (!supabase || !user) return
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(filePath)

      setForm((prev) => ({ ...prev, photo_url: data.publicUrl }))
      alert('Foto anabul berhasil diunggah!')
    } catch (error) {
      alert('Gagal mengunggah foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1)
    }
    return cleaned
  }

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

  const formatDateLocale = (dateObj) => {
    if (!dateObj) return ''
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

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
        fetchPets(supabase, user.id)
      } else {
        alert(`Gagal: ${result.error}`)
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan')
    }
  }

  const handleUpgradeVip = async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          amount: 29000
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat sesi pembayaran');

      const { token, redirect_url } = data;

      if (window.snap) {
        window.snap.pay(token, {
          onSuccess: function() {
            alert("Pembayaran Berhasil! Akun Anda telah menjadi VIP.");
            window.location.reload();
          },
          onPending: function() {
            alert("Menunggu pembayaran QRIS selesai...");
          },
          onError: function() {
            alert("Pembayaran gagal!");
          }
        });
      } else {
        window.location.href = redirect_url;
      }
    } catch (error) {
      alert("Gagal memproses upgrade VIP: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !user) return
    if (!form.name) return alert('Nama Anabul wajib diisi!')
    if (!form.phone_number) return alert('Nomor WhatsApp wajib diisi!')

    if (!isVip && !editingPet && pets.length >= 1) {
      alert('⚠️ Batas Kuota Gratis Tercapai!\n\nAkun gratis hanya dapat mendaftaran 1 Anabul. Silakan upgrade ke akun VIP untuk menambah lebih banyak anabul.')
      return
    }

    const formattedPhone = formatPhoneNumber(form.phone_number)

    const payload = {
      user_id: user.id,
      name: form.name,
      species: form.species,
      breed: form.breed,
      age: form.age ? parseInt(form.age) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      phone_number: formattedPhone,
      medical_history: form.medical_history,
      last_vaccine: form.last_vaccine || null,
      vaccine_type: form.vaccine_type || null,
      deworming_date: form.deworming_date || null,
      photo_url: form.photo_url || null
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
        fetchPets(supabase, user.id)
      }
    } else {
      const { error } = await supabase.from('pets').insert([payload])

      if (error) {
        alert('Gagal menyimpan data: ' + error.message)
      } else {
        alert('Data anabul berhasil disimpan!')
        resetForm()
        fetchPets(supabase, user.id)
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
      weight: pet.weight || '',
      phone_number: pet.phone_number || '',
      life_stage: pet.age && pet.age <= 6 ? 'Anak (Kitten/Puppy)' : 'Dewasa',
      last_vaccine: pet.last_vaccine || '',
      vaccine_type: pet.vaccine_type || (pet.species === 'Anjing' ? 'Vanguard / Eurican (DHPPI)' : 'Tricat (F3)'),
      deworming_date: pet.deworming_date || '',
      medical_history: pet.medical_history || '',
      photo_url: pet.photo_url || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id, name) => {
    if (!supabase || !user) return
    if (confirm(`Apakah Anda yakin ingin menghapus data rekam medis ${name}?`)) {
      const { error } = await supabase.from('pets').delete().eq('id', id)
      if (error) {
        alert('Gagal menghapus data: ' + error.message)
      } else {
        alert('Data berhasil dihapus!')
        fetchPets(supabase, user.id)
      }
    }
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const resetForm = () => {
    setEditingPet(null)
    setForm({
      name: '',
      species: 'Kucing',
      breed: '',
      age: '',
      weight: '',
      phone_number: '',
      life_stage: 'Dewasa',
      last_vaccine: '',
      vaccine_type: 'Tricat (F3)',
      deworming_date: '',
      medical_history: '',
      photo_url: ''
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredPets = pets.filter((pet) =>
    (pet.name && pet.name.toLowerCase().includes(search.toLowerCase())) ||
    (pet.breed && pet.breed.toLowerCase().includes(search.toLowerCase())) ||
    (pet.medical_history && pet.medical_history.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm animate-pulse">Memuat Paspor Anabul...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header App */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">🐾 PASPOR ANABUL</h1>
            {isVip && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                👑 VIP MEMBER
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          {!isVip && (
            <button
              onClick={handleUpgradeVip}
              className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 font-bold shadow-sm transition-all animate-bounce"
            >
              👑 Upgrade VIP
            </button>
          )}
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

        {!isVip && pets.length >= 1 && !editingPet && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex flex-col gap-2">
            <p>⚠️ Kuota akun gratis Anda sudah terpakai (1/1 Anabul). Hapus data anabul yang ada atau upgrade ke VIP untuk menambah anabul baru.</p>
            <button
              onClick={handleUpgradeVip}
              className="self-start px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
            >
              👑 Upgrade VIP Sekarang (Rp 29rb)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Foto Anabul:
            </label>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Preview"
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl border border-dashed border-slate-300">
                  📷
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
            </div>
            {uploading && <p className="text-[10px] text-blue-500 mt-1 animate-pulse">Mengunggah foto...</p>}
          </div>

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
                onChange={(e) => {
                  const newSpecies = e.target.value
                  setForm({
                    ...form,
                    species: newSpecies,
                    vaccine_type: newSpecies === 'Anjing' ? 'Vanguard / Eurican (DHPPI)' : 'Tricat (F3)'
                  })
                }}
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

          <div className="grid grid-cols-2 gap-3">
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
                ⚖️ Berat Badan (Kg):
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="3.5"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Vaksin Terakhir:
              </label>
              <input
                type="date"
                value={form.last_vaccine}
                onChange={(e) => setForm({ ...form, last_vaccine: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-xs mb-2"
              />
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Jenis Vaksin:
              </label>
              <select
                value={form.vaccine_type}
                onChange={(e) => setForm({ ...form, vaccine_type: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
              >
                {form.species === 'Kucing' ? (
                  <>
                    <option value="Tricat (F3)">Tricat (F3)</option>
                    <option value="Tetracat (F4)">Tetracat (F4)</option>
                    <option value="Rabies">Rabies</option>
                    <option value="Felocell / Lainnya">Felocell / Lainnya</option>
                  </>
                ) : form.species === 'Anjing' ? (
                  <>
                    <option value="Vanguard / Eurican (DHPPI)">Vanguard / Eurican (DHPPI)</option>
                    <option value="Rabies">Rabies</option>
                    <option value="Parvo">Parvo</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="Vaksin Standar">Vaksin Standar</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Obat Cacing Terakhir:
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
                : !isVip && pets.length >= 1
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={(!isVip && !editingPet && pets.length >= 1) || uploading}
          >
            {editingPet ? 'Update Data Anabul' : !isVip && pets.length >= 1 ? 'Batas Kuota Gratis (1/1 Anabul)' : 'Simpan Data Anabul'}
          </button>
        </form>
      </div>

      {/* Daftar Rekam Medis & Kartu Paspor */}
      <div className="space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <h2 className="text-lg font-bold text-slate-800">
            📋 Paspor Anabul Saya ({filteredPets.length} {isVip ? '/ Unlimited VIP' : '/ 1 Kuota Gratis'})
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
          <div className="space-y-8">
            {filteredPets.map((pet) => {
              const isYoung = pet.age && pet.age <= 6
              const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine') 
              const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming') 
              
              const vaccineStatus = getDueStatus(nextVaccine)
              const dewormingStatus = getDueStatus(nextDeworming)

              return (
                <div key={pet.id} className="space-y-4">
                  
                  {/* KARTU PASPOR DIGITAL ESTETIK (Desain VIP Gold) */}
                  <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 shadow-2xl border-2 border-amber-500/40">
                    
                    <div className="absolute -right-8 -bottom-8 opacity-5 text-9xl pointer-events-none select-none">
                      🐾
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
                          🐾
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm md:text-base tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent uppercase">
                            OFFICIAL PET PASSPORT
                          </h3>
                          <p className="text-[10px] text-amber-200/70 tracking-widest uppercase">Republik Anabul • Medical Identity</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30 tracking-wider">
                          #PASSP-{pet.id ? pet.id.slice(0, 6).toUpperCase() : 'VIP'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 py-5 items-center">
                      <div className="col-span-4 flex justify-center">
                        <div className="relative">
                          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-slate-900 flex items-center justify-center">
                            {pet.photo_url ? (
                              <img
                                src={pet.photo_url}
                                alt={pet.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-4xl">
                                {pet.species === 'Kucing' ? '🐱' : pet.species === 'Anjing' ? '🐶' : '🐾'}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1 rounded-full text-xs shadow-lg border border-slate-950">
                            ✓
                          </div>
                        </div>
                      </div>

                      <div className="col-span-8 space-y-2 text-xs">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Nama Anabul</p>
                          <h2 className="text-2xl font-black text-white tracking-wide leading-tight truncate">
                            {pet.name}
                          </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Jenis / Ras</p>
                            <p className="font-semibold text-amber-200 truncate">
                              {pet.species} {pet.breed ? `(${pet.breed})` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Berat & Umur</p>
                            <p className="font-semibold text-white">
                              {pet.weight ? `${pet.weight} kg` : '-'} • {pet.age ? `${pet.age} Bln` : '-'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Vaksinasi Terakhir</p>
                          <p className="font-medium text-emerald-400">
                            {pet.last_vaccine ? `${pet.last_vaccine} (${pet.vaccine_type || 'Standar'})` : 'Belum Ada Data'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] mb-3">
                      <div>
                        <p className="text-slate-400 text-[10px]">🗓️ Jadwal Vaksinasi Ulang:</p>
                        <p className="font-bold text-emerald-300">
                          {nextVaccine ? formatDateLocale(nextVaccine) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">💊 Jadwal Obat Cacing:</p>
                        <p className="font-bold text-indigo-300">
                          {nextDeworming ? formatDateLocale(nextDeworming) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-white/10 text-[9px] text-slate-400">
                      <div>
                        <p className="text-amber-300 font-bold tracking-wider">VETERINARY HEALTH SERVICE</p>
                        <p>Dokter Hewan Penanggung Jawab:</p>
                        <p className="text-white font-semibold">drh. Nur Rohman Najib</p>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-2 py-0.5 rounded border border-amber-400/40 text-amber-300 font-mono text-[8px] uppercase tracking-widest">
                          AUTHENTIC DIGITAL CARD
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Detail Rekam Medis */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700">Detail Rekam Medis:</p>
                      <div className="flex items-center gap-1 print:hidden">
                        <button
                          onClick={() => handleEdit(pet)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(pet.id, pet.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      {pet.last_vaccine ? (
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/80 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <p className="text-emerald-800 font-semibold mb-1">
                                💉 Vaksin Ulang
                              </p>
                              {pet.vaccine_type && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                                  {pet.vaccine_type}
                                </span>
                              )}
                            </div>
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

                      {pet.deworming_date ? (
                        <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100/80 flex flex-col justify-between">
                          <div>
                            <p className="text-indigo-800 font-semibold mb-1">
                              💊 Obat Cacing Ulang
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

                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

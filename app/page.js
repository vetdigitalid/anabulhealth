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
  const [isVip, setIsVip] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // State Modal Bukti & TTD Vet Dinamis
  const [proofModal, setProofModal] = useState({ open: false, petId: null, type: null })
  const [vetName, setVetName] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submittingProof, setSubmittingProof] = useState(false)

  // State Modal Panduan Vaksinasi
  const [showGuideModal, setShowGuideModal] = useState(false)

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

  // Cek Sesi User & Status VIP
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchUserData(session.user.id)
        fetchPets(session.user.id)
      }
      setLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        fetchUserData(session.user.id)
        fetchPets(session.user.id)
      } else {
        setUser(null)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchUserData = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_vip')
      .eq('id', userId)
      .single()

    if (data) {
      setIsVip(data.is_vip || false)
    }
  }

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

  const handlePhotoUpload = async (e) => {
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

  // Buka Modal Unggah Bukti TTD
  const openMarkDoneModal = (petId, type) => {
    setProofModal({ open: true, petId, type })
    setProofFile(null)
    setVetName('')
  }

  // Simpan Status Selesai + Foto Bukti TTD & Nama Dokter Hewan Per Tindakan
  const handleConfirmMarkDone = async () => {
    const { petId, type } = proofModal
    const typeText = type === 'vaccine' ? 'Vaksinasi' : 'Obat Cacing'

    if (!proofFile) {
      alert('⚠️ Wajib mengunggah foto stiker/cap/tanda tangan Dokter Hewan sebagai syarat verifikasi!')
      return
    }

    if (!vetName.trim()) {
      alert('⚠️ Wajib mengisi Nama Dokter Hewan yang memeriksa!')
      return
    }

    setSubmittingProof(true)

    try {
      let proofUrl = null
      const fileExt = proofFile.name.split('.').pop()
      const fileName = `proof-${type}-${petId}-${Date.now()}.${fileExt}`
      
      const { error: uploadErr } = await supabase.storage
        .from('pet-photos')
        .upload(fileName, proofFile)

      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName)
      proofUrl = data.publicUrl

      const todayStr = new Date().toISOString().split('T')[0]
      
      const updateData = type === 'vaccine' 
        ? { last_vaccine: todayStr, vaccine_proof_url: proofUrl, vaccine_vet_name: vetName }
        : { deworming_date: todayStr, deworming_proof_url: proofUrl, deworming_vet_name: vetName }

      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', petId)

      if (!error) {
        alert(`Berhasil diverifikasi! Data ${typeText} oleh ${vetName} telah disimpan.`)
        setProofModal({ open: false, petId: null, type: null })
        fetchPets(user.id)
      } else {
        alert(`Gagal: ${error.message}`)
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan/unggahan: ' + err.message)
    } finally {
      setSubmittingProof(false)
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
          onSuccess: function(result) {
            alert("Pembayaran Berhasil! Akun Anda telah menjadi VIP.");
            window.location.reload();
          },
          onPending: function(result) {
            alert("Menunggu pembayaran QRIS selesai...");
          },
          onError: function(result) {
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
    if (!form.name) return alert('Nama Anabul wajib diisi!')
    if (!form.phone_number) return alert('Nomor WhatsApp wajib diisi agar notifikasi pengingat dapat terkirim!')

    if (!isVip && !editingPet && pets.length >= 1) {
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
      {/* CSS Khusus Pengaturan Cetak Buku Paspor Premium */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .passport-book-container {
            display: block !important;
            page-break-after: always;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">🐾 PASPOR ANABUL</h1>
            {isVip && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                👑 VIP MEMBER
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 break-all">{user.email}</p>
        </div>
        <div className="flex gap-1.5 items-center flex-wrap w-full sm:w-auto justify-end">
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
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-all border border-blue-200 shadow-sm"
            title="Cetak Paspor Anabul"
          >
            🖨️ Cetak Buku Paspor
          </button>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-medium transition-all"
          >
            🚪 Keluar
          </button>
        </div>
      </div>

      {/* Banner Himbauan Pengingat WA & Tombol Panduan Vaksin */}
      <div className="mb-6 space-y-2 print:hidden">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📲</span>
            <p>
              <b>Notifikasi Pengingat Ganda:</b> Masukkan nomor WhatsApp yang aktif agar Anda menerima jadwal via <b>Email</b> &amp; <b>WhatsApp</b>!
            </p>
          </div>
        </div>

        {/* Tombol Panduan Program Vaksinasi */}
        <button
          onClick={() => setShowGuideModal(true)}
          className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <span>📖 Program Vaksinasi Anabul (Panduan &amp; Aturan)</span>
        </button>
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
          {/* Upload Foto */}
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

          {/* Umur & Berat Badan */}
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

          {/* Tanggal & Jenis Vaksin + Obat Cacing */}
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

      {/* Daftar Rekam Medis (Tampilan Layar HP/Web) */}
      <div className="space-y-4 print:hidden">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            📋 Paspor Anabul Saya ({filteredPets.length} {isVip ? '/ Unlimited VIP' : '/ 1 Kuota Gratis'})
          </h2>
        </div>

        <input
          type="text"
          placeholder="🔍 Cari nama, ras, atau riwayat medis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white shadow-sm"
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
                    <div className="flex items-center gap-3">
                      {pet.photo_url ? (
                        <img
                          src={pet.photo_url}
                          alt={pet.name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl text-blue-600 font-bold border border-blue-100">
                          {pet.species === 'Kucing' ? '🐱' : pet.species === 'Anjing' ? '🐶' : '🐾'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{pet.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium inline-block mt-0.5">
                          {pet.species} {pet.breed ? `- ${pet.breed}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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

                  {/* Informasi Ringkas Umur, Berat, dan WhatsApp */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {pet.age && <p><b>Umur:</b> {pet.age} Bln</p>}
                    {pet.weight && (
                      <>
                        <span className="text-slate-300">|</span>
                        <p className="text-amber-700 font-medium">⚖️ <b>Berat:</b> {pet.weight} kg</p>
                      </>
                    )}
                    <span className="text-slate-300">|</span>
                    <p className="text-blue-600 font-medium">
                      Program: {isYoung ? 'Anak (Seri Vaksin 1 Bln)' : 'Dewasa (Booster 1 Thn)'}
                    </p>
                  </div>

                  {/* Kotak Pengingat & Jenis Vaksin */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    {pet.last_vaccine ? (
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/80 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <p className="text-emerald-800 font-semibold mb-1">
                              💉 Vaksin {isYoung ? 'Berikutnya (+1 Bln)' : 'Ulang (+1 Thn)'}
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
                          {pet.vaccine_vet_name && (
                            <p className="text-[10px] text-emerald-900 font-medium mt-1">🩺 Pemeriksa: <b>{pet.vaccine_vet_name}</b></p>
                          )}
                        </div>

                        {pet.vaccine_proof_url && (
                          <div className="mt-2">
                            <p className="text-[10px] font-semibold text-emerald-800 mb-1">🏷️ Bukti Stiker / TTD Vet:</p>
                            <img src={pet.vaccine_proof_url} alt="Bukti Vaksin" className="w-16 h-16 object-cover rounded-lg border border-emerald-200 shadow-sm" />
                          </div>
                        )}

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
                            💊 Obat Cacing {isYoung ? '(+1 Bln)' : '(+3 Bln)'}
                          </p>
                          <p className="text-slate-600">Terakhir: <b>{pet.deworming_date}</b></p>
                          <p className="text-indigo-700 font-bold mt-0.5">
                            Jatuh Tempo: {formatDateLocale(nextDeworming)}
                          </p>
                          {pet.deworming_vet_name && (
                            <p className="text-[10px] text-indigo-900 font-medium mt-1">🩺 Pemeriksa: <b>{pet.deworming_vet_name}</b></p>
                          )}
                        </div>

                        {pet.deworming_proof_url && (
                          <div className="mt-2">
                            <p className="text-[10px] font-semibold text-indigo-800 mb-1">🏷️ Bukti Cap / TTD Vet:</p>
                            <img src={pet.deworming_proof_url} alt="Bukti Obat Cacing" className="w-16 h-16 object-cover rounded-lg border border-indigo-200 shadow-sm" />
                          </div>
                        )}

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

                  {/* Tombol Mark as Done dengan Bukti TTD & Nama Dokter Hewan */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openMarkDoneModal(pet.id, 'vaccine')}
                      className="px-3 py-1.5 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg flex items-center gap-1 transition-all"
                    >
                      ✅ Verifikasi Vaksin Hari Ini
                    </button>
                    <button
                      onClick={() => openMarkDoneModal(pet.id, 'deworming')}
                      className="px-3 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold rounded-lg flex items-center gap-1 transition-all"
                    >
                      ✅ Verifikasi Obat Cacing Hari Ini
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

      {/* ======================================================== */}
      {/* TAMPILAN BUKU PASPOR FISIK SAAT DICETAK / PDF */}
      {/* ======================================================== */}
      <div className="hidden print:block passport-book-container">
        {filteredPets.map((pet) => {
          const isYoung = pet.age && pet.age <= 6
          const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
          const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

          return (
            <div key={`print-${pet.id}`} className="w-full max-w-2xl mx-auto p-8 border-4 border-amber-600 bg-amber-50/20 rounded-3xl my-4 text-slate-800 relative">
              
              {/* Cover Paspor Header */}
              <div className="text-center border-b-2 border-amber-600 pb-4 mb-6">
                <div className="text-3xl mb-1">🐾</div>
                <h1 className="text-2xl font-black tracking-widest text-amber-900 uppercase">PASPOR KESEHATAN ANABUL</h1>
                <p className="text-xs font-bold text-amber-800 tracking-wider">OFFICIAL PET MEDICAL PASSPORT & VACCINATION RECORD</p>
                <p className="text-[10px] text-slate-500 mt-1">NO. REGISTRASI: PASPOR-ANABUL-2026-{pet.id.toString().substring(0,6).toUpperCase()}</p>
              </div>

              {/* Data Identitas Anabul & Foto */}
              <div className="flex gap-6 items-center bg-white p-4 rounded-2xl border border-amber-200 shadow-sm mb-6">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-28 h-28 rounded-2xl object-cover border-2 border-amber-500 shadow-md" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl border-2 border-amber-300">
                    {pet.species === 'Kucing' ? '🐱' : '🐶'}
                  </div>
                )}
                <div className="space-y-1 text-xs flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <p><b>Nama Anabul:</b> <span className="text-sm font-bold text-slate-900">{pet.name}</span></p>
                    <p><b>Jenis Hewan:</b> {pet.species}</p>
                    <p><b>Ras / Breed:</b> {pet.breed || '-'}</p>
                    <p><b>Umur:</b> {pet.age ? `${pet.age} Bulan` : '-'}</p>
                    <p><b>Berat Badan:</b> {pet.weight ? `${pet.weight} kg` : '-'}</p>
                    <p><b>WhatsApp Pemilik:</b> +{pet.phone_number}</p>
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <p className="text-[10px] text-slate-500">Pemilik Akun Terdaftar: {user.email}</p>
                  </div>
                </div>
              </div>

              {/* Tabel Catatan Stiker Vaksinasi & Obat Cacing DENGAN KOLOM DOKTER HEWAN */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 border-b border-amber-400 pb-1">
                  📋 LEMBAR VALIDASI VAKSINASI & MEDICINE RECORD
                </h3>

                <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                  <thead>
                    <tr className="bg-amber-600 text-white text-[10px]">
                      <th className="p-2 border">Penanganan</th>
                      <th className="p-2 border">Jenis Vaksin / Obat</th>
                      <th className="p-2 border">Tanggal</th>
                      <th className="p-2 border">Jatuh Tempo</th>
                      <th className="p-2 border">Dokter Hewan</th>
                      <th className="p-2 border text-center">Stiker / Cap / TTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border font-semibold">💉 Vaksinasi</td>
                      <td className="p-2 border">{pet.vaccine_type || 'Vaksin Standar'}</td>
                      <td className="p-2 border">{pet.last_vaccine || '-'}</td>
                      <td className="p-2 border font-bold text-emerald-700">{formatDateLocale(nextVaccine) || '-'}</td>
                      <td className="p-2 border font-bold text-slate-800">
                        {pet.vaccine_vet_name || '-'}
                      </td>
                      <td className="p-2 border text-center">
                        {pet.vaccine_proof_url ? (
                          <img src={pet.vaccine_proof_url} alt="Stiker/TTD Vaksin" className="w-10 h-10 object-cover rounded mx-auto border" />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">[ Belum Ada TTD ]</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-semibold">💊 Obat Cacing</td>
                      <td className="p-2 border">Deworming Routine</td>
                      <td className="p-2 border">{pet.deworming_date || '-'}</td>
                      <td className="p-2 border font-bold text-indigo-700">{formatDateLocale(nextDeworming) || '-'}</td>
                      <td className="p-2 border font-bold text-slate-800">
                        {pet.deworming_vet_name || '-'}
                      </td>
                      <td className="p-2 border text-center">
                        {pet.deworming_proof_url ? (
                          <img src={pet.deworming_proof_url} alt="Cap/TTD Obat Cacing" className="w-10 h-10 object-cover rounded mx-auto border" />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">[ Belum Ada TTD ]</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {pet.medical_history && (
                  <div className="p-3 bg-white rounded-xl border text-xs">
                    <p className="font-bold text-slate-700 mb-1">Catatan Diagnosa / Pesan Dokter Hewan:</p>
                    <p className="text-slate-600 italic">{pet.medical_history}</p>
                  </div>
                )}
              </div>

              {/* QR Code Verifikasi Dinamis Kanan Bawah */}
              <div className="flex justify-between items-end pt-6 mt-4 border-t border-amber-300">
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>✔ Terverifikasi Otomatis oleh Sistem Paspor Anabul Digital</p>
                  <p>✔ Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-semibold text-amber-900 mt-1">Scan QR Code untuk verifikasi keaslian rekam medis.</p>
                </div>
                <div className="text-center bg-white p-2 rounded-xl border border-amber-400 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=https://televet.web.id/verify/${pet.id}`} 
                    alt="QR Verifikasi Paspor" 
                    className="w-20 h-20 mx-auto"
                  />
                  <p className="text-[8px] font-bold text-slate-800 mt-1 uppercase tracking-wider">Scan Verifikasi</p>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Modal Popup Verifikasi + Mandatory Unggah Foto TTD Dokter Hewan */}
      {proofModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">
                🩺 Verifikasi Dokter Hewan ({proofModal.type === 'vaccine' ? 'Vaksinasi' : 'Obat Cacing'})
              </h3>
              <button
                onClick={() => setProofModal({ open: false, petId: null, type: null })}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Dokter Hewan Pemeriksa <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: drh. Ahmad Fauzi / drh. Nur Rohman Najib"
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unggah Foto Tanda Tangan / Stiker Cap Vet <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                  required
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  *Wajib mengunggah foto stiker botol vaksin, stempel klinik, atau foto tanda tangan Dokter Hewan sebagai syarat keabsahan.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setProofModal({ open: false, petId: null, type: null })}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg font-medium"
                disabled={submittingProof}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmMarkDone}
                disabled={submittingProof || !proofFile || !vetName.trim()}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                  !proofFile || !vetName.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {submittingProof ? 'Memproses...' : '✅ Simpan & Verifikasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Panduan Program Vaksinasi & Aturan Klinik */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <h3 className="font-bold text-slate-800 text-base">Panduan Program Vaksinasi Anabul</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 max-h-[65vh] overflow-y-auto pr-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="font-bold text-amber-900 mb-1">⚠️ Syarat Penting Sebelum Vaksinasi:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800">
                  <li>Anabul dalam kondisi sehat (tidak demam, batuk, pilek, atau diare).</li>
                  <li>Nafsu makan &amp; minum baik serta aktif bergerak.</li>
                  <li>Sudah diberikan obat cacing minimal 1–2 minggu sebelum vaksin.</li>
                  <li>Bebas dari parasit berat (kutu/jamur berat).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  🐱 Program Vaksinasi Kucing
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div>
                    <p className="font-semibold text-blue-700">1. Tricat (F3) - Minimal Usia 8–10 Minggu</p>
                    <p className="text-slate-600">Melindungi dari Panleukopenia, Calicivirus, dan Rhinotracheitis (Feline Herpesvirus).</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">2. Tetracat (F4) - Seri Lanjutan (Usia 12–14 Minggu)</p>
                    <p className="text-slate-600">Melindungi dari 3 penyakit F3 ditambah serangan bakteri Chlamydia.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">3. Vaksin Rabies - Minimal Usia 12–16 Minggu</p>
                    <p className="text-slate-600">Wajib untuk pencegahan penyakit Rabies zoonosis.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700">4. Booster Tahunan (Kucing Dewasa &gt; 6 Bln)</p>
                    <p className="text-slate-600">Vaksinasi ulangan dilakukan <b>1 tahun sekali</b> untuk menjaga daya tahan tubuh tetap optimal.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  🐶 Program Vaksinasi Anjing
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div>
                    <p className="font-semibold text-blue-700">1. Parvo / DHPPI (Vanguard / Eurican) - Minimal Usia 6–8 Minggu</p>
                    <p className="text-slate-600">Melindungi dari Distemper, Hepatitis, Parvovirus, dan Parainfluenza.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">2. Vaksin Kombinasi Kompleks + Rabies - Usia 12–16 Minggu</p>
                    <p className="text-slate-600">Mencakup perlindungan terhadap Leptospirosis dan Virus Rabies.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700">3. Booster Tahunan (Anjing Dewasa &gt; 6 Bln)</p>
                    <p className="text-slate-600">Vaksinasi ulangan booster kombinasi dilakukan <b>1 tahun sekali</b>.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="font-bold text-indigo-900 mb-1">⚙️ Aturan Perhitungan Sistem:</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-800">
                  <li><b>Anak (&le; 6 Bulan):</b> Interval jadwal vaksinasi dikalkulasi otomatis <b>1 bulan sekali</b> (Seri Vaksin Primer).</li>
                  <li><b>Dewasa (&gt; 6 Bulan):</b> Interval jadwal vaksinasi dikalkulasi otomatis <b>1 tahun sekali</b> (Booster Tahunan).</li>
                  <li><b>Obat Cacing:</b> Anak 1 bulan sekali, Dewasa 3 bulan sekali.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                Paham &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

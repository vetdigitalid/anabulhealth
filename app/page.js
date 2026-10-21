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
      return { label: `Jatuh tempo (${Math.abs(diffDays)} hr lalu)`, color: 'bg-rose-50 text-rose-700 border-rose-200' }
    } else if (diffDays === 0) {
      return { label: 'Jadwal Hari Ini!', color: 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse' }
    } else if (diffDays <= 14) {
      return { label: `${diffDays} hari lagi`, color: 'bg-amber-50/80 text-amber-700 border-amber-200' }
    } else {
      return { label: `${diffDays} hari lagi`, color: 'bg-slate-50 text-slate-600 border-slate-200' }
    }
  }

  const openMarkDoneModal = (petId, type) => {
    setProofModal({ open: true, petId, type })
    setProofFile(null)
    setVetName('')
  }

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
    <main className="min-h-screen bg-slate-100/70 p-4 md:p-8 max-w-2xl mx-auto font-sans">
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

      {/* Header Elegan dengan Logo Resmi */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm mb-5 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/icon-192.png.jpg" 
              alt="Logo Paspor Anabul" 
              className="w-12 h-12 object-contain rounded-xl shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">PASPOR ANABUL</h1>
                {isVip && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                    👑 VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {!isVip && (
              <button
                onClick={handleUpgradeVip}
                className="text-xs px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 font-bold shadow-sm shadow-amber-500/20 transition-all flex items-center gap-1"
              >
                👑 Upgrade VIP
              </button>
            )}
            <button
              onClick={handlePrint}
              className="text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold transition-all flex items-center gap-1"
              title="Cetak Buku Paspor"
            >
              🖨️ Cetak
            </button>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 font-semibold transition-all"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Banner & Tombol Panduan */}
      <div className="mb-6 space-y-3 print:hidden">
        <div className="p-4 bg-sky-50/80 border border-sky-100 rounded-2xl text-xs text-sky-900 flex items-start gap-3 shadow-sm">
          <span className="text-lg mt-0.5">📲</span>
          <div className="leading-relaxed">
            <span className="font-bold block mb-0.5">Notifikasi Pengingat Aktif</span>
            Pastikan nomor WhatsApp terisi dengan benar agar sistem mengirimkan pengingat otomatis via <b>Email &amp; WhatsApp</b>.
          </div>
        </div>

        <button
          onClick={() => setShowGuideModal(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-blue-500/15 flex items-center justify-center gap-2 transition-all"
        >
          <span>📖 Buka Panduan &amp; Aturan Program Vaksinasi</span>
        </button>
      </div>

      {/* Form Tambah / Edit Anabul Modern */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 mb-8 print:hidden">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>{editingPet ? '✏️ Edit Data Anabul' : '➕ Tambah Anabul Baru'}</span>
          </h2>
          {editingPet && (
            <button
              onClick={resetForm}
              className="text-xs text-rose-500 font-semibold hover:underline"
            >
              Batalkan Edit
            </button>
          )}
        </div>

        {!isVip && pets.length >= 1 && !editingPet && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200/70 rounded-2xl text-xs text-amber-900 flex flex-col gap-2.5">
            <p className="leading-relaxed">⚠️ Kuota akun gratis Anda telah terpakai (1/1 Anabul). Upgrade ke VIP untuk menikmati akses tanpa batas.</p>
            <button
              onClick={handleUpgradeVip}
              className="self-start px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm shadow-amber-600/20 transition-all"
            >
              👑 Upgrade VIP (Rp 29.000)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Foto */}
          <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Foto Profil Anabul:
            </label>
            <div className="flex items-center gap-4">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-slate-300 text-2xl border border-dashed border-slate-200 shadow-sm">
                  📷
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            {uploading && <p className="text-[10px] text-blue-500 mt-2 animate-pulse font-medium">Mengunggah foto...</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Anabul <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              placeholder="Contoh: Milo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Hewan:
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
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              >
                <option value="Kucing">Kucing</option>
                <option value="Anjing">Anjing</option>
                <option value="Kelinci">Kelinci</option>
                <option value="Burung">Burung</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ras / Breed:
              </label>
              <input
                type="text"
                placeholder="Persia / Domestik"
                value={form.breed}
                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nomor WhatsApp Pemilik <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              placeholder="081234567890"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">Format bebas (08... atau 628...). Otomatis tersinkronisasi untuk pengingat WA.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ⚖️ Berat Badan (Kg):
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="3.5"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vaksin Terakhir:
              </label>
              <input
                type="date"
                value={form.last_vaccine}
                onChange={(e) => setForm({ ...form, last_vaccine: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 mb-2"
              />
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jenis Vaksin:
              </label>
              <select
                value={form.vaccine_type}
                onChange={(e) => setForm({ ...form, vaccine_type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Obat Cacing Terakhir:
              </label>
              <input
                type="date"
                value={form.deworming_date}
                onChange={(e) => setForm({ ...form, deworming_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Program Vaksin:
            </label>
            <select
              value={form.life_stage}
              onChange={(e) => setForm({ ...form, life_stage: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
            >
              <option value="Dewasa">Dewasa (Booster Tahunan / 1 Tahun Sekali)</option>
              <option value="Anak (Kitten/Puppy)">Kitten/Puppy (Seri Vaksin Primer / 1 Bulan Sekali)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan Medis &amp; Keluhan:
            </label>
            <textarea
              rows="3"
              placeholder="Riwayat penyakit, alergi, atau pesan khusus dari dokter..."
              value={form.medical_history}
              onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm transition-all"
            ></textarea>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-sm ${
              editingPet
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                : !isVip && pets.length >= 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
            disabled={(!isVip && !editingPet && pets.length >= 1) || uploading}
          >
            {editingPet ? '💾 Simpan Perubahan Data' : !isVip && pets.length >= 1 ? '🔒 Batas Kuota Gratis Tercapai' : '➕ Simpan Data Anabul'}
          </button>
        </form>
      </div>

      {/* Daftar Rekam Medis (Tampilan Layar HP/Web) */}
      <div className="space-y-4 print:hidden">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-base font-extrabold text-slate-800">
            📋 Paspor Anabul Saya <span className="text-xs font-normal text-slate-400">({filteredPets.length})</span>
          </h2>
        </div>

        <input
          type="text"
          placeholder="🔍 Cari berdasarkan nama, ras, atau riwayat medis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs shadow-sm transition-all"
        />

        {loading ? (
          <p className="text-center text-slate-400 py-10 text-xs animate-pulse">Memuat data rekam medis...</p>
        ) : filteredPets.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-slate-400 text-xs">
              {search ? 'Tidak ada data anabul yang cocok dengan pencarian.' : 'Belum ada data anabul yang terdaftar.'}
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
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      {pet.photo_url ? (
                        <img
                          src={pet.photo_url}
                          alt={pet.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-xl text-amber-600 font-bold border border-amber-100">
                          {pet.species === 'Kucing' ? '🐱' : pet.species === 'Anjing' ? '🐶' : '🐾'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base leading-snug">{pet.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium inline-block mt-0.5">
                          {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button
                        onClick={() => handleEdit(pet)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg transition-all"
                        title="Edit Data"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(pet.id, pet.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                        title="Hapus Data"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Informasi Ringkas Umur, Berat, Program */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-2xl text-center text-[11px] text-slate-600 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Umur</span>
                      <strong className="text-slate-800">{pet.age ? `${pet.age} Bln` : '-'}</strong>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Berat Badan</span>
                      <strong className="text-amber-700">{pet.weight ? `${pet.weight} kg` : '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Program</span>
                      <strong className="text-blue-600">{isYoung ? 'Kitten' : 'Dewasa'}</strong>
                    </div>
                  </div>

                  {/* Kotak Pengingat Vaksin & Obat Cacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {pet.last_vaccine ? (
                      <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-emerald-900 font-bold text-[11px]">💉 Vaksin Terakhir</span>
                            {pet.vaccine_type && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded">
                                {pet.vaccine_type}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px]">Tgl: <b>{pet.last_vaccine}</b></p>
                          <p className="text-emerald-700 font-bold text-[11px] mt-0.5">
                            Jatuh Tempo: {formatDateLocale(nextVaccine)}
                          </p>
                          {pet.vaccine_vet_name && (
                            <p className="text-[10px] text-emerald-900 mt-1">🩺 <b>{pet.vaccine_vet_name}</b></p>
                          )}
                        </div>

                        {pet.vaccine_proof_url && (
                          <div className="pt-2 border-t border-emerald-100/60 flex items-center gap-2">
                            <img src={pet.vaccine_proof_url} alt="Bukti Vaksin" className="w-10 h-10 object-cover rounded-xl border border-emerald-200 shadow-sm" />
                            <span className="text-[10px] text-emerald-800 font-medium">Stiker/TTD Terunggah</span>
                          </div>
                        )}

                        {vaccineStatus && (
                          <div>
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-lg border font-medium ${vaccineStatus.color}`}>
                              {vaccineStatus.label}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-slate-400 flex items-center justify-center text-center text-xs italic">
                        💉 Belum ada riwayat vaksin
                      </div>
                    )}

                    {pet.deworming_date ? (
                      <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-indigo-900 font-bold text-[11px] block mb-1">💊 Obat Cacing Terakhir</span>
                          <p className="text-slate-500 text-[11px]">Tgl: <b>{pet.deworming_date}</b></p>
                          <p className="text-indigo-700 font-bold text-[11px] mt-0.5">
                            Jatuh Tempo: {formatDateLocale(nextDeworming)}
                          </p>
                          {pet.deworming_vet_name && (
                            <p className="text-[10px] text-indigo-900 mt-1">🩺 <b>{pet.deworming_vet_name}</b></p>
                          )}
                        </div>

                        {pet.deworming_proof_url && (
                          <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-2">
                            <img src={pet.deworming_proof_url} alt="Bukti Obat Cacing" className="w-10 h-10 object-cover rounded-xl border border-indigo-200 shadow-sm" />
                            <span className="text-[10px] text-indigo-800 font-medium">Stempel/TTD Terunggah</span>
                          </div>
                        )}

                        {dewormingStatus && (
                          <div>
                            <span className={`inline-block px-2 py-0.5 text-[10px] rounded-lg border font-medium ${dewormingStatus.color}`}>
                              {dewormingStatus.label}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-slate-400 flex items-center justify-center text-center text-xs italic">
                        💊 Belum ada riwayat obat cacing
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi Verifikasi Cepat */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => openMarkDoneModal(pet.id, 'vaccine')}
                      className="py-2 px-3 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200/60 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>✅</span> Verifikasi Vaksin
                    </button>
                    <button
                      onClick={() => openMarkDoneModal(pet.id, 'deworming')}
                      className="py-2 px-3 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl border border-indigo-200/60 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>✅</span> Verifikasi Cacing
                    </button>
                  </div>

                  {pet.medical_history && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-1">Catatan Medis:</span>
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
      {/* TAMPILAN BUKU PASPOR FISIK (DENGAN LOGO RESMI) */}
      {/* ======================================================== */}
      <div className="hidden print:block passport-book-container">
        {filteredPets.map((pet) => {
          const isYoung = pet.age && pet.age <= 6
          const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
          const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

          return (
            <div key={`print-${pet.id}`} className="w-full max-w-2xl mx-auto p-8 border-4 border-amber-700 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/30 rounded-3xl my-6 text-slate-800 shadow-xl relative overflow-hidden">
              
              {/* Header Paspor Premium dengan Logo Resmi & Domain pasporanabulku.web.id */}
              <div className="flex items-center justify-between border-b-2 border-amber-600 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <img 
                    src="/icon-192.png.jpg" 
                    alt="Logo Paspor Anabul" 
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <h1 className="text-xl font-black tracking-widest text-amber-900 uppercase">PASPOR KESEHATAN ANABUL</h1>
                    <p className="text-[11px] font-bold text-amber-700 tracking-wider">OFFICIAL PET MEDICAL PASSPORT</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-extrabold tracking-wide">
                    🌐 pasporanabulku.web.id
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">NO. REG: PAS-2026-{pet.id.toString().substring(0,6).toUpperCase()}</p>
                </div>
              </div>

              {/* Data Identitas Anabul & Foto Estetis */}
              <div className="flex gap-6 items-center bg-white/90 backdrop-blur p-5 rounded-2xl border border-amber-200/80 shadow-sm mb-6">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-28 h-28 rounded-2xl object-cover border-4 border-amber-500 shadow-md" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl border-4 border-amber-300 shadow-sm">
                    {pet.species === 'Kucing' ? '🐱' : '🐶'}
                  </div>
                )}
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <p><b>Nama Anabul:</b> <span className="text-sm font-black text-amber-950">{pet.name}</span></p>
                    <p><b>Jenis Hewan:</b> <span className="font-semibold text-slate-700">{pet.species}</span></p>
                    <p><b>Ras / Breed:</b> <span className="font-semibold text-slate-700">{pet.breed || '-'}</span></p>
                    <p><b>Umur:</b> <span className="font-semibold text-slate-700">{pet.age ? `${pet.age} Bulan` : '-'}</span></p>
                    <p><b>Berat Badan:</b> <span className="font-semibold text-amber-700">{pet.weight ? `${pet.weight} kg` : '-'}</span></p>
                    <p><b>WhatsApp:</b> <span className="font-semibold text-slate-700">+{pet.phone_number}</span></p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Pemilik: {user.email}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">Terverifikasi</span>
                  </div>
                </div>
              </div>

              {/* Tabel Catatan Stiker Vaksinasi & Obat Cacing */}
              <div className="space-y-3 mb-6">
                <h3 className="font-extrabold text-xs text-amber-900 border-b border-amber-300 pb-1.5 flex items-center gap-1.5">
                  <span>📋</span> LEMBAR VALIDASI VAKSINASI &amp; MEDICINE RECORD
                </h3>

                <table className="w-full text-left border-collapse text-xs bg-white rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
                  <thead>
                    <tr className="bg-amber-700 text-white text-[10px] uppercase tracking-wider">
                      <th className="p-2.5 border-r border-amber-800">Penanganan</th>
                      <th className="p-2.5 border-r border-amber-800">Jenis Vaksin / Obat</th>
                      <th className="p-2.5 border-r border-amber-800">Tanggal</th>
                      <th className="p-2.5 border-r border-amber-800">Jatuh Tempo</th>
                      <th className="p-2.5 border-r border-amber-800">Dokter Hewan</th>
                      <th className="p-2.5 text-center">Stiker / Cap / TTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    <tr>
                      <td className="p-2.5 border-r border-amber-100 font-bold text-slate-800">💉 Vaksinasi</td>
                      <td className="p-2.5 border-r border-amber-100 text-slate-700">{pet.vaccine_type || 'Vaksin Standar'}</td>
                      <td className="p-2.5 border-r border-amber-100 text-slate-600">{pet.last_vaccine || '-'}</td>
                      <td className="p-2.5 border-r border-amber-100 font-bold text-emerald-700">{formatDateLocale(nextVaccine) || '-'}</td>
                      <td className="p-2.5 border-r border-amber-100 font-semibold text-slate-800">
                        {pet.vaccine_vet_name || '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        {pet.vaccine_proof_url ? (
                          <img src={pet.vaccine_proof_url} alt="Stiker Vaksin" className="w-10 h-10 object-cover rounded-xl mx-auto border border-amber-300 shadow-sm" />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">[ Belum Ada TTD ]</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border-r border-amber-100 font-bold text-slate-800">💊 Obat Cacing</td>
                      <td className="p-2.5 border-r border-amber-100 text-slate-700">Deworming Routine</td>
                      <td className="p-2.5 border-r border-amber-100 text-slate-600">{pet.deworming_date || '-'}</td>
                      <td className="p-2.5 border-r border-amber-100 font-bold text-indigo-700">{formatDateLocale(nextDeworming) || '-'}</td>
                      <td className="p-2.5 border-r border-amber-100 font-semibold text-slate-800">
                        {pet.deworming_vet_name || '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        {pet.deworming_proof_url ? (
                          <img src={pet.deworming_proof_url} alt="Cap Obat Cacing" className="w-10 h-10 object-cover rounded-xl mx-auto border border-amber-300 shadow-sm" />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">[ Belum Ada TTD ]</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {pet.medical_history && (
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs">
                    <p className="font-bold text-slate-700 mb-0.5">Catatan Diagnosa / Pesan Dokter Hewan:</p>
                    <p className="text-slate-600 italic">{pet.medical_history}</p>
                  </div>
                )}
              </div>

              {/* QR Code Verifikasi Estetis & Footer Kartu */}
              <div className="flex justify-between items-end pt-4 border-t-2 border-amber-200">
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-amber-900">✔ Resmi Terverifikasi di pasporanabulku.web.id</p>
                  <p>✔ Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-[9px] text-slate-400">Scan QR Code di samping untuk otentikasi rekam medis resmi.</p>
                </div>
                <div className="text-center bg-white p-2.5 rounded-2xl border-2 border-amber-500 shadow-md">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=https://pasporanabulku.web.id/verify/${pet.id}`} 
                    alt="QR Verifikasi Paspor" 
                    className="w-20 h-20 mx-auto"
                  />
                  <p className="text-[8px] font-black text-amber-900 mt-1 uppercase tracking-wider">Scan Verifikasi</p>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Modal Popup Verifikasi + Mandatory Unggah Foto TTD Dokter Hewan */}
      {proofModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                🩺 Verifikasi ({proofModal.type === 'vaccine' ? 'Vaksinasi' : 'Obat Cacing'})
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Dokter Hewan Pemeriksa <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: drh. Nur Rohman Najib"
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unggah Foto Stiker / Cap / TTD <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                  required
                />
                <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed">
                  *Wajib mengunggah foto stiker botol vaksin, stempel klinik, atau tanda tangan Dokter Hewan sebagai bukti validasi.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setProofModal({ open: false, petId: null, type: null })}
                className="px-4 py-2 text-xs bg-slate-100 text-slate-600 rounded-xl font-semibold"
                disabled={submittingProof}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmMarkDone}
                disabled={submittingProof || !proofFile || !vetName.trim()}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                  !proofFile || !vetName.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {submittingProof ? 'Menyimpan...' : '✅ Simpan & Verifikasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Panduan Program Vaksinasi & Aturan Klinik */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border my-8">
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
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl">
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
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <div>
                    <p className="font-semibold text-blue-700">1. Vaksin Dosis Pertama - Minimal Usia 8–10 Minggu</p>
                    <p className="text-slate-600">Melindungi dari Panleukopenia, Calicivirus, dan Rhinotracheitis (Feline Herpesvirus).</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">2. Vaksin Dosis Kedua - Seri Lanjutan (Usia 12–14 Minggu)</p>
                    <p className="text-slate-600">Melindungi dari 3 penyakit awal ditambah serangan bakteri Chlamydia.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700">3. Vaksin Dosis Ketiga (ditambah Rabies) - Minimal Usia 12–16 Minggu</p>
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
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
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

              <div className="p-3.5 bg-indigo-50 border border-indigo-200/80 rounded-2xl">
                <p className="font-bold text-indigo-900 mb-1">⚙️ Aturan Perhitungan Sistem:</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-800">
                  <li><b>Kitten (&le; 6 Bulan):</b> Interval jadwal vaksinasi dikalkulasi otomatis <b>1 bulan sekali</b> (Seri Vaksin Primer).</li>
                  <li><b>Dewasa (&gt; 6 Bulan):</b> Interval jadwal vaksinasi dikalkulasi otomatis <b>1 tahun sekali</b> (Booster Tahunan).</li>
                  <li><b>Obat Cacing:</b> Kitten 1 bulan sekali, Dewasa 3 bulan sekali.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20"
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

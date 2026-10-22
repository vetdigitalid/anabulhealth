import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Tambahkan baris ini agar rute bersifat dinamis di Vercel
export const dynamic = 'force-dynamic'

// Gunakan fallback agar tidak error saat proses build statis Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key')

// Helper hitung tanggal jatuh tempo
function calculateNextDate(dateString, isYoung, type) {
  if (!dateString) return null
  const cleanDateStr = dateString.includes('T') ? dateString : `${dateString}T00:00:00`
  const date = new Date(cleanDateStr)
  if (isNaN(date.getTime())) return null

  if (type === 'vaccine') {
    if (isYoung) {
      date.setMonth(date.getMonth() + 1)
    } else {
      date.setFullYear(date.getFullYear() + 1)
    }
  } else if (type === 'deworming') {
    if (isYoung) {
      date.setMonth(date.getMonth() + 1)
    } else {
      date.setMonth(date.getMonth() + 3)
    }
  }
  return date
}

// Helper kirim pesan WhatsApp via Fonnte
async function sendWhatsApp(targetPhone, messageText) {
  if (!targetPhone || !process.env.WA_API_TOKEN) return false
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.WA_API_TOKEN,
      },
      body: new URLSearchParams({
        target: targetPhone,
        message: messageText,
      }),
    })
    const data = await res.json()
    return data.status
  } catch (err) {
    console.error('Gagal kirim WhatsApp:', err.message)
    return false
  }
}

export async function GET(request) {
  try {
    // 🛡️ SECURITY CHECK: Verifikasi CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses ditolak' },
        { status: 401 }
      )
    }

    const { data: pets, error } = await supabase.from('pets').select('*')
    if (error) throw error

    // Tanggal hari ini dalam WIB (Asia/Jakarta)
    const nowInWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const today = new Date(nowInWib.getFullYear(), nowInWib.getMonth(), nowInWib.getDate())

    // Grouping pengingat berdasarkan user_id
    const userReminders = {}

    for (const pet of pets) {
      const isYoung = pet.age && pet.age <= 6
      const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
      const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

      const petEmailReminders = []
      const petWaReminders = []

      // 1. Cek Vaksin
      if (nextVaccine) {
        const targetDate = new Date(nextVaccine.getFullYear(), nextVaccine.getMonth(), nextVaccine.getDate())
        const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          
          petEmailReminders.push(`💉 <b>Vaksinasi (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          petWaReminders.push(`💉 *Vaksinasi ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // 2. Cek Obat Cacing
      if (nextDeworming) {
        const targetDate = new Date(nextDeworming.getFullYear(), nextDeworming.getMonth(), nextDeworming.getDate())
        const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

          petEmailReminders.push(`💊 <b>Obat Cacing (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          petWaReminders.push(`💊 *Obat Cacing ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // Gabungkan pengingat jika ada
      if (petEmailReminders.length > 0 || petWaReminders.length > 0) {
        if (!userReminders[pet.user_id]) {
          userReminders[pet.user_id] = {
            userId: pet.user_id,
            phone: pet.phone_number,
            emailReminders: [],
            waReminders: []
          }
        }
        userReminders[pet.user_id].emailReminders.push(...petEmailReminders)
        userReminders[pet.user_id].waReminders.push(...petWaReminders)
        if (!userReminders[pet.user_id].phone && pet.phone_number) {
          userReminders[pet.user_id].phone = pet.phone_number
        }
      }
    }

    let emailsSent = 0
    let waSent = 0

    // Kirim notifikasi terkonsolidasi per user
    for (const userId of Object.keys(userReminders)) {
      const item = userReminders[userId]

      // Ambil Email dari Supabase Auth
      let targetEmail = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        targetEmail = userData?.user?.email
      } catch (e) {
        console.log('Auth fetch error:', e.message)
      }

      // 1. Kirim 1 Email Terkonsolidasi per User
      if (item.emailReminders.length > 0 && targetEmail && process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Paspor Anabul <onboarding@resend.dev>',
          to: targetEmail,
          subject: `🐾 Pengingat Paspor Anabul Anda`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>🐾 Pengingat Paspor Anabul</h2>
              <p>Halo! Berikut adalah jadwal perawatan medis terdekat untuk anabul kesayangan Anda:</p>
              <ul>
                ${item.emailReminders.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
              </ul>
              <p>Jangan lupa untuk melakukan tindakan medis atau berkonsultasi dengan dokter hewan ya!</p>
              <br/>
              <a href="https://pasporanabulku.web.id" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold;">Buka Paspor Anabul</a>
            </div>
          `
        })
        emailsSent++
      }

      // 2. Kirim 1 WhatsApp Terkonsolidasi per User
      if (item.waReminders.length > 0 && item.phone && process.env.WA_API_TOKEN) {
        const waMessage = `🐾 *PENGINGAT PASPOR ANABUL*\n\nHalo Kak! Berikut adalah jadwal perawatan terdekat untuk anabul Anda:\n\n` +
          item.waReminders.join('\n') +
          `\n\n_Buka Paspor Anabul selengkapnya di: https://pasporanabulku.web.id_`

        await sendWhatsApp(item.phone, waMessage)
        waSent++
      }
    }

    return NextResponse.json({ 
      success: true, 
      emailsSent, 
      waSent
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

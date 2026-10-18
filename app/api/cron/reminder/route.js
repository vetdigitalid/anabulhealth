import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey
)

const resend = new Resend(process.env.RESEND_API_KEY)

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
    // 🛡️ SECURITY CHECK: Verifikasi token otentikasi dari Vercel Cron atau manual token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Jika CRON_SECRET sudah di-set, pastikan header Authorization sesuai
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

    let emailsSent = 0
    let waSent = 0
    const logs = []

    for (const pet of pets) {
      const isYoung = pet.age && pet.age <= 6
      const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
      const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

      let targetEmail = null
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(pet.user_id)
        targetEmail = userData?.user?.email
      } catch (e) {
        console.log('Auth error:', e.message)
      }

      const targetPhone = pet.phone_number

      const emailReminders = []
      const waReminders = []

      // 1. Cek Vaksin
      if (nextVaccine) {
        const targetDate = new Date(nextVaccine.getFullYear(), nextVaccine.getMonth(), nextVaccine.getDate())
        const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          
          emailReminders.push(`💉 <b>Vaksinasi (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          waReminders.push(`💉 *Vaksinasi ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // 2. Cek Obat Cacing
      if (nextDeworming) {
        const targetDate = new Date(nextDeworming.getFullYear(), nextDeworming.getMonth(), nextDeworming.getDate())
        const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

          emailReminders.push(`💊 <b>Obat Cacing (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          waReminders.push(`💊 *Obat Cacing ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // Kirim Email
      if (emailReminders.length > 0 && targetEmail && process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Pet Health Tracker <onboarding@resend.dev>',
          to: targetEmail,
          subject: `🐾 Pengingat Kesehatan Anabul: ${pet.name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>🐾 Pengingat Perawatan Anabul</h2>
              <p>Halo! Berikut jadwal perawatan medis terdekat untuk <b>${pet.name}</b>:</p>
              <ul>
                ${emailReminders.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
              </ul>
              <p>Jangan lupa untuk melakukan tindakan medis atau berkonsultasi dengan dokter hewan ya!</p>
              <br/>
              <a href="https://anabulhealth.vercel.app" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold;">Buka Rekam Medis</a>
            </div>
          `
        })
        emailsSent++
      }

      // Kirim WA
      if (waReminders.length > 0 && targetPhone && process.env.WA_API_TOKEN) {
        const waMessage = `🐾 *PENGINGAT KESEHATAN ANABUL*\n\nHalo Kak! Berikut adalah jadwal perawatan terdekat untuk *${pet.name}*:\n\n` +
          waReminders.join('\n') +
          `\n\n_Buka rekam medis selengkapnya di: https://anabulhealth.vercel.app_`
        
        await sendWhatsApp(targetPhone, waMessage)
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

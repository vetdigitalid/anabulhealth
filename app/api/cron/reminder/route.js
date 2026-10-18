import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper hitung tanggal jatuh tempo
function calculateNextDate(dateString, isYoung, type) {
  if (!dateString) return null
  const date = new Date(dateString)
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
  if (!targetPhone || !process.env.WA_API_TOKEN) return
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.WA_API_TOKEN,
      },
      body: new URLSearchParams({
        target: targetPhone,
        message: messageText,
      }),
    })
  } catch (err) {
    console.error('Gagal kirim WhatsApp:', err.message)
  }
}

export async function GET() {
  try {
    const { data: pets, error } = await supabase.from('pets').select('*')
    if (error) throw error

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let emailsSent = 0
    let waSent = 0

    for (const pet of pets) {
      const isYoung = pet.age && pet.age <= 6
      const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
      const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

      // Dapatkan email pengguna
      const { data: userData } = await supabase.auth.admin.getUserById(pet.user_id).catch(() => ({ data: null }))
      const targetEmail = userData?.user?.email
      const targetPhone = pet.phone_number // Nomor WA yang disimpan di data anabul

      const emailReminders = []
      const waReminders = []

      // Cek Tenggat Vaksin (Mencakup Hari H, H-1, H-2, H-3)
      if (nextVaccine) {
        nextVaccine.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((nextVaccine - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = nextVaccine.toLocaleDateString('id-ID')
          
          emailReminders.push(`💉 <b>Vaksinasi (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          waReminders.push(`💉 *Vaksinasi ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // Cek Tenggat Obat Cacing (Mencakup Hari H, H-1, H-2, H-3)
      if (nextDeworming) {
        nextDeworming.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((nextDeworming - today) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          const dateStr = nextDeworming.toLocaleDateString('id-ID')

          emailReminders.push(`💊 <b>Obat Cacing (${pet.name})</b>: Jatuh tempo ${statusTxt} (${dateStr})`)
          waReminders.push(`💊 *Obat Cacing ${pet.name}*: Jatuh tempo ${statusTxt} (${dateStr})`)
        }
      }

      // 1. Kirim Email (Jika ada pengingat & email valid)
      if (emailReminders.length > 0 && targetEmail) {
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

      // 2. Kirim WhatsApp (Jika ada pengingat & nomor HP terisi)
      if (waReminders.length > 0 && targetPhone) {
        const waMessage = `🐾 *PENGINGAT KESEHATAN ANABUL*\n\nHalo Kak! Berikut adalah jadwal perawatan terdekat untuk *${pet.name}*:\n\n` +
          waReminders.join('\n') +
          `\n\n_Buka rekam medis selengkapnya di: https://anabulhealth.vercel.app_`
        
        await sendWhatsApp(targetPhone, waMessage)
        waSent++
      }
    }

    return NextResponse.json({ success: true, emailsSent, waSent })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

// Fungsi pembantu menghitung tanggal jatuh tempo
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

export async function GET() {
  try {
    // 1. Ambil semua data pets beserta user ID
    const { data: pets, error } = await supabase.from('pets').select('*')
    if (error) throw error

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let emailsSent = 0

    for (const pet of pets) {
      const isYoung = pet.age && pet.age <= 6
      const nextVaccine = calculateNextDate(pet.last_vaccine, isYoung, 'vaccine')
      const nextDeworming = calculateNextDate(pet.deworming_date, isYoung, 'deworming')

      // Dapatkan email pemilik dari auth.users via Supabase RPC atau query
      const { data: userData } = await supabase.auth.admin.getUserById(pet.user_id).catch(() => ({ data: null }))
      const targetEmail = userData?.user?.email

      if (!targetEmail) continue

      const reminders = []

      // Cek Tenggat Vaksin
      if (nextVaccine) {
        nextVaccine.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((nextVaccine - today) / (1000 * 60 * 60 * 24))

        if ([0, 1, 3].includes(diffDays)) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          reminders.push(`💉 <b>Vaksinasi (${pet.name})</b>: Jatuh tempo ${statusTxt} (${nextVaccine.toLocaleDateString('id-ID')})`)
        }
      }

      // Cek Tenggat Obat Cacing
      if (nextDeworming) {
        nextDeworming.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((nextDeworming - today) / (1000 * 60 * 60 * 24))

        if ([0, 1, 3].includes(diffDays)) {
          const statusTxt = diffDays === 0 ? 'HARI INI' : `${diffDays} hari lagi`
          reminders.push(`💊 <b>Obat Cacing (${pet.name})</b>: Jatuh tempo ${statusTxt} (${nextDeworming.toLocaleDateString('id-ID')})`)
        }
      }

      // Kirim Email jika ada pengingat yang cocok
      if (reminders.length > 0) {
        await resend.emails.send({
          from: 'Pet Health Tracker <onboarding@resend.dev>',
          to: targetEmail,
          subject: `🐾 Pengingat Kesehatan Anabul: ${pet.name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>🐾 Pengingat Perawatan Anabul</h2>
              <p>Halo! Berikut adalah jadwal perawatan medis terdekat untuk <b>${pet.name}</b>:</p>
              <ul>
                ${reminders.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
              </ul>
              <p>Jangan lupa untuk melakukan tindakan medis atau berkonsultasi dengan dokter hewan ya!</p>
              <br/>
              <a href="https://anabulhealth.vercel.app" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold;">Buka Rekam Medis</a>
            </div>
          `
        })
        emailsSent++
      }
    }

    return NextResponse.json({ success: true, emailsSent })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

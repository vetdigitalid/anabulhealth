import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inisialisasi Supabase menggunakan Service Role (atau Anon Key) untuk update data database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { order_id, transaction_status } = body

    console.log(`[Midtrans Webhook] Menerima notifikasi untuk Order ID: ${order_id}, Status: ${transaction_status}`)

    // Cek apakah status pembayaran sukses (settlement atau capture)
    const isSuccess = transaction_status === 'settlement' || transaction_status === 'capture'

    if (isSuccess) {
      // Format order_id di aplikasi kita adalah: VIP-{userId_8_karakter}-{timestamp}
      // Contoh: VIP-a1b2c3d4-1710000000000
      const parts = order_id.split('-')
      
      if (parts.length >= 2) {
        const userPrefix = parts[1]

        // Cari user di tabel profiles berdasarkan awalan ID tersebut
        const { data: profiles, error: fetchError } = await supabase
          .from('profiles')
          .select('id')

        if (!fetchError && profiles) {
          const targetProfile = profiles.find(p => p.id.startsWith(userPrefix))

          if (targetProfile) {
            // Update status is_vip menjadi true di Supabase secara otomatis
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ is_vip: true })
              .eq('id', targetProfile.id)

            if (updateError) {
              console.error('Gagal update VIP di database:', updateError.message)
            } else {
              console.log(`Sukses! Akun dengan ID ${targetProfile.id} resmi menjadi VIP via Webhook.`)
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'OK' }, { status: 200 })
  } catch (error) {
    console.error('Webhook Error Details:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses webhook' },
      { status: 500 }
    )
  }
}

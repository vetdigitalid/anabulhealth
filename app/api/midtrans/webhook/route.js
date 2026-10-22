import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Menggunakan service_role agar bisa bypass RLS

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req) {
  try {
    const body = await req.json()
    const { order_id, transaction_status, fraud_status } = body

    // Format order_id: VIP-[userId_prefix]-[timestamp]
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (fraud_status === 'accept' || !fraud_status) {
        // Ambil userPrefix dari order_id
        const parts = order_id.split('-')
        const userPrefix = parts[1]

        // Update status user menjadi VIP di Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_vip: true })
          .ilike('id', `${userPrefix}%`)

        if (error) console.error('Gagal update status VIP di Supabase:', error)
      }
    }

    return NextResponse.json({ status: 'OK' })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

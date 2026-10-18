import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { petId, type } = await request.json()

    if (!petId || !type) {
      return NextResponse.json(
        { success: false, error: 'Parameter petId dan type wajib diisi' },
        { status: 400 }
      )
    }

    // Ambil tanggal hari ini dalam format YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]

    const updateData = {}
    if (type === 'vaccine') {
      updateData.last_vaccine = todayStr
    } else if (type === 'deworming') {
      updateData.deworming_date = todayStr
    } else {
      return NextResponse.json(
        { success: false, error: 'Tipe tindakan medis tidak valid' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pets')
      .update(updateData)
      .eq('id', petId)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

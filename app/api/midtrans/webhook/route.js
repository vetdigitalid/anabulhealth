import { NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

export async function POST(req) {
  try {
    const body = await req.json()
    const { order_id, gross_amount, customer_details } = body

    // Tentukan mode berdasarkan Environment Variable Vercel
    // Jika tidak diisi, default otomatis ke false (Sandbox)
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' || 
                         process.env.MIDTRANS_IS_PRODUCTION === 'true'

    const snap = new midtransClient.Snap({
      isProduction: isProduction, // Akan bernilai false untuk mode Sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    })

    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: gross_amount,
      },
      customer_details: customer_details,
    }

    const token = await snap.createTransactionToken(parameter)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Tokenizer Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

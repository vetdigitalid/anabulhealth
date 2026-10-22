import { NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

export async function POST(req) {
  try {
    const body = await req.json()
    const { order_id, gross_amount, customer_details } = body

    // Inisialisasi Midtrans Snap - Paksa Mode Sandbox (false)
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    })

    const parameter = {
      transaction_details: {
        order_id: order_id || `VIP-${Date.now()}`,
        gross_amount: Number(gross_amount) || 29000,
      },
      customer_details: customer_details || {},
    }

    const transaction = await snap.createTransaction(parameter)

    // Kembalikan token
    return NextResponse.json({ token: transaction.token })
  } catch (error) {
    console.error('Tokenizer Error Details:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal membuat token Midtrans' },
      { status: 500 }
    )
  }
}

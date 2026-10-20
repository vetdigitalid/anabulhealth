import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId, email, amount = 29000 } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID dan Email wajib diisi' }, { status: 400 });
    }

    const orderId = `VIP-${userId.substring(0, 8)}-${Date.now()}`;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const authHeader = Buffer.from(serverKey + ':').toString('base64');

    // Menggunakan Endpoint Midtrans Snap API
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', { // Ganti app.midtrans.com untuk Production
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        item_details: [
          {
            id: 'VIP_PASPOR_ANABUL',
            price: amount,
            quantity: 1,
            name: 'Upgrade VIP Paspor Anabul (Akses Tanpa Batas)',
          }
        ],
        customer_details: {
          email: email,
        },
        enabled_payments: ['gopay', 'qris', 'shopeepay'], // Fokus QRIS & E-Wallet
        callbacks: {
          finish: `${process.env.NEXT_PUBLIC_BASE_URL}/?status=success`
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal membuat transaksi Midtrans');
    }

    return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
  } catch (error) {
    console.error('Error Checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId, email, amount = 29000 } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID dan Email wajib diisi' }, { status: 400 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return NextResponse.json(
        { error: 'MIDTRANS_SERVER_KEY belum diisi di Environment Variables Vercel' },
        { status: 500 }
      );
    }

    // Endpoint Resmi Production Midtrans Snap API
    const snapUrl = 'https://app.midtrans.com/snap/v1/transactions';

    // Membuat Order ID Unik (Contoh: VIP-a1b2c3d4-1700000000000)
    const orderId = `VIP-${userId.substring(0, 8)}-${Date.now()}`;
    const authHeader = Buffer.from(serverKey + ':').toString('base64');

    const response = await fetch(snapUrl, {
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
        enabled_payments: ['gopay', 'qris', 'shopeepay'], // Metode pembayaran utama
        callbacks: {
          finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://anabulhealth.vercel.app'}/?status=success`
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.error_messages) 
        ? data.error_messages.join(', ') 
        : (data.message || 'Gagal membuat transaksi Midtrans Production');
      throw new Error(errorMessage);
    }

    return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
  } catch (error) {
    console.error('Error Checkout Production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

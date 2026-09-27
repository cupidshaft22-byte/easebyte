const fetch = require('node-fetch');

const HUBTEL_BASE = 'https://payproxyapi.hubtel.com';
const MOCK_MODE = process.env.HUBTEL_MOCK_MODE === 'true';

async function requestPayment({ amount, phone, orderId, description }) {
  if (MOCK_MODE) {
    console.log(`[MOCK] Hubtel charge: GHS ${amount} to ${phone} (order ${orderId})`);
    return {
      data: { checkoutId: `mock-${orderId}` },
      message: 'Mocked - no real charge sent',
    };
  }

  const auth = Buffer.from(
    `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${HUBTEL_BASE}/items/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      totalAmount: amount,
      description,
      callbackUrl: process.env.HUBTEL_CALLBACK_URL,
      merchantAccountNumber: process.env.HUBTEL_MERCHANT_ID,
      cancellationUrl: process.env.APP_URL,
      returnUrl: process.env.APP_URL,
      clientReference: `order-${orderId}`,
      payeeName: phone,
      payeeMobileNumber: phone,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Hubtel request failed: ${res.status}`);
  return data;
}

module.exports = { requestPayment };

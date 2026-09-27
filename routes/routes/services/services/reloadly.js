const fetch = require('node-fetch');

const RELOADLY_AUTH_URL = 'https://auth.reloadly.com/oauth/token';
const RELOADLY_API_BASE = process.env.RELOADLY_SANDBOX === 'true'
  ? 'https://topups-sandbox.reloadly.com'
  : 'https://topups.reloadly.com';

const MOCK_MODE = process.env.RELOADLY_MOCK_MODE === 'true';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(RELOADLY_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: RELOADLY_API_BASE,
    }),
  });

  if (!res.ok) throw new Error(`Reloadly auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function detectOperator(phone, countryCode = 'GH') {
  if (MOCK_MODE) {
    console.log(`[MOCK] Detected operator for ${phone}`);
    return { operatorId: 999, name: 'Mock Operator GH' };
  }

  const token = await getAccessToken();
  const res = await fetch(
    `${RELOADLY_API_BASE}/operators/auto-detect/phone/${phone}/countries/${countryCode}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Operator detection failed: ${res.status}`);
  return res.json();
}

async function sendDataBundle({ phone, operatorId, amount, countryCode = 'GH' }) {
  if (MOCK_MODE) {
    console.log(`[MOCK] Sent GHS ${amount} data bundle to ${phone}`);
    return { transactionId: `mock-txn-${Date.now()}`, status: 'SUCCESSFUL' };
  }

  const token = await getAccessToken();
  const res = await fetch(`${RELOADLY_API_BASE}/topups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/com.reloadly.topups-v1+json',
    },
    body: JSON.stringify({
      operatorId,
      amount,
      useLocalAmount: true,
      recipientPhone: { countryCode, number: phone },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Top-up failed: ${res.status}`);
  return data;
}

module.exports = { detectOperator, sendDataBundle };

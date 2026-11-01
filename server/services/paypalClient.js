// PayPal Developer Sandbox Service Client
// Uses PayPal REST API v2 directly for zero-dependency reliability and full OAuth2 spec compliance.

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Fetch OAuth2 Bearer Access Token from PayPal Sandbox
 */
export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'your_paypal_sandbox_client_id_here') {
    return { configured: false, token: null };
  }

  // Reuse cached token if valid with 60s buffer
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return { configured: true, token: cachedAccessToken };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Auth Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  return { configured: true, token: cachedAccessToken };
}

/**
 * Create a PayPal Order in Sandbox
 */
export async function createPayPalOrder({ amount, currency = 'USD', description = 'PayBastion Sandbox Transaction' }) {
  const { configured, token } = await getPayPalAccessToken();

  if (!configured) {
    // High-fidelity sandbox mock mode when user hasn't added credentials yet
    const simulatedOrderId = `SANDBOX-DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      success: true,
      demoMode: true,
      orderId: simulatedOrderId,
      status: 'CREATED',
      amount,
      currency,
      message: 'Demo Sandbox Order generated (Configure PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET in server/.env for live sandbox API)',
      approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${simulatedOrderId}`
    };
  }

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: description.substring(0, 127),
        amount: {
          currency_code: currency,
          value: parseFloat(amount).toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: 'PayBastion AI Resilience',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'http://localhost:5173/paypal-return',
      cancel_url: 'http://localhost:5173/paypal-cancel',
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `PayPal Order Creation Error (${response.status})`);
  }

  const approveLink = data.links?.find(link => link.rel === 'approve')?.href;

  return {
    success: true,
    demoMode: false,
    orderId: data.id,
    status: data.status,
    approveUrl: approveLink,
    details: data,
  };
}

/**
 * Capture an Approved PayPal Order
 */
export async function capturePayPalOrder(orderId) {
  const { configured, token } = await getPayPalAccessToken();

  if (!configured || orderId.startsWith('SANDBOX-DEMO-')) {
    const captureId = `CAP-DEMO-${Date.now()}`;
    return {
      success: true,
      demoMode: true,
      orderId,
      captureId,
      status: 'COMPLETED',
      payer: {
        email_address: 'sandbox-buyer@paybastion.dev',
        name: { given_name: 'Resilient', surname: 'Tester' }
      },
      message: 'Simulated Sandbox Capture Verified',
      completedAt: new Date().toISOString()
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `PayPal Capture Error (${response.status})`);
  }

  const captureDetail = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    success: true,
    demoMode: false,
    orderId: data.id,
    captureId: captureDetail?.id || `CAP-${data.id}`,
    status: data.status,
    payer: data.payer,
    details: data,
    completedAt: new Date().toISOString()
  };
}

/**
 * Inquire order status directly from PayPal to reconcile uncertain transactions
 */
export async function getPayPalOrderStatus(orderId) {
  const { configured, token } = await getPayPalAccessToken();

  if (!configured || orderId.startsWith('SANDBOX-DEMO-')) {
    return {
      exists: true,
      status: 'COMPLETED',
      verifiedBy: 'PayBastion Sandbox Reconciler'
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return { exists: false, status: 'NOT_FOUND' };
  }

  const data = await response.json();
  return {
    exists: true,
    status: data.status,
    details: data
  };
}

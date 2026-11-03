import dotenv from 'dotenv';
dotenv.config();

export function validateEnvironment() {
  const port = process.env.PORT || 5000;
  const mode = process.env.PAYPAL_MODE || 'sandbox';

  if (!process.env.OFFLINE_PASSPORT_SECRET) {
    console.warn('⚠️  OFFLINE_PASSPORT_SECRET is not set in environment. Using default secure local development secret.');
  }

  const paypalConfigured = Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_CLIENT_ID !== 'your_paypal_sandbox_client_id_here'
  );

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return {
    port,
    mode,
    paypalConfigured,
    geminiConfigured,
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    databasePath: process.env.DATABASE_PATH || './data/paybastion.db',
  };
}

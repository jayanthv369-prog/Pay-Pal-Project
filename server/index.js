
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import paypalRoutes from './routes/paypal.js';
import offlineRoutes from './routes/offline.js';
import recoveryRoutes from './routes/recovery.js';
import scamGuardianRoutes from './routes/scamGuardian.js';
import aiExplainerRoutes from './routes/aiExplainer.js';
import walletRoutes from './routes/wallet.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/paypal', paypalRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/scam-guardian', scamGuardianRoutes);
app.use('/api/ai', aiExplainerRoutes);
app.use('/api/wallet', walletRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'PayBastion AI Resilience Gateway',
    timestamp: new Date().toISOString(),
    paypalConfigured: Boolean(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_ID !== 'your_paypal_sandbox_client_id_here'
    ),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    mode: process.env.NODE_ENV || 'development'
  });
});

app.listen(PORT, () => {
  console.log(`🛡️ PayBastion AI Resilience Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to handle Offline Auth, Smart Recovery, PayPal Sandbox, Scam Guardian & Wallet.`);
});

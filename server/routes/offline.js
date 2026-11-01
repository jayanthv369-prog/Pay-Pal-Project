import express from 'express';
import { signOfflinePayload, verifyOfflinePassport, resetReplayCache } from '../services/cryptoSigner.js';

const router = express.Router();

/**
 * Sign an offline authorization payload on client behalf
 */
router.post('/sign', (req, res) => {
  try {
    const { authId, senderId, recipientId, amount, currency = 'INR', nonce, expiresAt } = req.body;

    if (!authId || !senderId || !recipientId || !amount || !nonce || !expiresAt) {
      return res.status(400).json({ error: 'Missing required authorization fields' });
    }

    const signature = signOfflinePayload({
      authId,
      senderId,
      recipientId,
      amount,
      currency,
      nonce,
      expiresAt,
    });

    res.json({
      authId,
      signature,
      algorithm: 'HMAC-SHA256',
      signedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify an offline authorization QR payload
 */
router.post('/verify', (req, res) => {
  try {
    const passportData = req.body;
    const result = verifyOfflinePassport(passportData);

    // Return 200 with result structure so client terminal renders full diagnostic
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

/**
 * Reset replay cache (For hackathon testing)
 */
router.post('/reset-replay-cache', (req, res) => {
  const result = resetReplayCache();
  res.json(result);
});

export default router;

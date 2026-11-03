import express from 'express';
import { analyzeScamRisk } from '../services/scamDetectionService.js';

const router = express.Router();

/**
 * POST /api/scam-guardian/analyze
 * Evaluates payment parameters and QR payloads for fraud, spoofing, and scam patterns
 */
router.post('/analyze', (req, res) => {
  try {
    const { recipient, amount, rawPayload, recentAttemptsCount, context } = req.body;
    const analysis = analyzeScamRisk({ recipient, amount, rawPayload, recentAttemptsCount, context });
    res.json(analysis);
  } catch (err) {
    console.error('Scam Guardian analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

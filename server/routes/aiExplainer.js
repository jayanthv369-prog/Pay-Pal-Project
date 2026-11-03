import express from 'express';
import { explainTransactionState, parseVoiceIntent } from '../services/geminiService.js';

const router = express.Router();

/**
 * POST /api/ai/explain-state
 * Generate structured plain-language and technical explanation for payment states
 */
router.post('/explain-state', async (req, res) => {
  try {
    const { state, amount, recipient, failurePoint, providerResponse } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'state field is required' });
    }

    const explanation = await explainTransactionState({
      state,
      amount,
      recipient,
      failurePoint,
      providerResponse,
    });

    res.json(explanation);
  } catch (err) {
    console.error('AI explain-state error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/parse-voice
 * Parse multilingual voice transcript in Kannada or English
 * Returns extracted entities: recipient, amount, currency, purpose
 * NEVER executes payment!
 */
router.post('/parse-voice', async (req, res) => {
  try {
    const { transcript, language = 'en-US' } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const parsed = await parseVoiceIntent({ transcript, language });
    res.json(parsed);
  } catch (err) {
    console.error('AI parse-voice error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import { explainTransactionState } from '../services/geminiService.js';

const router = express.Router();

router.post('/explain-state', async (req, res) => {
  try {
    const { state, amount, recipient, failurePoint, providerResponse } = req.body;
    const explanation = await explainTransactionState({
      state,
      amount,
      recipient,
      failurePoint,
      providerResponse,
    });
    res.json(explanation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import {
  registerRecoveryTransaction,
  reconcileRecoveryTransaction,
  getPendingRecoveryTransactions,
} from '../services/recoveryService.js';

const router = express.Router();

/**
 * POST /api/recovery/register
 * Initialize / Record an in-flight transaction with idempotency key in persistent DB.
 */
router.post('/register', (req, res) => {
  try {
    const {
      idempotencyKey,
      amount,
      recipient,
      recipientName,
      sender,
      channel,
      provider,
      state,
      isSimulation,
      simulatedOutcome,
      scenarioId
    } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }

    const result = registerRecoveryTransaction({
      idempotencyKey,
      amount,
      recipient,
      recipientName,
      sender,
      channel,
      provider,
      state,
      isSimulation,
      simulatedOutcome,
      scenarioId
    });

    res.json(result);
  } catch (err) {
    console.error('Recovery register error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/recovery/reconcile
 * Smart Reconcile an interrupted/uncertain transaction.
 * Queries original payment provider BEFORE allowing retry or confirming.
 */
router.post('/reconcile', async (req, res) => {
  try {
    const { idempotencyKey, orderId, provider, simulatedOutcome } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey is required' });
    }

    const result = await reconcileRecoveryTransaction({
      idempotencyKey,
      orderId,
      provider,
      simulatedOutcome,
    });

    res.json(result);
  } catch (err) {
    console.error('Recovery reconcile error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recovery/pending
 * Retrieve list of all transactions needing reconciliation
 */
router.get('/pending', (req, res) => {
  try {
    const pending = getPendingRecoveryTransactions();
    res.json({ count: pending.length, pending });
  } catch (err) {
    console.error('Recovery pending error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

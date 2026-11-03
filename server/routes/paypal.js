import express from 'express';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalOrderStatus,
  isPayPalConfigured
} from '../services/paypalClient.js';

const router = express.Router();

/**
 * POST /api/paypal/create-order
 * Create a PayPal Sandbox Order
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount = '10.00', currency = 'USD', description } = req.body;

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const order = await createPayPalOrder({ amount, currency, description });
    res.json(order);
  } catch (error) {
    console.error('Create PayPal Order Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create PayPal sandbox order',
      hint: 'Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env',
    });
  }
});

/**
 * POST /api/paypal/capture-order
 * Capture an Approved PayPal Order
 */
router.post('/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const captureResult = await capturePayPalOrder(orderId);
    res.json(captureResult);
  } catch (error) {
    console.error('Capture PayPal Order Error:', error);
    res.status(400).json({
      error: error.message || 'Failed to capture PayPal sandbox order',
    });
  }
});

/**
 * GET /api/paypal/status/:orderId
 * Inquire Order Status directly from PayPal
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId parameter is required' });
    }

    const statusResult = await getPayPalOrderStatus(orderId);
    res.json(statusResult);
  } catch (error) {
    console.error('PayPal Order Status Check Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

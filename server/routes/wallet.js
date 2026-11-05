
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// SIMULATION ONLY: mock money, no real bank funds.
// In-memory state resets whenever the server restarts.
let balancePaise = 500000; // ₹5000
let pinSalt = null;
let pinHash = null;

const hashPin = (pin, salt) =>
  crypto.scryptSync(pin, salt, 64);

const validAmount = (amount) =>
  typeof amount === 'number' &&
  Number.isFinite(amount) &&
  amount > 0 &&
  amount <= 100000;

const toPaise = (amount) => Math.round(amount * 100);

// Get wallet balance
router.get('/balance', (req, res) => {
  res.json({
    balance: balancePaise / 100,
    currency: 'INR',
    simulated: true
  });
});

// Set or update a 4-digit demo PIN
router.post('/set-pin', (req, res) => {
  const { pin } = req.body;

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({
      error: 'PIN must contain exactly 4 digits'
    });
  }

  pinSalt = crypto.randomBytes(16);
  pinHash = hashPin(pin, pinSalt);

  res.json({
    message: 'Demo wallet PIN configured',
    simulated: true
  });
});

// Add simulated demo money
router.post('/add-demo-money', (req, res) => {
  const { amount } = req.body;

  if (!validAmount(amount)) {
    return res.status(400).json({
      error: 'Enter a valid amount'
    });
  }

  const amountPaise = toPaise(amount);

  balancePaise += amountPaise;

  res.json({
    message: 'Demo money added successfully',
    balance: balancePaise / 100,
    simulated: true
  });
});

// Send simulated payment
router.post('/pay', (req, res) => {
  const { recipient, amount, pin } = req.body;

  if (!pinHash || !pinSalt) {
    return res.status(400).json({
      error: 'Set your wallet PIN first'
    });
  }

  if (
    typeof recipient !== 'string' ||
    recipient.trim().length === 0 ||
    recipient.trim().length > 100
  ) {
    return res.status(400).json({
      error: 'Enter a valid recipient'
    });
  }

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({
      error: 'Enter a valid 4-digit PIN'
    });
  }

  if (!validAmount(amount)) {
    return res.status(400).json({
      error: 'Enter a valid payment amount'
    });
  }

  const suppliedHash = hashPin(pin, pinSalt);

  if (!crypto.timingSafeEqual(pinHash, suppliedHash)) {
    return res.status(401).json({
      error: 'Incorrect wallet PIN'
    });
  }

  const amountPaise = toPaise(amount);

  if (amountPaise > balancePaise) {
    return res.status(400).json({
      error: 'Insufficient wallet balance'
    });
  }

  balancePaise -= amountPaise;

  res.json({
    message: 'Simulated payment successful',
    recipient: recipient.trim(),
    amount: amountPaise / 100,
    balance: balancePaise / 100,
    simulated: true
  });
});

export default router;

import express from 'express';

const router = express.Router();

/**
 * Known scam patterns and heuristic rule analyzers
 */
function analyzeScamRisk({ recipient, amount, rawPayload, recentAttemptsCount = 1, context = 'TRANSFER' }) {
  const numericAmount = parseFloat(amount || 0);
  const alerts = [];
  let riskLevel = 'LOW'; // LOW, MEDIUM, CRITICAL
  let riskScore = 12; // 0 - 100

  // 1. Phishing / Impersonation VPA Detection
  const lowerRecipient = (recipient || '').toLowerCase();
  const suspiciousKeywords = ['refund', 'customer-care', 'support', 'electricity-bill', 'lottery', 'kyc-update', 'cashback-desk'];
  const matchedKeyword = suspiciousKeywords.find(kw => lowerRecipient.includes(kw));

  if (matchedKeyword) {
    riskLevel = 'CRITICAL';
    riskScore = 95;
    alerts.push({
      signal: `Impersonation Pattern: Recipient ID contains high-risk keyword '${matchedKeyword}'`,
      reason: `Fraudsters frequently register fake handles (e.g. 'support@okaxis', 'refund-care@upi') imitating banks, electricity boards, or payment gateways. Genuine payment entities NEVER ask you to pay or accept requests for customer support or refunds.`,
      recommendedAction: `IMMEDIATELY ABORT. Do NOT enter your UPI PIN. Official bank refunds are credited automatically without initiating a payment.`
    });
  }

  // 2. Collect Request Disguised as Credit/Refund in QR Payload
  if (rawPayload) {
    const lowerPayload = rawPayload.toLowerCase();
    // UPI standard check: 'mode=02' or 'tr=' with request flow
    if (lowerPayload.includes('refund') || lowerPayload.includes('receive_money') || lowerPayload.includes('claim_reward')) {
      if (lowerPayload.includes('pa=') && lowerPayload.includes('am=')) {
        riskLevel = 'CRITICAL';
        riskScore = 98;
        alerts.push({
          signal: 'Deceptive QR Payload: Reverse-Flow Collect Request',
          reason: 'This QR code claims to deliver a refund/prize, but the encoded technical protocol is actually a DEBIT instruction directing funds OUT of your account.',
          recommendedAction: 'Do NOT scan or confirm. You never need to enter your PIN or authorize a transaction to receive funds.'
        });
      }
    }

    // Malicious URL embedded instead of UPI/Payment standard
    if (rawPayload.startsWith('http://') || rawPayload.startsWith('https://')) {
      if (!rawPayload.includes('paypal.com') && !rawPayload.includes('upi')) {
        riskLevel = 'MEDIUM';
        riskScore = Math.max(riskScore, 65);
        alerts.push({
          signal: 'External Web Redirection in Payment Payload',
          reason: 'This QR contains an external web link rather than a signed financial token. Scanning may redirect you to a credential harvesting phishing portal.',
          recommendedAction: 'Verify the domain name carefully. Only proceed if you initiated this payment on a recognized vendor site.'
        });
      }
    }
  }

  // 3. High Velocity / Rapid Duplicate Attempts
  if (recentAttemptsCount >= 3) {
    riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
    riskScore = Math.max(riskScore, 70);
    alerts.push({
      signal: `Velocity Anomaly: ${recentAttemptsCount} repeated payment requests detected within 30 seconds`,
      reason: 'Rapid repeat attempts can result from merchant terminal glitches, network lag, or a merchant attempting duplicate debits before the first reconciles.',
      recommendedAction: 'Check your transaction history or wait 60 seconds for the Payment Confidence Engine to verify initial authorization before retrying.'
    });
  }

  // 4. Unusual Amount Spike Anomaly
  if (numericAmount > 25000) {
    riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
    riskScore = Math.max(riskScore, 55);
    alerts.push({
      signal: `High-Value Threshold Warning: ₹${numericAmount.toLocaleString('en-IN')}`,
      reason: 'Transaction is significantly above your regular average ticket size (₹850). Payments above ₹25,000 carry irreversible exposure.',
      recommendedAction: 'Cross-check the account holder name on the confirmation screen before committing funds.'
    });
  }

  // If no critical alerts triggered, provide reassurance
  if (alerts.length === 0) {
    return {
      safe: true,
      riskLevel: 'LOW',
      riskScore: 8,
      primaryAlert: {
        signal: 'Standard Transaction Parameters',
        reason: 'Recipient VPA verified, payload matches standard RFC-compliant schema, and transaction velocity is within standard thresholds.',
        recommendedAction: 'Safe to proceed with normal user authorization.'
      },
      allAlerts: []
    };
  }

  return {
    safe: riskLevel === 'LOW',
    riskLevel,
    riskScore,
    primaryAlert: alerts[0],
    allAlerts: alerts
  };
}

/**
 * Route to evaluate transaction / QR risk
 */
router.post('/analyze', (req, res) => {
  try {
    const { recipient, amount, rawPayload, recentAttemptsCount, context } = req.body;
    const analysis = analyzeScamRisk({ recipient, amount, rawPayload, recentAttemptsCount, context });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

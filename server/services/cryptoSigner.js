import crypto from 'crypto';

// In-memory nonce store for replay attack protection
// In a distributed production system, this would be backed by Redis with TTL
const usedNonces = new Map();

const MASTER_SECRET = process.env.OFFLINE_PASSPORT_SECRET || 'paybastion_master_auth_secret_k9x2m4p8z1';

/**
 * Generate HMAC-SHA256 signature for offline authorization payload
 */
export function signOfflinePayload(payload) {
  const serialized = [
    payload.authId,
    payload.senderId,
    payload.recipientId,
    payload.amount,
    payload.currency,
    payload.nonce,
    payload.expiresAt,
  ].join('|');

  const hmac = crypto.createHmac('sha256', MASTER_SECRET);
  hmac.update(serialized);
  return hmac.digest('hex');
}

/**
 * Verify an offline authorization QR code payload
 * Validates:
 * 1. Cryptographic HMAC signature integrity
 * 2. Expiry timestamp
 * 3. Replay attack check (nonce reuse prevention)
 * 4. Maximum limit compliance
 */
export function verifyOfflinePassport(passportData) {
  const {
    authId,
    senderId,
    recipientId,
    amount,
    currency = 'INR',
    nonce,
    expiresAt,
    signature,
    createdAt
  } = passportData;

  const now = Date.now();

  // 1. Structure validation
  if (!authId || !senderId || !recipientId || !amount || !nonce || !expiresAt || !signature) {
    return {
      valid: false,
      code: 'MALFORMED_PAYLOAD',
      message: 'Missing required cryptographic fields in authorization payload.',
    };
  }

  // 2. Check Expiry
  const expiryTime = new Date(expiresAt).getTime();
  if (now > expiryTime) {
    const expiredSecondsAgo = Math.round((now - expiryTime) / 1000);
    return {
      valid: false,
      code: 'AUTHORIZATION_EXPIRED',
      message: `Offline passport authorization expired ${expiredSecondsAgo}s ago. Offline tokens have strict TTLs.`,
      expiredAt: expiresAt,
      scannedAt: new Date().toISOString()
    };
  }

  // 3. Replay Attack Prevention
  if (usedNonces.has(nonce)) {
    const previousRedemption = usedNonces.get(nonce);
    return {
      valid: false,
      code: 'REPLAY_ATTACK_DETECTED',
      message: `CRITICAL SECURITY ALERT: This offline authorization token (Nonce: ${nonce}) has ALREADY been settled on ${previousRedemption.settledAt}. Replay attempts are blocked.`,
      originalSettledAt: previousRedemption.settledAt,
      scannedAt: new Date().toISOString()
    };
  }

  // 4. Verify HMAC Signature
  const expectedSignature = signOfflinePayload({
    authId,
    senderId,
    recipientId,
    amount,
    currency,
    nonce,
    expiresAt
  });

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValidSignature) {
    return {
      valid: false,
      code: 'SIGNATURE_MISMATCH',
      message: 'Cryptographic signature is invalid! The offline payload was tampered with or issued by an untrusted key.',
    };
  }

  // 5. Amount Limit Check (Demonstration limit: ₹2,000 max per offline token)
  const numericAmount = parseFloat(amount);
  if (numericAmount > 2000) {
    return {
      valid: false,
      code: 'LIMIT_EXCEEDED',
      message: `Offline authorization amount ₹${numericAmount} exceeds maximum offline ceiling of ₹2,000 for zero-connectivity safety.`,
    };
  }

  // Register nonce in used cache with expiry TTL
  usedNonces.set(nonce, {
    authId,
    settledAt: new Date().toISOString(),
    amount,
    recipientId,
  });

  return {
    valid: true,
    code: 'OFFLINE_AUTHORIZED_PENDING_SETTLEMENT',
    message: 'Cryptographic signature verified. Token accepted for delayed batch settlement.',
    isFinalSettlement: false, // Critical rule: offline auth is never final settlement
    settlementStatus: 'SETTLEMENT_PENDING',
    settlementHoldId: `HOLD-${Date.now().toString(36).toUpperCase()}`,
    verifiedAt: new Date().toISOString(),
    recipient: recipientId,
    amount,
    currency
  };
}

/**
 * Flush cache for demonstration / test resetting
 */
export function resetReplayCache() {
  usedNonces.clear();
  return { success: true, count: 0 };
}

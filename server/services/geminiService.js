// AI Service for Natural Language Payment State Explanation and Scam Analysis
// Uses Gemini API when GEMINI_API_KEY is available; falls back cleanly to deterministic heuristic rules.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Generate human-friendly explanation for a payment state and recovery recommendation
 */
export async function explainTransactionState({ state, amount, recipient, failurePoint, providerResponse }) {
  // If Gemini API Key is configured, attempt call
  if (GEMINI_API_KEY) {
    try {
      const prompt = `You are the AI Payment Confidence Engine for PayBastion, a payment resilience platform.
Explain this transaction state in 2-3 concise, high-trust sentences for a non-technical user.
State: ${state}
Amount: ${amount}
Recipient: ${recipient}
Failure Point: ${failurePoint || 'Client network timeout during gateway roundtrip'}
Provider Details: ${JSON.stringify(providerResponse || {})}

Rules:
1. Never promise money has moved if status is Pending, Unknown, or Offline Auth.
2. Clearly explain where the money is right now.
3. State whether it is safe to retry or if the user should wait.
4. Output strictly JSON with keys: "userExplanation", "technicalDiagnosis", "safeToRetry" (boolean), "recommendedAction".`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return JSON.parse(text);
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic explanation:', err.message);
    }
  }

  // Deterministic Explainability Engine
  return getDeterministicExplanation(state, failurePoint);
}

export function getDeterministicExplanation(state, failurePoint) {
  switch (state) {
    case 'CONFIRMED':
      return {
        userExplanation: 'Your payment was successfully captured and verified by the destination clearinghouse. No duplicate charges occurred.',
        technicalDiagnosis: 'Idempotency key validated. Provider returned HTTP 200/CAPTURE_COMPLETED with matching non-repudiation signature.',
        safeToRetry: false,
        recommendedAction: 'Transaction is complete. Retrying will create a duplicate payment.'
      };

    case 'PENDING_VERIFICATION':
      return {
        userExplanation: 'Your payment instruction reached the gateway, but final bank acknowledgement was delayed. The system is actively querying the bank status.',
        technicalDiagnosis: 'Timeout occurred at client ACK phase after gateway ingress. Payment may have settled upstream; reconciler polling provider with original idempotency token.',
        safeToRetry: false,
        recommendedAction: 'Do NOT press pay again. PayBastion is verifying the existing order to prevent double debits.'
      };

    case 'OUTCOME_UNKNOWN':
      return {
        userExplanation: 'The network connection dropped while processing your transfer. We cannot confirm yet whether funds left your account or were refunded.',
        technicalDiagnosis: 'Network socket severed mid-flight (TCP RST or packet loss). Gateway status indeterminate; idempotency lock engaged on client and gateway.',
        safeToRetry: false,
        recommendedAction: 'Hold tight. The Smart Recovery Engine is conducting a non-debit status inquiry. Do not re-initiate payment.'
      };

    case 'OFFLINE_AUTHORIZATION':
      return {
        userExplanation: 'An offline cryptographically signed token was created. Money has NOT been transferred yet; it is held in settlement queue until online sync.',
        technicalDiagnosis: 'HMAC-SHA256 signature generated locally with strict TTL (15m) and nonce replay protection. Marked as SETTLEMENT_PENDING.',
        safeToRetry: false,
        recommendedAction: 'Present QR code to merchant terminal. Once connectivity is restored, the batch will settle automatically.'
      };

    case 'FAILED':
      return {
        userExplanation: 'The bank or payment provider confirmed the payment did not succeed. No money was deducted from your account.',
        technicalDiagnosis: 'Provider returned explicit rejection code (e.g., INSUFFICIENT_FUNDS, TIMED_OUT_BEFORE_DEBIT, USER_CANCELLED). Lock released.',
        safeToRetry: true,
        recommendedAction: 'You can safely attempt this payment again or switch to an alternate payment method.'
      };

    case 'NEEDS_REVIEW':
    default:
      return {
        userExplanation: 'A pattern anomaly was flagged on this transaction. A human or secondary verification step is required before proceeding.',
        technicalDiagnosis: 'Scam Guardian or Risk Engine triggered high-entropy score (unusual recipient velocity, mismatch in VPA, or tampered QR payload).',
        safeToRetry: false,
        recommendedAction: 'Review the recipient credentials carefully in Scam Guardian before authorizing any release.'
      };
  }
}

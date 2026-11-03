import { getDatabase } from '../config/database.js';
import {
  getTransactionByIdempotencyKey,
  getTransactionById,
  createTransaction,
  updateTransactionState,
  TRANSACTION_STATES
} from './transactionService.js';
import { getPayPalOrderStatus } from './paypalClient.js';
import { explainTransactionState } from './geminiService.js';

/**
 * Register an in-flight or interrupted transaction with an idempotency key.
 * Strictly prevents duplicate submissions.
 */
export function registerRecoveryTransaction({
  idempotencyKey,
  amount,
  recipient,
  recipientName = null,
  sender = 'user-ananya@okaxis',
  channel = 'UPI_ONLINE',
  provider = 'UPI_GATEWAY',
  state = TRANSACTION_STATES.OUTCOME_UNKNOWN,
  isSimulation = false,
  simulatedOutcome = null,
  scenarioId = null,
}, db = null) {
  const database = db || getDatabase();

  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required for recovery registration');
  }

  // Step 1: Check existing record
  const existing = getTransactionByIdempotencyKey(idempotencyKey, database);
  if (existing) {
    return {
      status: 'EXISTING',
      duplicatePrevented: true,
      transaction: existing,
      message: 'Idempotency key already registered. Duplicate submission prevented.',
    };
  }

  // Step 2: Acquire Idempotency Lock & Create Transaction
  const now = new Date().toISOString();
  const txId = `TXN-REC-${Date.now().toString().slice(-6)}`;

  const created = createTransaction({
    id: txId,
    idempotencyKey,
    amount: parseFloat(amount || 0),
    currency: 'INR',
    sender,
    recipient,
    recipientName,
    category: 'Interrupted Transfer',
    channel,
    state,
    confidenceScore: state === 'OUTCOME_UNKNOWN' ? 35 : 65,
    needsReconciliation: true,
    safeToRetry: false,
    isSimulation: Boolean(isSimulation || channel === 'CRASH_SIMULATION'),
    simulatedOutcome,
    scenarioId,
    userExplanation: 'Payment in transit. Network dropped or acknowledgement delayed. Idempotency lock active.',
    technicalDiagnosis: `Idempotency key ${idempotencyKey} locked. Upstream verification required before retry.`,
    logs: [
      {
        timestamp: now,
        event: 'IDEMPOTENCY_LOCK_ACQUIRED',
        detail: `Acquired processing lock for idempotency key ${idempotencyKey} (${channel}).`,
      },
    ],
  }, database);

  return {
    status: 'REGISTERED',
    duplicatePrevented: false,
    transaction: created,
    message: 'Idempotency lock acquired and transaction registered in persistent database.',
  };
}

/**
 * Reconcile an interrupted/uncertain transaction.
 * Queries original provider BEFORE determining outcome.
 * Never assumes SUCCESS!
 */
export async function reconcileRecoveryTransaction(paramsOrKey, db = null) {
  const database = db || getDatabase();

  const params = typeof paramsOrKey === 'string'
    ? { idempotencyKey: paramsOrKey }
    : (paramsOrKey || {});

  const {
    idempotencyKey,
    orderId = null,
    provider = 'UPI_GATEWAY',
    simulatedOutcome = null,
  } = params;

  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required for reconciliation');
  }

  let record = getTransactionByIdempotencyKey(idempotencyKey, database);

  // If not found by idempotency key, also check if it's a transaction ID
  if (!record) {
    record = getTransactionById(idempotencyKey, database);
  }

  if (!record) {
    throw new Error(`No transaction found matching key: ${idempotencyKey}`);
  }

  // Consistent simulation identification:
  const isSimulation = Boolean(
    (simulatedOutcome !== null && simulatedOutcome !== undefined) ||
    record.isSimulation ||
    record.channel === 'CRASH_SIMULATION' ||
    record.metadata?.isSimulation ||
    record.idempotencyKey?.includes('CRASH') ||
    record.idempotencyKey?.includes('SIM') ||
    record.id?.includes('CRASH') ||
    provider === 'SIMULATION' ||
    provider === 'SIMULATED_GATEWAY'
  );

  let providerStatus = 'UNKNOWN';
  let providerReference = record.providerReference || null;
  let diagnosticDetail = '';

  if (isSimulation) {
    // 1. Simulated Provider Ledger Inquiry
    // Resolve deterministic simulated outcome from:
    // a) Explicit call argument: simulatedOutcome
    // b) Stored metadata: record.metadata?.simulatedOutcome
    // c) Stored scenarioId or idempotency key pattern:
    //    - SCENARIO_1_NETWORK_DROP / CRASH-01 / NO_DEBIT -> FAILED (Bank ledger confirms no debit)
    //    - SCENARIO_2_TIMEOUT_ACK / CRASH-02 / CONFIRMED_DEBIT -> SUCCESS (Clearinghouse confirms debit)
    //    - INDETERMINATE / UNKNOWN -> UNKNOWN (Simulated upstream switch unresponsive)

    let targetOutcome = simulatedOutcome;
    if (!targetOutcome && record.metadata?.simulatedOutcome) {
      targetOutcome = record.metadata.simulatedOutcome;
    }

    if (!targetOutcome) {
      const keyUpper = (record.idempotencyKey || '').toUpperCase();
      const idUpper = (record.id || '').toUpperCase();
      const scenarioUpper = (record.metadata?.scenarioId || '').toUpperCase();

      if (
        scenarioUpper.includes('SCENARIO_1') ||
        scenarioUpper.includes('NETWORK_DROP') ||
        keyUpper.includes('CRASH-01') ||
        idUpper.includes('CRASH-01') ||
        keyUpper.includes('NO-DEBIT') ||
        keyUpper.includes('NO_DEBIT')
      ) {
        targetOutcome = 'FAILED';
      } else if (
        scenarioUpper.includes('SCENARIO_2') ||
        scenarioUpper.includes('TIMEOUT_ACK') ||
        keyUpper.includes('CRASH-02') ||
        idUpper.includes('CRASH-02') ||
        keyUpper.includes('CONFIRMED')
      ) {
        targetOutcome = 'SUCCESS';
      } else if (
        keyUpper.includes('INDETERMINATE') ||
        keyUpper.includes('UNKNOWN') ||
        idUpper.includes('INDETERMINATE') ||
        idUpper.includes('UNKNOWN') ||
        scenarioUpper.includes('UNKNOWN')
      ) {
        targetOutcome = 'UNKNOWN';
      } else if (record.state === 'CONFIRMED' && record.providerReference) {
        targetOutcome = 'SUCCESS';
      } else {
        // Fallback for simulated transactions where no debit occurred before drop
        targetOutcome = 'FAILED';
      }
    }

    const outcomeUpper = String(targetOutcome).toUpperCase();
    if (outcomeUpper === 'SUCCESS' || outcomeUpper === 'CONFIRMED' || outcomeUpper === 'CONFIRMED_DEBIT') {
      providerStatus = 'SUCCESS';
      providerReference = providerReference || `SIM-UTR-${Date.now().toString().slice(-8)}`;
      diagnosticDetail = 'Simulated clearinghouse probe: Confirmed debit at upstream banking switch (DEMO SIMULATION).';
    } else if (outcomeUpper === 'FAILED' || outcomeUpper === 'REJECTED' || outcomeUpper === 'NO_DEBIT' || outcomeUpper === 'ABORTED') {
      providerStatus = 'FAILED';
      diagnosticDetail = 'Simulated clearinghouse probe: Bank ledger confirmed zero debit was executed. Lock released safely (DEMO SIMULATION).';
    } else {
      providerStatus = 'UNKNOWN';
      diagnosticDetail = 'Simulated clearinghouse probe: Upstream switch reports indeterminate status. Lock retained (DEMO SIMULATION).';
    }

  } else if (provider === 'PAYPAL' && (orderId || record.idempotencyKey.includes('PP-') || record.id.startsWith('PAYPAL-'))) {
    // 2. PayPal Sandbox REST API Inquiry
    const ppOrderId = orderId || record.id.replace('PAYPAL-', '') || record.idempotencyKey.replace('IDEMP-PP-', '');
    try {
      const paypalStatus = await getPayPalOrderStatus(ppOrderId);
      if (paypalStatus && paypalStatus.status === 'COMPLETED') {
        providerStatus = 'SUCCESS';
        providerReference = `PAYPAL-CAP-${ppOrderId}`;
        diagnosticDetail = `Official PayPal REST API verified status: COMPLETED. Order: ${ppOrderId}`;
      } else if (paypalStatus && (paypalStatus.status === 'VOIDED' || paypalStatus.status === 'CANCELLED')) {
        providerStatus = 'FAILED';
        diagnosticDetail = `Official PayPal REST API returned terminal status: ${paypalStatus.status}`;
      } else {
        providerStatus = 'PENDING';
        diagnosticDetail = `Official PayPal REST API reported in-flight status: ${paypalStatus?.status || 'PENDING'}`;
      }
    } catch (ppErr) {
      providerStatus = 'UNKNOWN';
      diagnosticDetail = `PayPal status inquiry error: ${ppErr.message}`;
    }

  } else {
    // 3. Genuine Real Provider Inquiry (Non-Simulated)
    // CRITICAL: We NEVER blindly assume SUCCESS!
    // Without genuine provider confirmation or explicit simulation, return UNKNOWN or check if transaction already settled
    if (record.state === 'CONFIRMED' && record.providerReference) {
      providerStatus = 'SUCCESS';
      providerReference = record.providerReference;
      diagnosticDetail = `Previous genuine provider confirmation on record: ${providerReference}.`;
    } else {
      // Honest UNKNOWN status
      providerStatus = 'UNKNOWN';
      diagnosticDetail = 'Live bank switch could not confirm settlement ACK. Retaining idempotency lock to protect against duplicate charge.';
    }
  }

  // Step 2: Determine next state according to strict invariants
  let nextState = TRANSACTION_STATES.OUTCOME_UNKNOWN;
  let resolutionMessage = '';
  let safeToRetry = false;

  if (providerStatus === 'SUCCESS') {
    nextState = TRANSACTION_STATES.CONFIRMED;
    safeToRetry = false;
    resolutionMessage = isSimulation
      ? `Simulated clearinghouse confirmed debit of ${record.currency} ${record.amount}. Reference: ${providerReference}. Original transaction verified (DEMO SIMULATION).`
      : `Clearinghouse confirmed debit of ${record.currency} ${record.amount}. Reference: ${providerReference}. Original transaction verified. Duplicate payment prevented.`;
  } else if (providerStatus === 'FAILED') {
    nextState = TRANSACTION_STATES.FAILED;
    safeToRetry = true;
    resolutionMessage = isSimulation
      ? `Simulated bank ledger confirmed zero debit was executed prior to network dropout. Idempotency lock released safely. Safe to retry with a new payment (DEMO SIMULATION).`
      : `Payment provider explicitly confirmed transaction failed upstream prior to account debit. Idempotency lock safely released. Safe to retry.`;
  } else {
    // Indeterminate / Pending
    nextState = record.state === 'PENDING_VERIFICATION'
      ? TRANSACTION_STATES.PENDING_VERIFICATION
      : TRANSACTION_STATES.OUTCOME_UNKNOWN;
    safeToRetry = false;
    resolutionMessage = isSimulation
      ? `Simulated bank switch status is indeterminate or timed out. Idempotency lock retained to prevent duplicate debit. Do NOT re-initiate payment (DEMO SIMULATION).`
      : `Provider status is indeterminate or pending. Idempotency lock retained to prevent duplicate debit. Do NOT re-initiate payment.`;
  }

  // Step 3: Get AI or deterministic explanation
  const explanation = await explainTransactionState({
    state: nextState,
    amount: record.amount,
    recipient: record.recipient,
    failurePoint: diagnosticDetail,
    providerResponse: {
      providerStatus,
      providerReference,
      isSimulation,
      diagnosticDetail
    },
  });

  // Step 4: Persist updated state, audit log, and explanation in SQLite
  const updatedTx = updateTransactionState(record.id, nextState, {
    confidenceScore: nextState === 'CONFIRMED' ? 99 : (nextState === 'FAILED' ? 100 : 40),
    providerReference,
    reconciliationStatus: (nextState === 'CONFIRMED' || nextState === 'FAILED') ? 'RECONCILED' : 'PENDING',
    safeToRetry,
    needsReconciliation: nextState !== 'CONFIRMED' && nextState !== 'FAILED',
    explanation,
    isSimulation,
    logEvent: 'RECONCILIATION_QUERY',
    logDetail: resolutionMessage,
  }, database);

  return {
    success: true,
    transaction: updatedTx,
    reconciliationResult: {
      resolvedState: nextState,
      duplicatePrevented: nextState === 'CONFIRMED',
      safeToRetry,
      message: resolutionMessage,
      providerReference,
      isSimulation,
      explanation,
    },
  };
}

/**
 * List pending transactions requiring reconciliation
 */
export function getPendingRecoveryTransactions(db = null) {
  const database = db || getDatabase();
  const rows = database.prepare(`
    SELECT * FROM transactions
    WHERE transaction_state IN ('PENDING_VERIFICATION', 'OUTCOME_UNKNOWN')
    ORDER BY created_at DESC
  `).all();

  return rows.map(r => getTransactionById(r.id, database));
}

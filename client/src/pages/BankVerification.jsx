
import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle } from 'lucide-react';

export default function BankVerification({ bank, onVerify }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [verified, setVerified] = useState(false);

  const handleVerification = () => {
    if (accountNumber.length < 4) {
      alert('Please enter at least 4 digits for the demo account.');
      return;
    }

    setVerified(true);
  };

  return (
    <div className="min-h-screen bg-[#080d1b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111a2e] border border-gray-800 rounded-2xl p-8">

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-9 h-9 text-blue-400" />
          </div>

          <h1 className="text-2xl font-bold">
            Bank Verification
          </h1>

          <p className="text-gray-400 text-sm mt-2">
            Securely simulate linking your bank account.
          </p>
        </div>

        <div className="bg-[#080d1b] border border-gray-700 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 mb-2">
            SELECTED BANK
          </p>

          <div className="font-semibold text-lg">
            {bank?.name || 'Selected Bank'}
          </div>
        </div>

        {!verified ? (
          <>
            <label className="text-sm text-gray-300 block mb-2">
              Demo Account Number
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={16}
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/\D/g, ''))
              }
              placeholder="Enter any 4–16 digits"
              className="w-full bg-[#080d1b] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              onClick={handleVerification}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold mt-5 transition"
            >
              Verify Demo Account
            </button>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />

            <h2 className="text-xl font-bold text-emerald-400">
              Demo Verification Successful!
            </h2>

            <p className="text-gray-400 text-sm mt-2">
              Your simulated bank account is linked.
            </p>

            <button
              onClick={() => onVerify(bank)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold mt-5 transition"
            >
              Continue to PayBastion
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-6">
          <Lock className="w-3 h-3" />
          Simulation only — no real bank data is collected.
        </div>

      </div>
    </div>
  );
}


import React, { useState } from 'react';

const banks = [
  { name: 'State Bank of India', short: 'SBI', color: '#2b65b0' },
  { name: 'HDFC Bank', short: 'HDFC', color: '#004c8f' },
  { name: 'ICICI Bank', short: 'ICICI', color: '#b02a30' },
  { name: 'Axis Bank', short: 'AXIS', color: '#8b1e5d' },
  { name: 'Canara Bank', short: 'CANARA', color: '#087b48' },
  { name: 'Punjab National Bank', short: 'PNB', color: '#e36b20' },
  { name: 'Bank of Baroda', short: 'BOB', color: '#e85b24' },
  { name: 'Union Bank of India', short: 'UNION', color: '#0069a6' },
  { name: 'Kotak Mahindra Bank', short: 'KOTAK', color: '#d71920' },
  { name: 'Indian Bank', short: 'INDIAN', color: '#004b8d' },
  { name: 'Karnataka Bank', short: 'KBL', color: '#b21f2d' },
  { name: 'IDFC FIRST Bank', short: 'IDFC', color: '#9c1f3c' },
];

export default function BankSelection({ onContinue }) {
  const [selectedBank, setSelectedBank] = useState(null);
  const [search, setSearch] = useState('');

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#080d1b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="text-blue-400 text-sm font-semibold tracking-widest mb-3">
            PAYBASTION AI
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Link Your Bank
          </h1>

          <p className="text-gray-400">
            Select your bank to continue to your secure payment dashboard.
          </p>
        </div>

        <div className="bg-[#111a2e] border border-gray-800 rounded-2xl p-6">
          <input
            type="text"
            placeholder="Search your bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080d1b] border border-gray-700 rounded-xl px-4 py-3 mb-6 outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredBanks.map((bank) => (
              <button
                key={bank.short}
                onClick={() => setSelectedBank(bank)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition ${
                  selectedBank?.short === bank.short
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-[#0b1222] hover:border-gray-500'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                  style={{ backgroundColor: bank.color }}
                >
                  {bank.short}
                </div>

                <div className="flex-1">
                  <div className="font-medium">{bank.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Simulated bank connection
                  </div>
                </div>

                {selectedBank?.short === bank.short && (
                  <span className="text-blue-400 text-xl">✓</span>
                )}
              </button>
            ))}
          </div>

          {filteredBanks.length === 0 && (
            <p className="text-center text-gray-400 py-6">
              No banks found. Try another search.
            </p>
          )}

          <button
            disabled={!selectedBank}
            onClick={() => onContinue(selectedBank)}
            className="w-full mt-6 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition"
          >
            Continue
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Demo only: No real bank credentials, OTPs, or financial data are
            collected. Bank linking is simulated.
          </p>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";

const API = "http://localhost:5000/api/wallet";

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [pin, setPin] = useState("");
  const [walletPin, setWalletPin] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);

  const loadBalance = async () => {
    try {
      const response = await fetch(`${API}/balance`);
      const data = await response.json();

      if (response.ok) {
        setBalance(data.balance);
      }
    } catch (error) {
      setMessage("Unable to connect to wallet server.");
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const configureWalletPin = async () => {
    if (!walletPin || walletPin.length !== 4) {
      setMessage("Please enter a 4-digit PIN.");
      return;
    }

    try {
      const response = await fetch(`${API}/set-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: walletPin }),
      });

      const data = await response.json();
      setMessage(data.message || data.error);

      if (response.ok) {
        setWalletPin("");
      }
    } catch (error) {
      setMessage("Unable to set PIN. Check the server.");
    }
  };

  const addDemoMoney = async () => {
    const demoAmount = Number(amount);

    if (!demoAmount || demoAmount <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    try {
      const response = await fetch(`${API}/add-demo-money`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: demoAmount }),
      });

      const data = await response.json();
      setMessage(data.message || data.error);

      if (response.ok) {
        setAmount("");
        await loadBalance();
      }
    } catch (error) {
      setMessage("Unable to add demo money.");
    }
  };

  const makePayment = async () => {
    if (!recipient.trim()) {
      setMessage("Enter recipient name.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    if (pin.length !== 4) {
      setMessage("Enter your 4-digit PIN.");
      return;
    }

    try {
      const response = await fetch(`${API}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient,
          amount: Number(amount),
          pin,
        }),
      });

      const data = await response.json();
      setMessage(data.message || data.error);

      if (response.ok) {
        setHistory((previous) => [
          {
            recipient,
            amount: Number(amount),
            date: new Date().toLocaleString(),
          },
          ...previous,
        ]);

        setRecipient("");
        setAmount("");
        setPin("");

        await loadBalance();
      }
    } catch (error) {
      setMessage("Payment failed. Check the wallet server.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">
          My Wallet
        </h1>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
          <p className="text-slate-400">Available Balance</p>

          <h2 className="text-4xl font-bold text-emerald-400 mt-2">
            ₹{Number(balance).toFixed(2)}
          </h2>

          <button
            onClick={loadBalance}
            className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
          >
            Refresh Balance
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 space-y-4">
          <h2 className="text-xl font-semibold">
            Set Wallet PIN
          </h2>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={walletPin}
            onChange={(e) =>
              setWalletPin(e.target.value.replace(/\D/g, ""))
            }
            placeholder="Enter 4-digit PIN"
            className="w-full bg-slate-800 p-3 rounded-lg outline-none"
          />

          <button
            onClick={configureWalletPin}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg"
          >
            Set PIN
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 space-y-4">
          <h2 className="text-xl font-semibold">
            Add Demo Money
          </h2>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in ₹"
            className="w-full bg-slate-800 p-3 rounded-lg outline-none"
          />

          <button
            onClick={addDemoMoney}
            className="w-full bg-emerald-600 hover:bg-emerald-700 p-3 rounded-lg"
          >
            Add Demo Money
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 space-y-4">
          <h2 className="text-xl font-semibold">
            Send Payment
          </h2>

          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient name"
            className="w-full bg-slate-800 p-3 rounded-lg outline-none"
          />

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Payment amount in ₹"
            className="w-full bg-slate-800 p-3 rounded-lg outline-none"
          />

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, ""))
            }
            placeholder="Enter wallet PIN"
            className="w-full bg-slate-800 p-3 rounded-lg outline-none"
          />

          <button
            onClick={makePayment}
            className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-lg"
          >
            Send Payment
          </button>
        </div>

        {message && (
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            {message}
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">
            Transaction History
          </h2>

          {history.length === 0 ? (
            <p className="text-slate-400">
              No transactions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((transaction, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-slate-800 p-3 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {transaction.recipient}
                    </p>
                    <p className="text-xs text-slate-400">
                      {transaction.date}
                    </p>
                  </div>

                  <p className="text-red-400 font-semibold">
                    -₹{transaction.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  WifiOff
} from 'lucide-react';

export default function Login({ onLogin, onDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Please enter your email and password');
      return;
    }

    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4">

      <div className="w-full max-w-6xl grid md:grid-cols-2
        bg-[#0d1526] border border-slate-800 rounded-3xl
        overflow-hidden shadow-2xl">

        {/* Left Side - Login Form */}
        <div className="p-8 md:p-12">

          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                PayBastion AI
              </h1>
              <p className="text-xs text-slate-400">
                Payment Resilience Platform
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h2>

          <p className="text-slate-400 mb-8">
            Sign in to access your secure payment dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Email Address
              </label>

              <div className="flex items-center gap-3 bg-[#080d19]
                border border-slate-700 rounded-xl px-4">

                <Mail className="w-5 h-5 text-slate-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full py-3 bg-transparent outline-none
                    text-white placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <div className="flex items-center gap-3 bg-[#080d19]
                border border-slate-700 rounded-xl px-4">

                <Lock className="w-5 h-5 text-slate-500" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full py-3 bg-transparent outline-none
                    text-white placeholder-slate-500"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white"
                >
                  {showPassword
                    ? <EyeOff className="w-5 h-5" />
                    : <Eye className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">

              <label className="flex items-center gap-2 text-slate-400">
                <input type="checkbox" className="accent-blue-500" />
                Remember me
              </label>

              <button
                type="button"
                className="text-blue-400 hover:text-blue-300"
                onClick={() =>
                  alert('Password recovery will be added later.')
                }
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2
                bg-blue-600 hover:bg-blue-500 text-white font-semibold
                py-3.5 rounded-xl transition-all"
            >
              Sign In
              <ArrowRight className="w-5 h-5" />
            </button>

          </form>

          {/* Demo Mode */}
          <button
            onClick={onDemo}
            className="w-full mt-4 py-3 rounded-xl border
              border-slate-700 text-slate-300 hover:bg-slate-800
              transition-all"
          >
            Explore Demo Mode
          </button>

          <p className="text-center text-xs text-slate-500 mt-8">
            SIMULATION: Fictional users and mock money.
            No real banking or credit data is used.
          </p>

        </div>

        {/* Right Side - Branding */}
        <div className="hidden md:flex flex-col justify-center
          items-center p-12 bg-gradient-to-br from-blue-950
          via-[#101d35] to-[#080d19] relative">

          <div className="absolute inset-0 opacity-20
            bg-[radial-gradient(circle_at_center,_#3b82f6,_transparent_65%)]" />

          <div className="relative z-10 text-center">

            <div className="w-28 h-28 mx-auto mb-8 rounded-3xl
              bg-blue-500/10 border border-blue-400/30
              flex items-center justify-center">

              <ShieldCheck className="w-16 h-16 text-blue-400" />
            </div>

            <h2 className="text-4xl font-bold text-white mb-5">
              Payments Without
              <span className="block text-blue-400">
                Interruption
              </span>
            </h2>

            <p className="text-slate-400 max-w-sm mx-auto leading-7">
              Smart payment recovery, offline payment passports,
              AI scam protection, and resilient transactions
              in one platform.
            </p>

            <div className="mt-10 flex items-center justify-center
              gap-3 text-emerald-400 text-sm">

              <WifiOff className="w-5 h-5" />

              <span>Built for unreliable networks</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
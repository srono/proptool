'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [ceaNumber, setCeaNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (ceaNumber && !/^R\d{6}[A-Z]$/i.test(ceaNumber)) {
      setError('Invalid CEA licence format. Expected format: R012345A');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          cea_licence_number: ceaNumber || null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = '/dashboard';
    }
  };

  return (
    <main className="flex min-h-screen bg-onyx">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#859FF4] via-[#0C5AFF] via-[32%] via-brand-deep to-[#0C5AFF] text-white p-14 flex-col justify-between">
        <div className="absolute top-[20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(142,254,255,0.5),transparent)]" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" />
              <path d="M12 7 L12 12 L15 13.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-lg">PropAgent</div>
            <div className="text-[11px] opacity-80">built by 10thirtyLabs</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display text-[44px] font-bold leading-[1.1] tracking-tight max-w-[460px]">
            Your property business, systematised.
          </h1>
          <p className="mt-4 text-[15px] opacity-85 max-w-[440px] leading-relaxed">
            Pipeline, viewings, WhatsApp, and deals — all in one place. Start your 14-day free trial.
          </p>
        </div>
        <div className="relative text-[11px] opacity-70 tracking-wide">
          PDPA-aligned · CEA-aware · Singapore data residency
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-[480px] bg-onyx text-white p-14 flex flex-col justify-center overflow-y-auto">
        <h2 className="font-display text-[28px] font-bold tracking-tight">
          Create your account
        </h2>
        <p className="text-[13px] text-gray-2 mt-1.5">Start your 14-day free trial.</p>

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="signupEmail" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Email
            </label>
            <input
              id="signupEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="signupPhone" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Phone (Singapore)
            </label>
            <input
              id="signupPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567"
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="signupPassword" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Password
            </label>
            <input
              id="signupPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="ceaNumber" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              CEA Licence Number <span className="opacity-60">(optional)</span>
            </label>
            <input
              id="ceaNumber"
              type="text"
              value={ceaNumber}
              onChange={(e) => setCeaNumber(e.target.value.toUpperCase())}
              placeholder="R012345A"
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && (
            <p className="text-sm text-status-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 text-sm font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-2">
          Already have an account?{' '}
          <Link href="/login" className="text-aqua font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

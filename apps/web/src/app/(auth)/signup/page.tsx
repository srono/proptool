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
          <svg width={36} height={36} viewBox="0 0 500 500" fill="none">
            <path d="M 250 0 C 200.555 0 152.22 14.662 111.108 42.133 C 69.995 69.603 37.952 108.648 19.03 154.329 C 0.108 200.011 -4.842 250.277 4.804 298.772 C 14.45 347.268 38.26 391.814 73.224 426.777 C 108.187 461.74 152.732 485.55 201.228 495.196 C 249.723 504.842 299.989 499.892 345.671 480.97 C 391.352 462.048 430.397 430.005 457.868 388.892 C 485.338 347.78 500 299.445 500 250 C 500 183.696 473.661 120.107 426.777 73.223 C 379.893 26.339 316.304 0 250 0 Z M 250 469.894 L 214.53 264.225 L 124.501 124.054 L 285.47 234.855 L 250 469.894 Z" fill="white" fillRule="nonzero"/>
          </svg>
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

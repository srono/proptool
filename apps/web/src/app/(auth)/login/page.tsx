'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#859FF4] via-[#0C5AFF] via-[32%] via-brand-deep to-[#0C5AFF] text-white p-14 flex-col justify-between">
        {/* Aqua glow */}
        <div className="absolute top-[20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(142,254,255,0.5),transparent)]" />

        {/* Logo */}
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

        {/* Tagline */}
        <div className="relative">
          <h1 className="font-display text-[44px] font-bold leading-[1.1] tracking-tight max-w-[460px]">
            Technology execution for Singapore property agents.
          </h1>
          <p className="mt-4 text-[15px] opacity-85 max-w-[440px] leading-relaxed">
            Every lead, viewing, and deal in one place. Built around the
            WhatsApp-and-FB workflow agents already use.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-[11px] opacity-70 tracking-wide">
          PDPA-aligned · CEA-aware · Singapore data residency
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-[480px] bg-onyx text-white p-14 flex flex-col justify-center">
        <h2 className="font-display text-[28px] font-bold tracking-tight">
          Welcome back
        </h2>
        <p className="text-[13px] text-gray-2 mt-1.5">Sign in to continue.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-onyx-card border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-aqua text-[11px] font-semibold cursor-pointer">
                Forgot?
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-status-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 text-sm font-semibold mt-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-onyx-line" />
          <span className="text-[11px] text-gray-2">or</span>
          <div className="flex-1 h-px bg-onyx-line" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full btn-ghost py-3"
        >
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-gray-2">
          New here?{' '}
          <Link href="/signup" className="text-aqua font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

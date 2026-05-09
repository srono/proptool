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

    // Validate CEA number format if provided (e.g., R012345A)
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
      // Trigger auto-creates tenant + user row
      // Small delay to let the DB trigger complete
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = '/dashboard';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-600">Start your 14-day free trial</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="signupEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="signupPhone" className="block text-sm font-medium text-gray-700">
              Phone (Singapore)
            </label>
            <input
              id="signupPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="signupPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="ceaNumber" className="block text-sm font-medium text-gray-700">
              CEA Licence Number{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="ceaNumber"
              type="text"
              value={ceaNumber}
              onChange={(e) => setCeaNumber(e.target.value.toUpperCase())}
              placeholder="R012345A"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

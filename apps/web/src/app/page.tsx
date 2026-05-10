import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            AgentOS
          </h1>
          <p className="text-gray-600">
            Your property business, one app.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Create Account
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          Built for CEA-licensed agents in Singapore
        </p>
      </div>
    </main>
  );
}

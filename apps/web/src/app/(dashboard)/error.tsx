'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-12 h-12 rounded-full bg-status-red/10 border border-status-red/30 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-status-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-white font-display font-bold text-lg">Something went wrong</h2>
      <p className="text-gray-2 text-sm mt-1 text-center max-w-sm">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="btn-primary text-xs mt-4"
      >
        Try again
      </button>
    </div>
  );
}

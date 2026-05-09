import Link from 'next/link';

export default function ToolsPage() {
  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tools</h1>
        <p className="text-sm text-gray-600">Market intelligence and calculators</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/tools/stamp-duty">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <span className="text-3xl">🧮</span>
            <h3 className="text-sm font-semibold text-gray-900 mt-3">Stamp Duty Calculator</h3>
            <p className="text-xs text-gray-500 mt-1">Estimate BSD and ABSD for property purchases</p>
          </div>
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-60">
          <span className="text-3xl">📈</span>
          <h3 className="text-sm font-semibold text-gray-900 mt-3">Transaction History</h3>
          <p className="text-xs text-gray-500 mt-1">URA transaction data by project — coming soon</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-60">
          <span className="text-3xl">🏘️</span>
          <h3 className="text-sm font-semibold text-gray-900 mt-3">Market Comps</h3>
          <p className="text-xs text-gray-500 mt-1">Compare asking vs transacted PSF — coming soon</p>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = { title: 'Tools' };

export default function ToolsPage() {
  return (
    <div className="p-4 lg:p-7 space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Tools</h1>
        <p className="text-[13px] text-gray-2">Market intelligence and calculators</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/tools/stamp-duty">
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-white mt-3">Stamp Duty Calculator</h3>
            <p className="text-xs text-gray-2 mt-1">Estimate BSD and ABSD for property purchases</p>
          </div>
        </Link>

        <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 opacity-60">
          <h3 className="text-sm font-semibold text-white mt-3">Transaction History</h3>
          <p className="text-xs text-gray-2 mt-1">URA transaction data by project — coming soon</p>
        </div>

        <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 opacity-60">
          <h3 className="text-sm font-semibold text-white mt-3">Market Comps</h3>
          <p className="text-xs text-gray-2 mt-1">Compare asking vs transacted PSF — coming soon</p>
        </div>

        <Link href="/tools/ad-copy">
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-white mt-3">Ad Copy Assistant</h3>
            <p className="text-xs text-gray-2 mt-1">Generate compliance-aware social media ad copy</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

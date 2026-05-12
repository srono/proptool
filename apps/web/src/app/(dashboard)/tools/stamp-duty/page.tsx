'use client';

import { useState } from 'react';
import { STAMP_DUTY_DISCLAIMER } from '@agentos/shared';
import type { BuyerProfile, PropertyCount, StampDutyBand } from '@agentos/shared';

// BSD bands (effective 15 Feb 2023)
const BSD_BANDS = [
  { min: 0, max: 180000, rate: 1 },
  { min: 180000, max: 360000, rate: 2 },
  { min: 360000, max: 1000000, rate: 3 },
  { min: 1000000, max: 1500000, rate: 4 },
  { min: 1500000, max: 3000000, rate: 5 },
  { min: 3000000, max: null, rate: 6 },
];

// ABSD rates (effective 27 April 2023)
const ABSD_RATES: Record<BuyerProfile, Record<PropertyCount, number>> = {
  citizen: { '1st': 0, '2nd': 20, '3rd_plus': 30 },
  pr: { '1st': 5, '2nd': 30, '3rd_plus': 35 },
  foreigner: { '1st': 60, '2nd': 60, '3rd_plus': 60 },
  entity: { '1st': 65, '2nd': 65, '3rd_plus': 65 },
  trust: { '1st': 65, '2nd': 65, '3rd_plus': 65 },
};

function calculateBSD(price: number): { total: number; breakdown: StampDutyBand[] } {
  let remaining = price;
  const breakdown: StampDutyBand[] = [];
  let total = 0;

  for (const band of BSD_BANDS) {
    if (remaining <= 0) break;
    const bandSize = band.max ? band.max - band.min : remaining;
    const taxable = Math.min(remaining, bandSize);
    const duty = taxable * (band.rate / 100);
    breakdown.push({
      band_min: band.min,
      band_max: band.max,
      rate_pct: band.rate,
      taxable_amount: taxable,
      duty_amount: duty,
    });
    total += duty;
    remaining -= taxable;
  }

  return { total, breakdown };
}

export default function StampDutyCalculatorPage() {
  const [price, setPrice] = useState<string>('');
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile>('citizen');
  const [propertyCount, setPropertyCount] = useState<PropertyCount>('1st');
  const [result, setResult] = useState<{
    bsd: number;
    absd: number;
    total: number;
    breakdown: StampDutyBand[];
    absdRate: number;
  } | null>(null);

  const handleCalculate = () => {
    const purchasePrice = parseFloat(price.replace(/,/g, ''));
    if (isNaN(purchasePrice) || purchasePrice <= 0) return;

    const { total: bsd, breakdown } = calculateBSD(purchasePrice);
    const absdRate = ABSD_RATES[buyerProfile][propertyCount];
    const absd = purchasePrice * (absdRate / 100);

    setResult({
      bsd,
      absd,
      total: bsd + absd,
      breakdown,
      absdRate,
    });
  };

  return (
    <div className="p-4 lg:p-7 max-w-2xl mx-auto space-y-6">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Stamp Duty Calculator</h1>
        <p className="text-[13px] text-gray-2 mt-1">
          Estimate BSD and ABSD for Singapore property purchases
        </p>
      </div>

      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 space-y-4">
        {/* Purchase Price */}
        <div>
          <label className="text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5 block">
            Purchase Price (S$)
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1,500,000"
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Buyer Profile */}
        <div>
          <label className="text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5 block">
            Buyer Profile
          </label>
          <select
            value={buyerProfile}
            onChange={(e) => setBuyerProfile(e.target.value as BuyerProfile)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="citizen">Singapore Citizen</option>
            <option value="pr">Permanent Resident (PR)</option>
            <option value="foreigner">Foreigner</option>
            <option value="entity">Entity / Company</option>
            <option value="trust">Trust</option>
          </select>
        </div>

        {/* Property Count */}
        <div>
          <label className="text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5 block">
            Property Number
          </label>
          <select
            value={propertyCount}
            onChange={(e) => setPropertyCount(e.target.value as PropertyCount)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="1st">1st Property</option>
            <option value="2nd">2nd Property</option>
            <option value="3rd_plus">3rd or more</option>
          </select>
        </div>

        <button
          onClick={handleCalculate}
          className="btn-primary w-full"
        >
          Calculate
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-onyx-card rounded-2xl border border-onyx-line p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Results</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-onyx-raised rounded-xl">
              <p className="text-xs text-gray-2">BSD</p>
              <p className="text-lg font-bold text-white">
                ${result.bsd.toLocaleString('en-SG', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center p-3 bg-onyx-raised rounded-xl">
              <p className="text-xs text-gray-2">ABSD ({result.absdRate}%)</p>
              <p className="text-lg font-bold text-white">
                ${result.absd.toLocaleString('en-SG', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center p-3 bg-brand/[0.12] rounded-xl border border-brand/50">
              <p className="text-xs text-aqua">Total</p>
              <p className="text-lg font-bold text-aqua">
                ${result.total.toLocaleString('en-SG', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* BSD Breakdown */}
          <div>
            <h3 className="text-sm font-medium text-gray-2 mb-2">BSD Breakdown</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-2">
                  <th className="text-left py-1">Band</th>
                  <th className="text-right py-1">Rate</th>
                  <th className="text-right py-1">Taxable</th>
                  <th className="text-right py-1">Duty</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((band, i) => (
                  <tr key={i} className="border-t border-onyx-line">
                    <td className="py-1.5 text-white">
                      ${band.band_min.toLocaleString()} – {band.band_max ? `$${band.band_max.toLocaleString()}` : '∞'}
                    </td>
                    <td className="text-right text-white">{band.rate_pct}%</td>
                    <td className="text-right text-white">${band.taxable_amount.toLocaleString()}</td>
                    <td className="text-right font-medium text-white">${band.duty_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-2 italic border-t border-onyx-line pt-3">
            {STAMP_DUTY_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}

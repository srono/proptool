import type { BuyerProfile } from '../types/stamp-duty';
import type { PropertyType } from '../types/listing';

export type EligibilityStatus = 'eligible' | 'conditional' | 'restricted';

export interface EligibilityResult {
  status: EligibilityStatus;
  badge: '🟢' | '🟡' | '🔴';
  label: string;
  note: string | null;
  absd_rate_pct: number;
}

/**
 * Singapore property purchase eligibility matrix.
 * Based on current rules as of 2025.
 * This is a static reference — the DB `eligibility_rules` table is the source of truth.
 */
export const ELIGIBILITY_MATRIX: Record<
  BuyerProfile,
  Record<PropertyType, Record<'1st' | '2nd' | '3rd_plus', EligibilityResult>>
> = {
  citizen: {
    hdb: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: null, absd_rate_pct: 0 },
      '2nd': { status: 'conditional', badge: '🟡', label: 'Must sell existing HDB', note: 'HDB ownership rules apply', absd_rate_pct: 20 },
      '3rd_plus': { status: 'conditional', badge: '🟡', label: 'Upgrade rules apply', note: 'Must meet MOP and eligibility', absd_rate_pct: 30 },
    },
    condo: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: null, absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (20% ABSD)', note: null, absd_rate_pct: 20 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (30% ABSD)', note: null, absd_rate_pct: 30 },
    },
    landed: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: null, absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (20% ABSD)', note: null, absd_rate_pct: 20 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (30% ABSD)', note: null, absd_rate_pct: 30 },
    },
    commercial: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
    },
  },
  pr: {
    hdb: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible (resale only)', note: 'PRs can only buy resale HDB', absd_rate_pct: 5 },
      '2nd': { status: 'conditional', badge: '🟡', label: 'Must sell existing HDB', note: 'PRs limited to 1 HDB', absd_rate_pct: 30 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'PRs limited to 1 HDB', absd_rate_pct: 0 },
    },
    condo: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible (5% ABSD)', note: null, absd_rate_pct: 5 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (30% ABSD)', note: null, absd_rate_pct: 30 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (35% ABSD)', note: null, absd_rate_pct: 35 },
    },
    landed: {
      '1st': { status: 'conditional', badge: '🟡', label: 'SLA approval required', note: 'PRs need SLA approval for landed property', absd_rate_pct: 5 },
      '2nd': { status: 'conditional', badge: '🟡', label: 'SLA approval + 30% ABSD', note: 'PRs need SLA approval for landed property', absd_rate_pct: 30 },
      '3rd_plus': { status: 'conditional', badge: '🟡', label: 'SLA approval + 35% ABSD', note: 'PRs need SLA approval for landed property', absd_rate_pct: 35 },
    },
    commercial: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
    },
  },
  foreigner: {
    hdb: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy HDB', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy HDB', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy HDB', absd_rate_pct: 0 },
    },
    condo: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible (60% ABSD)', note: 'High ABSD applies', absd_rate_pct: 60 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (60% ABSD)', note: 'High ABSD applies', absd_rate_pct: 60 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (60% ABSD)', note: 'High ABSD applies', absd_rate_pct: 60 },
    },
    landed: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy landed property (except Sentosa Cove approved)', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy landed property', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Foreigners cannot buy landed property', absd_rate_pct: 0 },
    },
    commercial: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
    },
  },
  entity: {
    hdb: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Entities cannot buy HDB', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Entities cannot buy HDB', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Entities cannot buy HDB', absd_rate_pct: 0 },
    },
    condo: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Entity rate applies', absd_rate_pct: 65 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Entity rate applies', absd_rate_pct: 65 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Entity rate applies', absd_rate_pct: 65 },
    },
    landed: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Entities generally cannot buy landed', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Entities generally cannot buy landed', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Entities generally cannot buy landed', absd_rate_pct: 0 },
    },
    commercial: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
    },
  },
  trust: {
    hdb: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Trusts cannot buy HDB', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Trusts cannot buy HDB', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Not eligible', note: 'Trusts cannot buy HDB', absd_rate_pct: 0 },
    },
    condo: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Trust rate applies', absd_rate_pct: 65 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Trust rate applies', absd_rate_pct: 65 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible (65% ABSD)', note: 'Trust rate applies', absd_rate_pct: 65 },
    },
    landed: {
      '1st': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Trusts generally cannot buy landed', absd_rate_pct: 0 },
      '2nd': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Trusts generally cannot buy landed', absd_rate_pct: 0 },
      '3rd_plus': { status: 'restricted', badge: '🔴', label: 'Restricted', note: 'Trusts generally cannot buy landed', absd_rate_pct: 0 },
    },
    commercial: {
      '1st': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '2nd': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
      '3rd_plus': { status: 'eligible', badge: '🟢', label: 'Eligible', note: 'No ABSD for commercial', absd_rate_pct: 0 },
    },
  },
};

export const STAMP_DUTY_DISCLAIMER =
  'This is an estimate only. Consult a lawyer or IRAS for definitive stamp duty obligations.';

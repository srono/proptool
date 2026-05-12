import { addYears } from 'date-fns';

export interface MopInput {
  owned_property_type: string;
  owned_property_key_collection_date: string | null;
  mop_date_manual_override: boolean;
}

export interface MopResult {
  mop_date: string | null;
  mop_date_manual_override: boolean;
}

export function computeMopDate(input: MopInput): MopResult {
  if (input.owned_property_type !== 'hdb') {
    return { mop_date: null, mop_date_manual_override: false };
  }
  if (input.mop_date_manual_override) {
    return { mop_date: null, mop_date_manual_override: true };
  }
  if (input.owned_property_key_collection_date) {
    const keyDate = new Date(input.owned_property_key_collection_date);
    const mop = addYears(keyDate, 5);
    return { mop_date: mop.toISOString().split('T')[0], mop_date_manual_override: false };
  }
  return { mop_date: null, mop_date_manual_override: false };
}

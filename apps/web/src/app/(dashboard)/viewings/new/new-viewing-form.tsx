'use client';

import { ViewingForm } from '../viewing-form';
import type { PreViewingChecklist } from '@agentos/shared';

interface LeadOption {
  id: string;
  status: string;
  deal_type: string;
  pre_viewing_checklist: PreViewingChecklist | null;
  contact: { full_name: string; phone: string }[] | { full_name: string; phone: string } | null;
}

interface ListingOption {
  id: string;
  address: string;
  district: string;
  property_type: string;
  asking_price: number | null;
  asking_rental: number | null;
}

interface Props {
  leads: LeadOption[];
  listings: ListingOption[];
  preselectedLeadId?: string;
  googleCalendarConnected?: boolean;
}

export function NewViewingForm({ leads, listings, preselectedLeadId, googleCalendarConnected }: Props) {
  return (
    <ViewingForm
      leads={leads}
      listings={listings}
      preselectedLeadId={preselectedLeadId}
      googleCalendarConnected={googleCalendarConnected}
    />
  );
}

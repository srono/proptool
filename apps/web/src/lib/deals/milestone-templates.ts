export interface Milestone {
  key: string;
  label: string;
  completed: boolean;
  date: string | null;
  notes: string;
}

const SALE_MILESTONES = [
  { key: 'offer_accepted', label: 'Offer Accepted' },
  { key: 'otp_issued', label: 'OTP Issued' },
  { key: 'otp_exercised', label: 'OTP Exercised' },
  { key: 'booking_fee', label: 'Booking Fee Received' },
  { key: 'caveat_lodged', label: 'Caveat Lodged' },
  { key: 'legal', label: 'Legal Completion' },
  { key: 'completion', label: 'Completion' },
  { key: 'commission_received', label: 'Commission Received' },
];

const RENTAL_MILESTONES = [
  { key: 'offer_accepted', label: 'Offer Accepted' },
  { key: 'loi_signed', label: 'LOI Signed' },
  { key: 'ta_signed', label: 'TA Signed' },
  { key: 'deposit_received', label: 'Deposit Received' },
  { key: 'handover', label: 'Handover' },
  { key: 'commission_received', label: 'Commission Received' },
];

export function getMilestoneTemplate(dealType: string): Milestone[] {
  const template = dealType === 'rental' ? RENTAL_MILESTONES : SALE_MILESTONES;
  return template.map((m) => ({
    key: m.key,
    label: m.label,
    completed: false,
    date: null,
    notes: '',
  }));
}

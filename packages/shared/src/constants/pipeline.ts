import type { PipelineStage } from '../types/lead';

export const PIPELINE_STAGES: { key: PipelineStage; label: string; order: number }[] = [
  { key: 'new_lead', label: 'New Lead', order: 1 },
  { key: 'contacted', label: 'Contacted', order: 2 },
  { key: 'qualified', label: 'Qualified', order: 3 },
  { key: 'viewing_booked', label: 'Viewing Booked', order: 4 },
  { key: 'viewing_done', label: 'Viewing Done', order: 5 },
  { key: 'negotiating', label: 'Negotiating', order: 6 },
  { key: 'otp_loi_issued', label: 'OTP / LOI Issued', order: 7 },
  { key: 'closed_won', label: 'Closed Won', order: 8 },
  { key: 'closed_lost', label: 'Closed Lost', order: 9 },
  { key: 'nurture', label: 'Nurture', order: 10 },
];

export const LEAD_SOURCES = [
  { key: 'facebook_ad', label: 'Facebook Ad', icon: '📘' },
  { key: 'instagram_ad', label: 'Instagram Ad', icon: '📷' },
  { key: 'portal', label: 'Portal', icon: '🏠' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'referral', label: 'Referral', icon: '🤝' },
  { key: 'open_house', label: 'Open House', icon: '🏡' },
  { key: 'web_form', label: 'Web Form', icon: '🌐' },
  { key: 'manual', label: 'Manual', icon: '✏️' },
] as const;

export const URGENCY_CONFIG = {
  hot: { label: 'Hot', color: 'red', emoji: '🔴' },
  warm: { label: 'Warm', color: 'yellow', emoji: '🟡' },
  cold: { label: 'Cold', color: 'blue', emoji: '🔵' },
} as const;

export const SINGAPORE_DISTRICTS = [
  { code: 'D01', name: 'Raffles Place, Cecil, Marina, People\'s Park' },
  { code: 'D02', name: 'Anson, Tanjong Pagar' },
  { code: 'D03', name: 'Queenstown, Tiong Bahru' },
  { code: 'D04', name: 'Telok Blangah, Harbourfront' },
  { code: 'D05', name: 'Pasir Panjang, Hong Leong Garden, Clementi New Town' },
  { code: 'D06', name: 'High Street, Beach Road' },
  { code: 'D07', name: 'Middle Road, Golden Mile' },
  { code: 'D08', name: 'Little India' },
  { code: 'D09', name: 'Orchard, Cairnhill, River Valley' },
  { code: 'D10', name: 'Ardmore, Bukit Timah, Holland Road, Tanglin' },
  { code: 'D11', name: 'Watten Estate, Novena, Thomson' },
  { code: 'D12', name: 'Balestier, Toa Payoh, Serangoon' },
  { code: 'D13', name: 'Macpherson, Braddell' },
  { code: 'D14', name: 'Geylang, Eunos' },
  { code: 'D15', name: 'Katong, Joo Chiat, Amber Road' },
  { code: 'D16', name: 'Bedok, Upper East Coast, Eastwood, Kew Drive' },
  { code: 'D17', name: 'Loyang, Changi' },
  { code: 'D18', name: 'Tampines, Pasir Ris' },
  { code: 'D19', name: 'Serangoon Garden, Hougang, Punggol' },
  { code: 'D20', name: 'Bishan, Ang Mo Kio' },
  { code: 'D21', name: 'Upper Bukit Timah, Clementi Park, Ulu Pandan' },
  { code: 'D22', name: 'Jurong' },
  { code: 'D23', name: 'Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang' },
  { code: 'D24', name: 'Lim Chu Kang, Tengah' },
  { code: 'D25', name: 'Kranji, Woodgrove' },
  { code: 'D26', name: 'Upper Thomson, Springleaf' },
  { code: 'D27', name: 'Yishun, Sembawang' },
  { code: 'D28', name: 'Seletar' },
] as const;

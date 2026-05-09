export type MessageDirection = 'inbound' | 'outbound';
export type MessageChannel = 'whatsapp' | 'sms' | 'email' | 'note';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  tenant_id: string;
  contact_id: string;
  lead_id: string | null;
  wa_number_id: string | null;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  media_url: string | null;
  wa_message_id: string | null;
  status: MessageStatus;
  sent_at: string;
}

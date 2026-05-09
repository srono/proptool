const DIALOG_API_URL = 'https://waba.360dialog.io/v1/messages';

interface SendResult {
  messageId: string;
}

/**
 * Sends a WhatsApp text message via 360dialog API.
 */
export async function sendWhatsAppMessage(
  phone: string,
  body: string
): Promise<SendResult> {
  const apiKey = process.env.WHATSAPP_360DIALOG_API_KEY;

  if (!apiKey) {
    throw new Error('WHATSAPP_360DIALOG_API_KEY is not configured');
  }

  const response = await fetch(DIALOG_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'D360-API-KEY': apiKey,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[WhatsApp Send] API error:', response.status, errorBody);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }

  const data = await response.json();
  const messageId = data.messages?.[0]?.id ?? data.messageId ?? '';

  return { messageId };
}

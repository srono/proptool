import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MessageSquare, Search } from 'lucide-react';

export default async function MessagesPage() {
  const supabase = await createClient();

  // Fetch the most recent message per contact, along with contact info
  const { data: conversations } = await supabase
    .from('messages')
    .select(`
      id,
      contact_id,
      body,
      direction,
      status,
      sent_at,
      media_url,
      contact:contacts(id, full_name, phone)
    `)
    .order('sent_at', { ascending: false });

  // Group by contact_id and keep only the latest message per contact
  const contactMap = new Map<string, {
    contact_id: string;
    contact_name: string;
    contact_phone: string;
    last_message: string;
    last_message_direction: string;
    last_message_status: string;
    last_message_at: string;
    has_media: boolean;
    unread_count: number;
  }>();

  if (conversations) {
    for (const msg of conversations) {
      if (contactMap.has(msg.contact_id)) continue;

      const contact = msg.contact as unknown as { id: string; full_name: string; phone: string } | null;

      contactMap.set(msg.contact_id, {
        contact_id: msg.contact_id,
        contact_name: contact?.full_name ?? 'Unknown',
        contact_phone: contact?.phone ?? '',
        last_message: msg.body || (msg.media_url ? '📎 Media' : ''),
        last_message_direction: msg.direction,
        last_message_status: msg.status,
        last_message_at: msg.sent_at,
        has_media: !!msg.media_url,
        unread_count: 0,
      });
    }
  }

  // Count unread messages (inbound messages with status != 'read')
  if (conversations) {
    for (const msg of conversations) {
      if (msg.direction === 'inbound' && msg.status !== 'read') {
        const entry = contactMap.get(msg.contact_id);
        if (entry) entry.unread_count++;
      }
    }
  }

  const contactList = Array.from(contactMap.values());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">WhatsApp conversations</p>

        {/* Search bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search contacts..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {contactList.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {contactList.map((convo) => (
              <Link
                key={convo.contact_id}
                href={`/messages/${convo.contact_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-11 w-11 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-brand-700">
                    {convo.contact_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {convo.contact_name}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">
                      {convo.last_message_direction === 'outbound' && (
                        <span className="text-gray-400 mr-1">
                          {convo.last_message_status === 'read' ? '✓✓' : convo.last_message_status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                      {convo.last_message || 'No messages'}
                    </p>
                    {convo.unread_count > 0 && (
                      <span className="flex-shrink-0 ml-2 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-brand-600 px-1.5 text-xs font-medium text-white">
                        {convo.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Messages from WhatsApp will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-SG', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
  }
}

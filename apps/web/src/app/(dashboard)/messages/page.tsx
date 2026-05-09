import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MessagesPage() {
  const supabase = await createClient();

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
        last_message: msg.body || (msg.media_url ? 'Media' : ''),
        last_message_direction: msg.direction,
        last_message_status: msg.status,
        last_message_at: msg.sent_at,
        has_media: !!msg.media_url,
        unread_count: 0,
      });
    }
  }

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
      <div className="p-5 lg:px-8 border-b border-onyx-line">
        <h1 className="font-display font-bold text-[22px] text-white tracking-tight">
          Messages
        </h1>
        <p className="text-xs text-gray-2 mt-0.5">WhatsApp · 1 number</p>

        {/* Search */}
        <div className="mt-3">
          <input
            type="search"
            placeholder="Search contacts..."
            className="w-full rounded-pill border border-onyx-line bg-onyx-card py-2.5 px-4 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {contactList.length > 0 ? (
          <div>
            {contactList.map((convo) => (
              <Link
                key={convo.contact_id}
                href={`/messages/${convo.contact_id}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-onyx-line hover:bg-onyx-card transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-brand to-aqua" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white truncate">
                      {convo.contact_name}
                    </span>
                    <span className="text-[10px] text-gray-2 flex-shrink-0 ml-2">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-2 truncate max-w-[200px]">
                      {convo.last_message_direction === 'outbound' && (
                        <span className="text-gray-2 mr-1">
                          {convo.last_message_status === 'read' ? '✓✓' : '✓'}
                        </span>
                      )}
                      {convo.last_message || 'No messages'}
                    </span>
                    {convo.unread_count > 0 && (
                      <span className="flex-shrink-0 ml-2 bg-aqua text-onyx rounded-pill px-2 py-px text-[10px] font-bold">
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
            <div className="h-12 w-12 rounded-full bg-onyx-card border border-onyx-line flex items-center justify-center mb-3">
              <svg className="h-5 w-5 text-gray-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-2">No conversations yet</p>
            <p className="text-xs text-gray-2/60 mt-1">
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

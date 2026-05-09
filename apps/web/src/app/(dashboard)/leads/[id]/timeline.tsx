interface TimelineItem {
  id: string;
  type: string; // 'whatsapp' | 'sms' | 'email' | 'note'
  direction: string;
  body: string;
  media_url: string | null;
  timestamp: string;
}

interface Props {
  items: TimelineItem[];
}

export function Timeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">No messages yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Messages and notes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <span className="flex-shrink-0 mt-0.5 text-base">
                {item.type === 'whatsapp' && (item.direction === 'inbound' ? '📩' : '📤')}
                {item.type === 'sms' && '💬'}
                {item.type === 'email' && '✉️'}
                {item.type === 'note' && '📝'}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {item.type} · {item.direction}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                  {item.body || '(media)'}
                </p>
                {item.media_url && (
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                  >
                    📎 View attachment
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

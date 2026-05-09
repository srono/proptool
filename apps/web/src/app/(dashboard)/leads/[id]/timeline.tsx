interface TimelineItem {
  id: string;
  type: string;
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
      <div className="bg-onyx-card border border-onyx-line rounded-2xl p-8 text-center">
        <p className="text-gray-2 text-sm">No messages yet</p>
        <p className="text-gray-2/60 text-xs mt-1">
          Messages and notes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-onyx-line">
        <h3 className="text-sm font-display font-bold text-white">Timeline</h3>
      </div>
      <div className="divide-y divide-onyx-line max-h-[600px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3">
            <div className="flex items-start gap-3">
              {/* Direction indicator */}
              <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-brand" />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-display font-semibold text-gray-2 uppercase tracking-wider">
                    {item.type} · {item.direction}
                  </span>
                  <span className="text-[11px] text-gray-2/60">
                    {new Date(item.timestamp).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-white mt-1 whitespace-pre-wrap break-words">
                  {item.body || '(media)'}
                </p>
                {item.media_url && (
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-aqua hover:underline mt-1 inline-block"
                  >
                    View attachment
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

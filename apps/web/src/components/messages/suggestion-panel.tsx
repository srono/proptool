'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { Message } from '@agentos/shared';
import type { Suggestion } from '@agentos/shared';
import { truncateChipText } from '@/lib/ai/truncate';

interface SuggestionPanelProps {
  contactId: string;
  messages: Message[];
  onInsertText: (text: string) => void;
  onSendMessage: (text: string) => void;
}

export function SuggestionPanel({
  contactId,
  messages,
  onInsertText,
  onSendMessage,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastMessageCountRef = useRef<number>(messages.length);
  const lastInboundIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async () => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const res = await fetch('/api/messages/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      const data = await res.json();
      if (!controller.signal.aborted) {
        setSuggestions(data.suggestions ?? []);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [contactId]);

  // Fetch on mount if last message is inbound
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.direction === 'inbound') {
      lastInboundIdRef.current = lastMessage.id;
      fetchSuggestions();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when a new inbound message arrives
  useEffect(() => {
    // Skip the initial render
    if (messages.length === lastMessageCountRef.current) return;
    lastMessageCountRef.current = messages.length;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.direction !== 'inbound') return;

    // Only re-fetch if this is a new inbound message
    if (lastMessage.id === lastInboundIdRef.current) return;
    lastInboundIdRef.current = lastMessage.id;

    // Re-show panel on new inbound message
    setIsDismissed(false);
    fetchSuggestions();
  }, [messages, fetchSuggestions]);

  // Clear suggestions when an outbound message is sent
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.direction === 'outbound') {
      setSuggestions([]);
    }
  }, [messages]);

  function handleRefresh() {
    if (isLoading) return;
    setIsDismissed(false);
    fetchSuggestions();
  }

  function handleDismiss() {
    setIsDismissed(true);
    setSuggestions([]);
  }

  function handleChipTap(suggestion: Suggestion) {
    onInsertText(suggestion.text);
  }

  // Hide panel when dismissed, no suggestions, or loading with no suggestions
  if (isDismissed) return null;
  if (!isLoading && suggestions.length === 0) return null;

  return (
    <div className="px-5 lg:px-7 py-3 border-t border-onyx-line bg-onyx-card/50">
      {/* Header row with controls */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-display font-bold tracking-wider text-aqua uppercase">
          Suggested Replies
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 rounded-md text-gray-2 hover:text-white hover:bg-onyx-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Refresh suggestions"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-gray-2 hover:text-white hover:bg-onyx-card transition-colors"
            aria-label="Dismiss suggestions"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && suggestions.length === 0 && (
        <div className="flex items-center gap-2 py-2">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span className="text-[12px] text-gray-2">Generating suggestions…</span>
        </div>
      )}

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.text.slice(0, 20)}-${index}`}
              onClick={() => handleChipTap(suggestion)}
              className="text-left text-[12px] text-white bg-onyx-card border border-onyx-line rounded-full px-3 py-1.5 hover:border-brand hover:bg-brand/10 transition-colors max-w-full truncate"
              title={suggestion.text}
            >
              {truncateChipText(suggestion.text)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

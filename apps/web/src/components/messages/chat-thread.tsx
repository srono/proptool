'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Message, Contact } from '@agentos/shared';
import { SuggestionPanel } from './suggestion-panel';
import { ListingSearchModal } from './listing-search-modal';
import { insertSnippetIntoComposer } from '@/lib/ai/composer-utils';
import { createClient } from '@/lib/supabase/client';
import { upsertFollowUpContext } from '@/lib/ai/follow-up-context';

interface ChatThreadProps {
  contact: Contact;
  messages: Message[];
  tenantId: string;
}

export function ChatThread({ contact, messages: initialMessages, tenantId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showListingSearch, setShowListingSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(body?: string) {
    const text = (body ?? inputValue).trim();
    if (!text || isSending) return;

    setInputValue('');
    setIsSending(true);

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      tenant_id: tenantId,
      contact_id: contact.id,
      lead_id: null,
      wa_number_id: null,
      direction: 'outbound',
      channel: 'whatsapp',
      body: text,
      media_url: null,
      wa_message_id: null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          body: text,
          tenant_id: tenantId,
        }),
      });

      if (res.ok) {
        const { message: savedMessage } = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? savedMessage : m))
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...m, status: 'failed' as const } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id ? { ...m, status: 'failed' as const } : m
        )
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInsertText(text: string) {
    setInputValue(text);
    // Place cursor at end after React re-renders
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 0);
  }

  async function handleListingSelect(snippet: string, listingId: string) {
    const newValue = insertSnippetIntoComposer(inputValue, snippet);
    setInputValue(newValue);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }, 0);

    // Persist follow-up context
    try {
      const supabase = createClient();
      await upsertFollowUpContext(supabase, tenantId, contact.id, listingId);
    } catch (err) {
      console.error('[ChatThread] Failed to persist follow-up context:', err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-onyx">
      {/* Header */}
      <div className="flex items-center justify-between px-5 lg:px-7 py-4 border-b border-onyx-line">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="lg:hidden p-1 -ml-1 rounded-md hover:bg-onyx-card text-gray-2"
            aria-label="Back to messages"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">{contact.full_name}</div>
            <div className="text-[11px] text-gray-2">
              {contact.phone} · Lead in Qualified
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-xs py-1.5 px-3">View lead</button>
          <button className="btn-ghost text-xs py-1.5 px-3">Book viewing</button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-5 space-y-3 bg-[radial-gradient(ellipse_at_top,rgba(40,89,247,0.06),transparent_60%)]">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestion Panel */}
      <SuggestionPanel
        contactId={contact.id}
        messages={messages}
        onInsertText={handleInsertText}
        onSendMessage={handleSend}
      />

      {/* Insert Listing button */}
      <div className="px-5 lg:px-7 pt-2 pb-0 flex items-center">
        <button
          onClick={() => setShowListingSearch(true)}
          className="text-[11px] font-display font-bold tracking-wider text-aqua hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Insert Listing
        </button>
      </div>

      {/* Listing Search Modal */}
      <ListingSearchModal
        isOpen={showListingSearch}
        onClose={() => setShowListingSearch(false)}
        onSelectListing={handleListingSelect}
        tenantId={tenantId}
      />

      {/* Composer */}
      <div className="px-5 lg:px-7 py-4 border-t border-onyx-line flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply via WhatsApp..."
          className="flex-1 rounded-pill border border-onyx-line bg-onyx-card px-[18px] py-3 text-[13px] text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isSending}
          className="btn-primary py-3 px-5 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[460px]">
        <div
          className={`px-4 py-2.5 text-[13px] leading-[1.45] ${
            isOutbound
              ? 'bg-brand text-white rounded-2xl rounded-br-[4px]'
              : 'bg-onyx-card border border-onyx-line text-white rounded-2xl rounded-bl-[4px]'
          }`}
        >
          {message.body && (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOutbound ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="text-[10px] text-gray-2">
            {formatMessageTime(message.sent_at)}
          </span>
          {isOutbound && (
            <span className="text-[10px] text-gray-2">
              {message.status === 'read'
                ? '✓✓'
                : message.status === 'delivered'
                ? '✓✓'
                : message.status === 'failed'
                ? 'Failed'
                : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

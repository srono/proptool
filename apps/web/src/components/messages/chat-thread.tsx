'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Check, CheckCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Message, Contact } from '@propagent/shared';

interface ChatThreadProps {
  contact: Contact;
  messages: Message[];
  tenantId: string;
}

export function ChatThread({ contact, messages: initialMessages, tenantId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const body = inputValue.trim();
    if (!body || isSending) return;

    setInputValue('');
    setIsSending(true);

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      tenant_id: tenantId,
      contact_id: contact.id,
      lead_id: null,
      wa_number_id: null,
      direction: 'outbound',
      channel: 'whatsapp',
      body,
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
          body,
          tenant_id: tenantId,
        }),
      });

      if (res.ok) {
        const { message: savedMessage } = await res.json();
        // Replace optimistic message with the real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? savedMessage : m))
        );
      } else {
        // Mark as failed
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <Link
          href="/messages"
          className="lg:hidden p-1 -ml-1 rounded-md hover:bg-gray-100"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>

        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-brand-700">
            {contact.full_name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {contact.full_name}
          </p>
          <p className="text-xs text-gray-500">{contact.phone}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-600 flex items-center justify-center text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isOutbound
            ? 'bg-brand-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {/* Media content */}
        {message.media_url && (
          <MediaContent url={message.media_url} isOutbound={isOutbound} />
        )}

        {/* Message body */}
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        )}

        {/* Timestamp and status */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 ${
            isOutbound ? 'text-white/70' : 'text-gray-400'
          }`}
        >
          <span className="text-[10px]">
            {formatMessageTime(message.sent_at)}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MediaContent({ url, isOutbound }: { url: string; isOutbound: boolean }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);

  if (isImage) {
    return (
      <div className="mb-1 -mx-1 -mt-0.5">
        <img
          src={url}
          alt="Shared image"
          className="rounded-lg max-h-48 w-auto object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-1 p-2 rounded-lg ${
        isOutbound ? 'bg-brand-700/50' : 'bg-gray-200'
      }`}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs truncate">Document</span>
    </a>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-blue-300" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5" />;
    case 'failed':
      return <span className="text-[10px] text-red-300">Failed</span>;
    default:
      return null;
  }
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

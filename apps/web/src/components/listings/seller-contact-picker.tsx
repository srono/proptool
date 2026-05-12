'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { searchContacts } from '@/lib/services/seller-service';

interface SellerContact {
  id: string;
  full_name: string;
  phone: string;
}

export interface SellerContactPickerProps {
  value: SellerContact | null;
  onChange: (contact: SellerContact | null) => void;
  placeholder?: string;
}

export function SellerContactPicker({ value, onChange, placeholder = 'Search by name or phone...' }: SellerContactPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; full_name: string; phone: string; email: string | null }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (term: string) => {
    if (term.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const contacts = await searchContacts(supabase, term);
      setResults(contacts);
      setIsOpen(true);
    } catch (error) {
      console.error('[SellerContactPicker] search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 1) {
      debounceRef.current = setTimeout(() => performSearch(query), 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(contact: { id: string; full_name: string; phone: string }) {
    onChange({ id: contact.id, full_name: contact.full_name, phone: contact.phone });
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setShowCreateForm(false);
  }

  function handleClear() {
    onChange(null);
    setQuery('');
    setResults([]);
  }

  async function handleCreateContact(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Full name is required');
      return;
    }
    if (!newPhone.trim()) {
      setCreateError('Phone number is required');
      return;
    }

    setIsCreating(true);
    try {
      const supabase = createClient();
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          full_name: newName.trim(),
          phone: newPhone.trim(),
          source: 'manual',
          contact_status: 'active',
        })
        .select('id, full_name, phone')
        .single();

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          setCreateError('A contact with this phone number already exists. Search for them instead.');
        } else {
          setCreateError(`Failed to create contact: ${error.message}`);
        }
        return;
      }

      if (contact) {
        handleSelect({ id: contact.id, full_name: contact.full_name, phone: contact.phone });
        setNewName('');
        setNewPhone('');
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('[SellerContactPicker] create contact error:', error);
      setCreateError('Failed to create contact. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  // If a value is selected, show the selected contact
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{value.full_name}</p>
            <p className="text-xs text-gray-2 truncate">{value.phone}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-2 hover:text-white hover:bg-onyx-card transition-colors"
          aria-label="Clear seller selection"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-onyx-line border-t-aqua" />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-onyx-card rounded-2xl shadow-lg border border-onyx-line z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.length > 0 && (
            <div>
              {results.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-onyx-raised transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
                    <p className="text-xs text-gray-2 truncate">{contact.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query.length >= 1 && !loading && (
            <p className="px-3 py-2.5 text-sm text-gray-2">No contacts found</p>
          )}

          {/* Create new contact option */}
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-onyx-raised transition-colors text-left border-t border-onyx-line"
            >
              <div className="w-7 h-7 rounded-full bg-onyx-raised border border-dashed border-gray-2 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-gray-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm text-aqua font-medium">Create new contact</span>
            </button>
          )}

          {/* Inline create form */}
          {showCreateForm && (
            <div className="border-t border-onyx-line p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-2 uppercase tracking-label">New Contact</p>
              <form onSubmit={handleCreateContact} className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name *"
                  className="w-full bg-onyx-raised border border-onyx-line rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone number *"
                  className="w-full bg-onyx-raised border border-onyx-line rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                {createError && (
                  <p className="text-xs text-status-red">{createError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 rounded-lg bg-aqua px-3 py-2 text-sm font-medium text-onyx hover:bg-aqua/90 transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create & Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError('');
                      setNewName('');
                      setNewPhone('');
                    }}
                    className="rounded-lg px-3 py-2 text-sm text-gray-2 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

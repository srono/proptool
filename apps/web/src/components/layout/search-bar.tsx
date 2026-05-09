'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  type: 'contact' | 'listing';
  title: string;
  subtitle: string;
  href: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const searchResults: SearchResult[] = [];

    // Search contacts (and their leads)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, phone, leads(id)')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(4);

    if (contacts) {
      for (const contact of contacts) {
        const leadId = contact.leads?.[0]?.id;
        searchResults.push({
          id: contact.id,
          type: 'contact',
          title: contact.full_name,
          subtitle: contact.phone || '',
          href: leadId ? `/leads/${leadId}` : `/messages/${contact.id}`,
        });
      }
    }

    // Search listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, address, district, listing_type')
      .ilike('address', `%${term}%`)
      .limit(4);

    if (listings) {
      for (const listing of listings) {
        searchResults.push({
          id: listing.id,
          type: 'listing',
          title: listing.address,
          subtitle: `${listing.district} · ${listing.listing_type}`,
          href: `/listings/${listing.id}`,
        });
      }
    }

    setResults(searchResults.slice(0, 8));
    setIsOpen(searchResults.length > 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const contactResults = results.filter((r) => r.type === 'contact');
  const listingResults = results.filter((r) => r.type === 'listing');

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search contacts, listings..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {contactResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                Contacts
              </p>
              {contactResults.map((result) => (
                <Link
                  key={result.id}
                  href={result.href}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">👤</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {listingResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                Listings
              </p>
              {listingResults.map((result) => (
                <Link
                  key={result.id}
                  href={result.href}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">🏠</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

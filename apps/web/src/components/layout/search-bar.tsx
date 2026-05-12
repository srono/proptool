'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ActiveLead {
  id: string;
  lead_title: string | null;
  lead_category: string;
  status: string;
}

interface ContactSearchResult {
  id: string;
  full_name: string;
  phone: string;
  active_leads: ActiveLead[];
}

interface ListingResult {
  id: string;
  address: string;
  district: string;
  listing_type: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [contactResults, setContactResults] = useState<ContactSearchResult[]>([]);
  const [listingResults, setListingResults] = useState<ListingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setContactResults([]);
      setListingResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Search contacts with active leads (uses searchContacts pattern)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, phone, leads(id, lead_title, lead_category, status, is_active)')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(6);

    const contactHits: ContactSearchResult[] = [];
    if (contacts) {
      for (const contact of contacts) {
        const activeLeads = (contact.leads ?? []).filter(
          (l: { is_active: boolean }) => l.is_active
        );
        contactHits.push({
          id: contact.id,
          full_name: contact.full_name,
          phone: contact.phone || '',
          active_leads: activeLeads as ActiveLead[],
        });
      }
    }

    // Search listings
    const { data: listings } = await supabase
      .from('listings')
      .select('id, address, district, listing_type')
      .ilike('address', `%${term}%`)
      .limit(4);

    setContactResults(contactHits);
    setListingResults(listings ?? []);
    setIsOpen(contactHits.length > 0 || (listings ?? []).length > 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-2"
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
          onFocus={() => (contactResults.length > 0 || listingResults.length > 0) && setIsOpen(true)}
          placeholder="Search contacts, listings..."
          className="w-full rounded-pill border border-onyx-line bg-onyx-card py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-onyx-line border-t-aqua" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-onyx-card rounded-2xl shadow-lg border border-onyx-line z-50 overflow-hidden">
          {contactResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-2 font-display uppercase tracking-label bg-onyx-raised">
                Contacts
              </p>
              {contactResults.map((contact) => (
                <div key={contact.id}>
                  <Link
                    href={`/contacts/${contact.id}`}
                    onClick={() => { setIsOpen(false); setQuery(''); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-onyx-raised transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
                        {contact.active_leads.length > 0 && (
                          <span className="text-[10px] text-aqua font-medium">
                            {contact.active_leads.length} active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-2 truncate">{contact.phone}</p>
                    </div>
                  </Link>
                  {/* Show active leads under the contact */}
                  {contact.active_leads.length > 0 && (
                    <div className="pl-[52px] pb-1">
                      {contact.active_leads.slice(0, 3).map((lead) => (
                        <Link
                          key={lead.id}
                          href={`/leads/${lead.id}`}
                          onClick={() => { setIsOpen(false); setQuery(''); }}
                          className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-onyx-raised transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-aqua flex-shrink-0" />
                          <span className="text-xs text-gray-2 truncate">
                            {lead.lead_title || lead.lead_category} · {lead.status.replace('_', ' ')}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {listingResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-2 font-display uppercase tracking-label bg-onyx-raised">
                Listings
              </p>
              {listingResults.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-onyx-raised transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-onyx-raised border border-onyx-line flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{listing.address}</p>
                    <p className="text-xs text-gray-2 truncate">{listing.district} · {listing.listing_type}</p>
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

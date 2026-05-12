'use client';

import { useState } from 'react';
import type { ContactListItem, ContactStatus } from './contacts-types';
import { filterContacts } from './utils';
import { ContactCard } from './contact-card';

interface ContactsClientShellProps {
  contacts: ContactListItem[];
}

const STATUS_TABS: { key: ContactStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'archived', label: 'Archived' },
  { key: 'do_not_contact', label: 'Do Not Contact' },
];

export function ContactsClientShell({ contacts }: ContactsClientShellProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<ContactStatus | 'all'>('all');

  const filteredContacts = filterContacts(contacts, searchTerm, activeStatus);

  const hasActiveFilters = searchTerm.trim() !== '' || activeStatus !== 'all';
  const noContactsAtAll = contacts.length === 0;
  const noResults = filteredContacts.length === 0 && !noContactsAtAll;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="border-b border-onyx-line pb-5">
        <p className="text-[13px] text-gray-2 mt-1">
          Browse and manage your contact database
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={100}
          aria-label="Search contacts"
          placeholder="Search by name or phone number..."
          className="w-full rounded-pill border border-onyx-line bg-onyx py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveStatus(tab.key)}
            className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? 'bg-aqua text-onyx'
                : 'text-gray-2 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contact List / Empty States */}
      {noContactsAtAll ? (
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-aqua"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">No contacts yet</p>
          <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
            Contacts will appear here once you add leads with contact information.
          </p>
        </div>
      ) : noResults ? (
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-white font-medium text-sm">
            No contacts match your filters
          </p>
          <p className="text-gray-2 text-xs mt-1">
            Try adjusting your search or filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setActiveStatus('all');
            }}
            className="mt-4 text-sm text-brand hover:text-brand/70 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

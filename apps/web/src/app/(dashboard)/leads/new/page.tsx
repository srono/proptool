'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('manual');
  const [dealType, setDealType] = useState('sale');
  const [urgency, setUrgency] = useState('warm');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Name and phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Create or find contact
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone.trim())
        .single();

      let contactId: string;

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            source,
            lead_type: 'buyer',
            whatsapp_optin: false,
          })
          .select('id')
          .single();

        if (contactError || !newContact) {
          alert('Failed to create contact');
          return;
        }
        contactId = newContact.id;
      }

      // Create lead
      const { error: leadError } = await supabase.from('leads').insert({
        contact_id: contactId,
        status: 'new_lead',
        source,
        deal_type: dealType,
        urgency,
        notes: notes.trim() || null,
        eligibility_risk: false,
        paynow_verified: false,
        last_activity_at: new Date().toISOString(),
      });

      if (leadError) {
        alert('Failed to create lead');
        return;
      }

      router.push('/leads');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Add Lead</h1>
        <p className="text-sm text-gray-600">Quick-add a new lead to your pipeline</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Rachel Lim" className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+65 9XXX XXXX" className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select id="source" value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="manual">Manual</option>
                <option value="referral">Referral</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="open_house">Open House</option>
                <option value="portal">Portal</option>
              </select>
            </div>
            <div>
              <label htmlFor="dealType" className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
              <select id="dealType" value={dealType} onChange={(e) => setDealType(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="sale">Sale</option>
                <option value="resale">Resale</option>
                <option value="rental">Rental</option>
              </select>
            </div>
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="hot">🔴 Hot</option>
                <option value="warm">🟡 Warm</option>
                <option value="cold">🔵 Cold</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any initial notes..." className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {isSubmitting ? 'Adding...' : 'Add Lead'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

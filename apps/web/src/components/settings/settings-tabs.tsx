'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PushToggle } from '@/components/settings/push-toggle';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  cea_licence_number: string | null;
  cea_expiry_date: string | null;
  agency_name: string | null;
  tenant_id: string | null;
  notification_preferences: NotificationPreferences | null;
  [key: string]: unknown;
}

interface Tenant {
  id: string;
  name: string | null;
  plan: string | null;
  next_billing_date: string | null;
  facebook_page_connected: boolean | null;
  whatsapp_number: string | null;
  google_calendar_connected: boolean | null;
  [key: string]: unknown;
}

interface NotificationPreferences {
  new_lead: boolean;
  viewing_reminder: boolean;
  task_overdue: boolean;
  deal_update: boolean;
  daily_digest_time: string;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  new_lead: true,
  viewing_reminder: true,
  task_overdue: true,
  deal_update: true,
  daily_digest_time: '09:00',
};

interface Props {
  profile: Profile | null;
  tenant: Tenant | null;
  userEmail: string;
}

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'billing', label: 'Billing' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function SettingsTabs({ profile, tenant, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ProfileTab profile={profile} userEmail={userEmail} />
      )}
      {activeTab === 'integrations' && (
        <IntegrationsTab tenant={tenant} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab
          profileId={profile?.id ?? ''}
          preferences={profile?.notification_preferences ?? DEFAULT_NOTIFICATIONS}
        />
      )}
      {activeTab === 'billing' && <BillingTab tenant={tenant} />}
    </div>
  );
}

// --- Profile Tab ---

function ProfileTab({
  profile,
  userEmail,
}: {
  profile: Profile | null;
  userEmail: string;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [ceaLicence, setCeaLicence] = useState(profile?.cea_licence_number ?? '');
  const [ceaExpiry, setCeaExpiry] = useState(profile?.cea_expiry_date ?? '');
  const [agencyName, setAgencyName] = useState(profile?.agency_name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!profile?.id) return;
    setIsSaving(true);
    setSaved(false);

    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          phone: phone || null,
          cea_licence_number: ceaLicence || null,
          cea_expiry_date: ceaExpiry || null,
          agency_name: agencyName || null,
        })
        .eq('id', profile.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Profile Information</h2>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold">
          {fullName ? fullName.charAt(0).toUpperCase() : '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{fullName || 'Your Name'}</p>
          <p className="text-xs text-gray-500">{userEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={userEmail}
            disabled
            className="w-full rounded-lg border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+65 9XXX XXXX"
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-1">
            Agency Name
          </label>
          <input
            type="text"
            id="agencyName"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="e.g. ERA, PropNex"
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="ceaLicence" className="block text-sm font-medium text-gray-700 mb-1">
            CEA Licence Number
          </label>
          <input
            type="text"
            id="ceaLicence"
            value={ceaLicence}
            onChange={(e) => setCeaLicence(e.target.value)}
            placeholder="R0XXXXX"
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="ceaExpiry" className="block text-sm font-medium text-gray-700 mb-1">
            CEA Expiry Date
          </label>
          <input
            type="date"
            id="ceaExpiry"
            value={ceaExpiry}
            onChange={(e) => setCeaExpiry(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}

// --- Integrations Tab ---

function IntegrationsTab({ tenant }: { tenant: Tenant | null }) {
  return (
    <div className="space-y-4">
      {/* Facebook */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📘</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Facebook Page</p>
              <p className="text-xs text-gray-500">
                Connect to receive leads from Facebook Lead Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.facebook_page_connected ? (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Connected
              </span>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp Business</p>
              <p className="text-xs text-gray-500">
                {tenant?.whatsapp_number
                  ? `Connected: ${tenant.whatsapp_number}`
                  : 'Send and receive messages via WhatsApp'}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              tenant?.whatsapp_number
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tenant?.whatsapp_number ? 'Active' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-500">
                Sync viewings and tasks to your calendar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.google_calendar_connected ? (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Connected
              </span>
            ) : (
              <a
                href="/api/auth/google"
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Connect
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Portal Email Forwarding */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📧</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Portal Email Forwarding</p>
            <p className="text-xs text-gray-500 mb-2">
              Forward portal enquiry emails to this address to auto-create leads
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <code className="text-xs text-gray-700 break-all">
                leads+{tenant?.id ?? 'your-tenant-id'}@cinvea.com
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Notifications Tab ---

function NotificationsTab({
  profileId,
  preferences: initialPreferences,
}: {
  profileId: string;
  preferences: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function togglePref(key: keyof Omit<NotificationPreferences, 'daily_digest_time'>) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!profileId) return;
    setIsSaving(true);
    setSaved(false);

    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ notification_preferences: prefs })
        .eq('id', profileId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }

  const toggleItems: {
    key: keyof Omit<NotificationPreferences, 'daily_digest_time'>;
    label: string;
    description: string;
  }[] = [
    { key: 'new_lead', label: 'New Lead', description: 'When a new lead is received' },
    {
      key: 'viewing_reminder',
      label: 'Viewing Reminder',
      description: 'Before a scheduled viewing',
    },
    { key: 'task_overdue', label: 'Task Overdue', description: 'When a task passes its due date' },
    { key: 'deal_update', label: 'Deal Update', description: 'When a deal status changes' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Push Notifications</h2>

      {/* Browser push toggle */}
      <div className="border-b border-gray-100 pb-4">
        <PushToggle />
      </div>

      <div className="space-y-3">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[item.key]}
              onClick={() => togglePref(item.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                prefs[item.key] ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  prefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Daily digest time */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Daily Digest</p>
            <p className="text-xs text-gray-500">Receive a summary of the day&apos;s activities</p>
          </div>
          <input
            type="time"
            value={prefs.daily_digest_time}
            onChange={(e) => setPrefs((prev) => ({ ...prev, daily_digest_time: e.target.value }))}
            className="rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500 w-28"
            aria-label="Daily digest time"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Notifications'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}

// --- Billing Tab ---

function BillingTab({ tenant }: { tenant: Tenant | null }) {
  const plan = tenant?.plan ?? 'free';
  const nextBilling = tenant?.next_billing_date;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Current Plan</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900 capitalize">{plan}</p>
            <p className="text-xs text-gray-500">
              {plan === 'free'
                ? 'Limited features — upgrade for full access'
                : 'Full access to all features'}
            </p>
          </div>
          {plan === 'free' && (
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>

        {nextBilling && (
          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Next billing date</span>
            <span className="text-gray-900">
              {new Date(nextBilling).toLocaleDateString('en-SG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {plan !== 'free' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Manage Subscription</h2>
          <button
            type="button"
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Cancel Subscription
          </button>
          <p className="text-xs text-gray-400 mt-1">
            Your access will continue until the end of the current billing period.
          </p>
        </div>
      )}
    </div>
  );
}

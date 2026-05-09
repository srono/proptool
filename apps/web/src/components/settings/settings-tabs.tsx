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
      <div className="flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-center rounded-pill px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-aqua text-onyx'
                : 'text-gray-2 hover:text-white'
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
    <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
      <h2 className="text-sm font-semibold text-white">Profile Information</h2>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand/[0.12] flex items-center justify-center text-aqua text-xl font-bold">
          {fullName ? fullName.charAt(0).toUpperCase() : '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{fullName || 'Your Name'}</p>
          <p className="text-xs text-gray-2">{userEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fullName" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={userEmail}
            disabled
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-gray-2 cursor-not-allowed opacity-60"
          />
        </div>
        <div>
          <label htmlFor="phone" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+65 9XXX XXXX"
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="agencyName" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            Agency Name
          </label>
          <input
            type="text"
            id="agencyName"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="e.g. ERA, PropNex"
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="ceaLicence" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            CEA Licence Number
          </label>
          <input
            type="text"
            id="ceaLicence"
            value={ceaLicence}
            onChange={(e) => setCeaLicence(e.target.value)}
            placeholder="R0XXXXX"
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="ceaExpiry" className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5 block">
            CEA Expiry Date
          </label>
          <input
            type="date"
            id="ceaExpiry"
            value={ceaExpiry}
            onChange={(e) => setCeaExpiry(e.target.value)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && <span className="text-sm text-status-green">Saved</span>}
      </div>
    </div>
  );
}

// --- Integrations Tab ---

function IntegrationsTab({ tenant }: { tenant: Tenant | null }) {
  return (
    <div className="space-y-4">
      {/* Facebook */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-white">Facebook Page</p>
              <p className="text-xs text-gray-2">
                Connect to receive leads from Facebook Lead Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.facebook_page_connected ? (
              <span className="chip text-status-green border-status-green/40 bg-status-green/10">
                Connected
              </span>
            ) : (
              <button
                type="button"
                className="btn-primary text-xs px-3 py-1.5"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-white">WhatsApp Business</p>
              <p className="text-xs text-gray-2">
                {tenant?.whatsapp_number
                  ? `Connected: ${tenant.whatsapp_number}`
                  : 'Send and receive messages via WhatsApp'}
              </p>
            </div>
          </div>
          <span
            className={`chip ${
              tenant?.whatsapp_number
                ? 'text-status-green border-status-green/40 bg-status-green/10'
                : 'text-gray-2 border-onyx-line bg-onyx-card'
            }`}
          >
            {tenant?.whatsapp_number ? 'Active' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-white">Google Calendar</p>
              <p className="text-xs text-gray-2">
                Sync viewings and tasks to your calendar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.google_calendar_connected ? (
              <span className="chip text-status-green border-status-green/40 bg-status-green/10">
                Connected
              </span>
            ) : (
              <a
                href="/api/auth/google"
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Connect
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Portal Email Forwarding */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Portal Email Forwarding</p>
            <p className="text-xs text-gray-2 mb-2">
              Forward portal enquiry emails to this address to auto-create leads
            </p>
            <div className="rounded-xl border border-onyx-line bg-onyx-raised px-3 py-2">
              <code className="text-xs text-gray-2 break-all">
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
    <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
      <h2 className="text-sm font-semibold text-white">Push Notifications</h2>

      {/* Browser push toggle */}
      <div className="border-b border-onyx-line pb-4">
        <PushToggle />
      </div>

      <div className="space-y-3">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-gray-2">{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[item.key]}
              onClick={() => togglePref(item.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                prefs[item.key] ? 'bg-brand-600' : 'bg-onyx-raised'
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
      <div className="border-t border-onyx-line pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Daily Digest</p>
            <p className="text-xs text-gray-2">Receive a summary of the day&apos;s activities</p>
          </div>
          <input
            type="time"
            value={prefs.daily_digest_time}
            onChange={(e) => setPrefs((prev) => ({ ...prev, daily_digest_time: e.target.value }))}
            className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-28"
            aria-label="Daily digest time"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Notifications'}
        </button>
        {saved && <span className="text-sm text-status-green">Saved</span>}
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
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-semibold text-white">Current Plan</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white capitalize">{plan}</p>
            <p className="text-xs text-gray-2">
              {plan === 'free'
                ? 'Limited features — upgrade for full access'
                : 'Full access to all features'}
            </p>
          </div>
          {plan === 'free' && (
            <button
              type="button"
              className="btn-primary"
            >
              Upgrade
            </button>
          )}
        </div>

        {nextBilling && (
          <div className="flex justify-between text-sm border-t border-onyx-line pt-3">
            <span className="text-gray-2">Next billing date</span>
            <span className="text-white">
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
        <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Manage Subscription</h2>
          <button
            type="button"
            className="text-sm text-status-red hover:text-status-red/80 font-medium"
          >
            Cancel Subscription
          </button>
          <p className="text-xs text-gray-2 mt-1">
            Your access will continue until the end of the current billing period.
          </p>
        </div>
      )}
    </div>
  );
}

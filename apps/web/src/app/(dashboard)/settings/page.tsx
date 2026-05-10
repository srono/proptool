import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/settings-tabs';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch tenant settings
  const { data: tenant } = profile?.tenant_id
    ? await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
    : { data: null };

  return (
    <div className="p-4 lg:p-7 max-w-3xl mx-auto space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-gray-2">Manage your account and preferences</p>
      </div>

      <SettingsTabs
        profile={profile}
        tenant={tenant}
        userEmail={user.email ?? ''}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/settings-tabs';

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
    .from('profiles')
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
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">Manage your account and preferences</p>
      </div>

      <SettingsTabs
        profile={profile}
        tenant={tenant}
        userEmail={user.email ?? ''}
      />
    </div>
  );
}

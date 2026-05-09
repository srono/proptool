-- PropAgent SG — Auto-create tenant + user on signup
-- This trigger fires after a new auth.users row is created and provisions
-- the corresponding tenant and public.users row.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  user_full_name TEXT;
  user_phone TEXT;
  tenant_name TEXT;
BEGIN
  -- Extract full_name from user metadata, fallback to email prefix
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract phone from user metadata or auth phone field
  user_phone := COALESCE(
    NEW.phone,
    NEW.raw_user_meta_data->>'phone'
  );

  -- Build tenant name
  tenant_name := COALESCE(
    (NEW.raw_user_meta_data->>'full_name') || '''s Team',
    split_part(NEW.email, '@', 1) || '''s Team'
  );

  -- Create the tenant
  INSERT INTO public.tenants (
    name,
    subscription_plan,
    subscription_status,
    settings_json
  ) VALUES (
    tenant_name,
    'free',
    'trialing',
    '{"data_retention_years": 5, "daily_digest_time": "08:30", "default_currency": "SGD"}'::jsonb
  )
  RETURNING id INTO new_tenant_id;

  -- Create the user row
  INSERT INTO public.users (
    id,
    tenant_id,
    email,
    phone,
    full_name,
    role,
    cea_licence_number
  ) VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    user_phone,
    user_full_name,
    'owner',
    NEW.raw_user_meta_data->>'cea_licence_number'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users after insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

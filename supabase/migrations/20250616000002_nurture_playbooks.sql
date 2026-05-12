-- Nurture Playbooks: Schema migration
-- Extends contacts table and creates playbooks, playbook_steps, nurture_tasks, message_templates tables
-- Adds evaluate_segment RPC function and snoozed task reactivation cron job

-- ============================================================
-- EXTEND CONTACTS TABLE
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN owned_property_type text NOT NULL DEFAULT 'none'
    CHECK (owned_property_type IN ('none', 'hdb', 'private', 'landed', 'commercial')),
  ADD COLUMN owned_property_label text CHECK (char_length(owned_property_label) <= 200),
  ADD COLUMN owned_property_town text CHECK (char_length(owned_property_town) <= 100),
  ADD COLUMN owned_property_flat_type text CHECK (char_length(owned_property_flat_type) <= 50),
  ADD COLUMN owned_property_key_collection_date date,
  ADD COLUMN mop_date date,
  ADD COLUMN mop_date_manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN channel_preference text NOT NULL DEFAULT 'none'
    CHECK (channel_preference IN ('whatsapp', 'email', 'phone', 'none'));

-- ============================================================
-- MESSAGE TEMPLATES (must be created before playbook_steps which references it)
-- ============================================================
CREATE TABLE message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL CHECK (char_length(name) <= 100),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PLAYBOOKS
-- ============================================================
CREATE TABLE playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL CHECK (char_length(name) <= 100),
  description text CHECK (char_length(description) <= 500),
  active boolean NOT NULL DEFAULT false,
  segment_definition_json jsonb NOT NULL DEFAULT '{"conditions": []}',
  trigger_field text NOT NULL,
  steps_json jsonb NOT NULL DEFAULT '[]',
  target_ad_purpose text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- ============================================================
-- PLAYBOOK STEPS (synchronised from steps_json)
-- ============================================================
CREATE TABLE playbook_steps (
  id uuid PRIMARY KEY,
  playbook_id uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  offset_days integer NOT NULL CHECK (offset_days BETWEEN -365 AND 365),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'task_only')),
  template_id uuid REFERENCES message_templates(id),
  create_task boolean NOT NULL DEFAULT true,
  title text NOT NULL CHECK (char_length(title) <= 80),
  sort_order integer NOT NULL DEFAULT 0
);

-- ============================================================
-- NURTURE TASKS
-- ============================================================
CREATE TABLE nurture_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  contact_id uuid NOT NULL REFERENCES contacts(id),
  playbook_id uuid NOT NULL REFERENCES playbooks(id),
  step_id uuid REFERENCES playbook_steps(id),
  assigned_to uuid NOT NULL REFERENCES auth.users(id),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'skipped', 'snoozed')),
  completed_at timestamptz,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'note')),
  notes text CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for deduplication (only for non-ad-hoc tasks)
CREATE UNIQUE INDEX nurture_tasks_dedup
  ON nurture_tasks (contact_id, playbook_id, step_id)
  WHERE step_id IS NOT NULL;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_nurture_tasks_tenant_status ON nurture_tasks (tenant_id, status, due_at);
CREATE INDEX idx_nurture_tasks_contact ON nurture_tasks (contact_id, status);
CREATE INDEX idx_nurture_tasks_playbook ON nurture_tasks (playbook_id, status);
CREATE INDEX idx_nurture_tasks_assigned ON nurture_tasks (assigned_to, status, due_at);
CREATE INDEX idx_playbooks_tenant_active ON playbooks (tenant_id, active);
CREATE INDEX idx_playbook_steps_playbook ON playbook_steps (playbook_id, sort_order);
CREATE INDEX idx_contacts_property_type ON contacts (tenant_id, owned_property_type);
CREATE INDEX idx_contacts_mop_date ON contacts (tenant_id, mop_date) WHERE mop_date IS NOT NULL;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON playbooks
  FOR ALL USING (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_isolation" ON playbook_steps
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE tenant_id = public.get_tenant_id())
  );

CREATE POLICY "tenant_isolation" ON nurture_tasks
  FOR ALL USING (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_isolation" ON message_templates
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EVALUATE SEGMENT RPC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION evaluate_segment(
  p_tenant_id uuid,
  p_conditions jsonb
) RETURNS SETOF contacts AS $$
DECLARE
  query text;
  cond jsonb;
  field_name text;
  op text;
  cond_value jsonb;
BEGIN
  query := 'SELECT c.* FROM contacts c WHERE c.tenant_id = $1';

  IF p_conditions IS NULL OR jsonb_array_length(p_conditions) = 0 THEN
    RETURN QUERY EXECUTE query USING p_tenant_id;
    RETURN;
  END IF;

  FOR cond IN SELECT * FROM jsonb_array_elements(p_conditions)
  LOOP
    field_name := cond ->> 'field';
    op := cond ->> 'operator';
    cond_value := cond -> 'value';

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'contacts' AND column_name = field_name
    ) THEN
      IF cond ->> 'source' = 'lead' THEN
        query := query || format(
          ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I %s %L)',
          field_name,
          CASE op WHEN 'eq' THEN '=' WHEN 'neq' THEN '!=' ELSE '=' END,
          cond_value #>> '{}'
        );
      END IF;
      CONTINUE;
    END IF;

    CASE op
      WHEN 'eq' THEN
        query := query || format(' AND c.%I = %L', field_name, cond_value #>> '{}');
      WHEN 'neq' THEN
        query := query || format(' AND c.%I != %L', field_name, cond_value #>> '{}');
      WHEN 'before' THEN
        query := query || format(' AND c.%I < %L::date', field_name, cond_value #>> '{}');
      WHEN 'after' THEN
        query := query || format(' AND c.%I > %L::date', field_name, cond_value #>> '{}');
      WHEN 'between' THEN
        query := query || format(' AND c.%I BETWEEN %L::date AND %L::date',
          field_name, cond_value ->> 'from', cond_value ->> 'to');
      WHEN 'in' THEN
        query := query || format(' AND c.%I = ANY(%L::text[])',
          field_name, ARRAY(SELECT jsonb_array_elements_text(cond_value)));
      ELSE NULL;
    END CASE;
  END LOOP;

  RETURN QUERY EXECUTE query USING p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SNOOZED TASK REACTIVATION (pg_cron job)
-- Runs every 15 minutes to reactivate snoozed tasks whose due_at has passed
-- ============================================================
-- Note: pg_cron extension must be enabled. On Supabase hosted, it is available by default.
-- For local development, you may need to enable it in config.toml under [db.extensions].
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'reactivate-snoozed-tasks',
      '*/15 * * * *',
      $$UPDATE nurture_tasks SET status = 'pending' WHERE status = 'snoozed' AND due_at <= now();$$
    );
  END IF;
END
$outer$;

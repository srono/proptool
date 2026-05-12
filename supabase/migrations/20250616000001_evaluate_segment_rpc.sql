-- Supabase RPC function for segment evaluation
-- Evaluates segment filter conditions against contacts table
-- Supports AND logic across all conditions, null field exclusion,
-- contact fields and lead field conditions via EXISTS subquery.

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

  -- If no conditions provided, return all contacts for the tenant
  IF p_conditions IS NULL OR jsonb_array_length(p_conditions) = 0 THEN
    RETURN QUERY EXECUTE query USING p_tenant_id;
    RETURN;
  END IF;

  FOR cond IN SELECT * FROM jsonb_array_elements(p_conditions)
  LOOP
    field_name := cond ->> 'field';
    op := cond ->> 'operator';
    cond_value := cond -> 'value';

    -- Check if the field exists on the contacts table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = field_name
    ) THEN
      -- If the source is 'lead', use an EXISTS subquery against the leads table
      IF cond ->> 'source' = 'lead' THEN
        CASE op
          WHEN 'eq' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I = %L)',
              field_name, cond_value #>> '{}'
            );
          WHEN 'neq' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I != %L)',
              field_name, cond_value #>> '{}'
            );
          WHEN 'in' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I = ANY(%L::text[]))',
              field_name, ARRAY(SELECT jsonb_array_elements_text(cond_value))
            );
          WHEN 'before' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I < %L::date)',
              field_name, cond_value #>> '{}'
            );
          WHEN 'after' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I > %L::date)',
              field_name, cond_value #>> '{}'
            );
          WHEN 'between' THEN
            query := query || format(
              ' AND EXISTS (SELECT 1 FROM leads l WHERE l.contact_id = c.id AND l.%I BETWEEN %L::date AND %L::date)',
              field_name, cond_value ->> 'from', cond_value ->> 'to'
            );
          ELSE NULL;
        END CASE;
      END IF;
      -- If field doesn't exist on contacts and source is not 'lead', skip the condition
      CONTINUE;
    END IF;

    -- Exclude contacts where the field value is NULL (null fields = not matched)
    query := query || format(' AND c.%I IS NOT NULL', field_name);

    -- Apply the operator-specific condition on the contacts table
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION evaluate_segment(uuid, jsonb) TO authenticated;

-- Add a comment describing the function
COMMENT ON FUNCTION evaluate_segment(uuid, jsonb) IS
  'Evaluates segment filter conditions against contacts. Applies AND logic across all conditions. '
  'Null field values exclude the contact. Supports contact fields directly and lead fields via EXISTS subquery.';

'use client';

import { useState, useCallback } from 'react';
import type { FilterCondition, SegmentDefinition } from '@/lib/nurture/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CONDITIONS = 10;

type Operator = FilterCondition['operator'];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'in', label: 'In list' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

interface FieldOption {
  value: string;
  label: string;
  source: 'contact' | 'lead';
  type: 'text' | 'enum' | 'date' | 'boolean';
  options?: string[];
}

const AVAILABLE_FIELDS: FieldOption[] = [
  // Contact fields
  { value: 'owned_property_type', label: 'Property Type', source: 'contact', type: 'enum', options: ['none', 'hdb', 'private', 'landed', 'commercial'] },
  { value: 'owned_property_town', label: 'Property Town', source: 'contact', type: 'text' },
  { value: 'owned_property_flat_type', label: 'Flat Type', source: 'contact', type: 'text' },
  { value: 'mop_date', label: 'MOP Date', source: 'contact', type: 'date' },
  { value: 'channel_preference', label: 'Channel Preference', source: 'contact', type: 'enum', options: ['whatsapp', 'email', 'phone', 'none'] },
  { value: 'whatsapp_optin', label: 'WhatsApp Opt-in', source: 'contact', type: 'boolean' },
  // Lead fields
  { value: 'ad_purpose', label: 'Ad Purpose', source: 'lead', type: 'text' },
  { value: 'status', label: 'Lead Status', source: 'lead', type: 'text' },
  { value: 'deal_type', label: 'Deal Type', source: 'lead', type: 'text' },
  { value: 'source', label: 'Lead Source', source: 'lead', type: 'text' },
];

// Operators appropriate for each field type
const OPERATORS_BY_TYPE: Record<string, Operator[]> = {
  text: ['eq', 'neq', 'in'],
  enum: ['eq', 'neq', 'in'],
  date: ['eq', 'before', 'after', 'between'],
  boolean: ['eq', 'neq'],
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface PreviewResult {
  count: number;
  sample: { id: string; full_name: string; owned_property_type: string }[];
}

export interface SegmentBuilderProps {
  value: SegmentDefinition;
  onChange: (value: SegmentDefinition) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Visual filter builder for segment_definition_json.
 * Supports contact and lead field conditions with appropriate operators.
 * Max 10 conditions. Includes a "Preview" button that calls POST /api/nurture/segments/preview.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.9
 */
export function SegmentBuilder({ value, onChange }: SegmentBuilderProps) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const conditions = value.conditions;

  const addCondition = useCallback(() => {
    if (conditions.length >= MAX_CONDITIONS) return;

    const defaultField = AVAILABLE_FIELDS[0];
    const newCondition: FilterCondition = {
      field: defaultField.value,
      operator: 'eq',
      value: '',
      source: defaultField.source,
    };

    onChange({ conditions: [...conditions, newCondition] });
  }, [conditions, onChange]);

  const removeCondition = useCallback(
    (index: number) => {
      const updated = conditions.filter((_, i) => i !== index);
      onChange({ conditions: updated });
      setPreview(null);
    },
    [conditions, onChange]
  );

  const updateCondition = useCallback(
    (index: number, patch: Partial<FilterCondition>) => {
      const updated = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
      onChange({ conditions: updated });
      setPreview(null);
    },
    [conditions, onChange]
  );

  const handleFieldChange = useCallback(
    (index: number, fieldValue: string) => {
      const fieldDef = AVAILABLE_FIELDS.find((f) => f.value === fieldValue);
      if (!fieldDef) return;

      const allowedOps = OPERATORS_BY_TYPE[fieldDef.type] ?? ['eq'];
      const currentOp = conditions[index].operator;
      const newOp = allowedOps.includes(currentOp) ? currentOp : allowedOps[0];

      // Reset value when field changes
      let newValue: FilterCondition['value'] = '';
      if (newOp === 'between') {
        newValue = { from: '', to: '' };
      } else if (newOp === 'in') {
        newValue = [];
      }

      updateCondition(index, {
        field: fieldValue,
        source: fieldDef.source,
        operator: newOp,
        value: newValue,
      });
    },
    [conditions, updateCondition]
  );

  const handleOperatorChange = useCallback(
    (index: number, op: Operator) => {
      let newValue: FilterCondition['value'];
      if (op === 'between') {
        newValue = { from: '', to: '' };
      } else if (op === 'in') {
        newValue = [];
      } else {
        newValue = '';
      }
      updateCondition(index, { operator: op, value: newValue });
    },
    [updateCondition]
  );

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/nurture/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        setPreviewError('Session expired. Please refresh the page.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPreviewError(data?.error ?? 'Failed to preview segment.');
        return;
      }

      const data: PreviewResult = await res.json();
      setPreview(data);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        setPreviewError('Request timed out. Please try again.');
      } else {
        setPreviewError('Failed to preview segment.');
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [conditions]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-white">
          Segment Conditions
        </h3>
        <span className="text-[11px] text-gray-2">
          {conditions.length}/{MAX_CONDITIONS} conditions
        </span>
      </div>

      {/* Conditions list */}
      {conditions.length === 0 ? (
        <div className="bg-onyx-card border border-onyx-line rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-2">
            No conditions defined. All contacts in your tenant will match.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              index={index}
              onFieldChange={handleFieldChange}
              onOperatorChange={handleOperatorChange}
              onValueChange={(idx, val) => updateCondition(idx, { value: val })}
              onRemove={removeCondition}
            />
          ))}
        </div>
      )}

      {/* Add condition button */}
      <button
        type="button"
        onClick={addCondition}
        disabled={conditions.length >= MAX_CONDITIONS}
        className="w-full py-2.5 text-sm font-semibold text-brand border border-brand/30 rounded-lg hover:bg-brand/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Add Condition
      </button>

      {/* Preview section */}
      <div className="border-t border-onyx-line pt-4 space-y-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewLoading}
          className="w-full btn-primary py-2.5 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {previewLoading ? 'Loading...' : 'Preview Matching Contacts'}
        </button>

        {previewError && (
          <p className="text-sm text-status-red" role="alert">
            {previewError}
          </p>
        )}

        {preview && (
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <p className="text-sm text-white font-medium mb-2">
              <span className="text-brand font-bold">{preview.count}</span>{' '}
              {preview.count === 1 ? 'contact' : 'contacts'} match
            </p>
            {preview.sample.length > 0 && (
              <ul className="space-y-1">
                {preview.sample.map((contact) => (
                  <li key={contact.id} className="text-xs text-gray-2 flex items-center gap-2">
                    <span className="text-white">{contact.full_name}</span>
                    <span className="text-[10px] uppercase opacity-60">
                      {contact.owned_property_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {preview.count > preview.sample.length && (
              <p className="text-[11px] text-gray-2 mt-2">
                Showing {preview.sample.length} of {preview.count}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Condition Row ───────────────────────────────────────────────────────────

interface ConditionRowProps {
  condition: FilterCondition;
  index: number;
  onFieldChange: (index: number, field: string) => void;
  onOperatorChange: (index: number, op: Operator) => void;
  onValueChange: (index: number, value: FilterCondition['value']) => void;
  onRemove: (index: number) => void;
}

function ConditionRow({
  condition,
  index,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
}: ConditionRowProps) {
  const fieldDef = AVAILABLE_FIELDS.find((f) => f.value === condition.field);
  const allowedOperators = OPERATORS_BY_TYPE[fieldDef?.type ?? 'text'] ?? ['eq'];
  const filteredOperators = OPERATORS.filter((op) => allowedOperators.includes(op.value));

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-3 space-y-2">
      {/* Row header with source badge and remove button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-semibold tracking-label text-gray-2 bg-onyx px-2 py-0.5 rounded">
          {condition.source}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-gray-2 hover:text-status-red transition-colors p-0.5"
          aria-label={`Remove condition ${index + 1}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Field and operator row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Field selector */}
        <div>
          <label htmlFor={`condition-field-${index}`} className="sr-only">
            Field
          </label>
          <select
            id={`condition-field-${index}`}
            value={condition.field}
            onChange={(e) => onFieldChange(index, e.target.value)}
            className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <optgroup label="Contact Fields">
              {AVAILABLE_FIELDS.filter((f) => f.source === 'contact').map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lead Fields">
              {AVAILABLE_FIELDS.filter((f) => f.source === 'lead').map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Operator selector */}
        <div>
          <label htmlFor={`condition-op-${index}`} className="sr-only">
            Operator
          </label>
          <select
            id={`condition-op-${index}`}
            value={condition.operator}
            onChange={(e) => onOperatorChange(index, e.target.value as Operator)}
            className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {filteredOperators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Value input */}
      <ValueInput
        condition={condition}
        index={index}
        fieldDef={fieldDef}
        onValueChange={onValueChange}
      />
    </div>
  );
}

// ─── Value Input ─────────────────────────────────────────────────────────────

interface ValueInputProps {
  condition: FilterCondition;
  index: number;
  fieldDef: FieldOption | undefined;
  onValueChange: (index: number, value: FilterCondition['value']) => void;
}

function ValueInput({ condition, index, fieldDef, onValueChange }: ValueInputProps) {
  const { operator, value } = condition;

  // Between operator: two date inputs
  if (operator === 'between') {
    const betweenValue = (typeof value === 'object' && !Array.isArray(value) ? value : { from: '', to: '' }) as { from: string; to: string };
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`condition-from-${index}`} className="sr-only">
            From
          </label>
          <input
            id={`condition-from-${index}`}
            type="date"
            value={betweenValue.from}
            onChange={(e) => onValueChange(index, { ...betweenValue, from: e.target.value })}
            placeholder="From"
            className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor={`condition-to-${index}`} className="sr-only">
            To
          </label>
          <input
            id={`condition-to-${index}`}
            type="date"
            value={betweenValue.to}
            onChange={(e) => onValueChange(index, { ...betweenValue, to: e.target.value })}
            placeholder="To"
            className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>
    );
  }

  // In operator: comma-separated text input
  if (operator === 'in') {
    const inValue = Array.isArray(value) ? value.join(', ') : '';
    return (
      <div>
        <label htmlFor={`condition-value-${index}`} className="sr-only">
          Values (comma-separated)
        </label>
        <input
          id={`condition-value-${index}`}
          type="text"
          value={inValue}
          onChange={(e) => {
            const items = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s !== '');
            onValueChange(index, items);
          }}
          placeholder="value1, value2, value3"
          className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white placeholder:text-gray-2/50 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="text-[10px] text-gray-2 mt-0.5">Separate multiple values with commas</p>
      </div>
    );
  }

  // Enum field with options: dropdown
  if (fieldDef?.type === 'enum' && fieldDef.options) {
    const strValue = typeof value === 'string' ? value : '';
    return (
      <div>
        <label htmlFor={`condition-value-${index}`} className="sr-only">
          Value
        </label>
        <select
          id={`condition-value-${index}`}
          value={strValue}
          onChange={(e) => onValueChange(index, e.target.value)}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Select value...</option>
          {fieldDef.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Boolean field: dropdown
  if (fieldDef?.type === 'boolean') {
    const strValue = typeof value === 'string' ? value : '';
    return (
      <div>
        <label htmlFor={`condition-value-${index}`} className="sr-only">
          Value
        </label>
        <select
          id={`condition-value-${index}`}
          value={strValue}
          onChange={(e) => onValueChange(index, e.target.value)}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Select value...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    );
  }

  // Date field: date input
  if (fieldDef?.type === 'date') {
    const strValue = typeof value === 'string' ? value : '';
    return (
      <div>
        <label htmlFor={`condition-value-${index}`} className="sr-only">
          Value
        </label>
        <input
          id={`condition-value-${index}`}
          type="date"
          value={strValue}
          onChange={(e) => onValueChange(index, e.target.value)}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
    );
  }

  // Default: text input
  const strValue = typeof value === 'string' ? value : '';
  return (
    <div>
      <label htmlFor={`condition-value-${index}`} className="sr-only">
        Value
      </label>
      <input
        id={`condition-value-${index}`}
        type="text"
        value={strValue}
        onChange={(e) => onValueChange(index, e.target.value)}
        placeholder="Enter value..."
        className="w-full bg-onyx border border-onyx-line rounded-xl px-2.5 py-2 text-sm text-white placeholder:text-gray-2/50 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

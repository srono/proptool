import { describe, it, expect } from 'vitest';
import {
  evaluateSegment,
  matchesSegment,
  ContactRecord,
} from '../segment-evaluator';
import type { SegmentDefinition } from '../types';

function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: 'contact-1',
    full_name: 'Alice Tan',
    owned_property_type: 'hdb',
    owned_property_town: 'Tampines',
    mop_date: '2025-06-01',
    channel_preference: 'whatsapp',
    whatsapp_optin: true,
    ...overrides,
  };
}

describe('evaluateSegment', () => {
  describe('empty conditions', () => {
    it('returns all contacts when conditions array is empty', () => {
      const contacts = [makeContact(), makeContact({ id: 'contact-2' })];
      const segment: SegmentDefinition = { conditions: [] };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(2);
    });

    it('returns all contacts when conditions is undefined-like', () => {
      const contacts = [makeContact()];
      const segment = { conditions: [] } as SegmentDefinition;
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
    });
  });

  describe('eq operator', () => {
    it('includes contacts where field equals value', () => {
      const contacts = [
        makeContact({ owned_property_type: 'hdb' }),
        makeContact({ id: 'c2', owned_property_type: 'private' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_type', operator: 'eq', value: 'hdb', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].owned_property_type).toBe('hdb');
    });
  });

  describe('neq operator', () => {
    it('includes contacts where field does not equal value', () => {
      const contacts = [
        makeContact({ owned_property_type: 'hdb' }),
        makeContact({ id: 'c2', owned_property_type: 'private' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_type', operator: 'neq', value: 'hdb', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].owned_property_type).toBe('private');
    });
  });

  describe('in operator', () => {
    it('includes contacts where field value is in the list', () => {
      const contacts = [
        makeContact({ owned_property_type: 'hdb' }),
        makeContact({ id: 'c2', owned_property_type: 'private' }),
        makeContact({ id: 'c3', owned_property_type: 'landed' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_type', operator: 'in', value: ['hdb', 'landed'], source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(2);
    });
  });

  describe('before operator', () => {
    it('includes contacts where date field is before the value', () => {
      const contacts = [
        makeContact({ mop_date: '2024-01-01' }),
        makeContact({ id: 'c2', mop_date: '2026-01-01' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'mop_date', operator: 'before', value: '2025-01-01', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].mop_date).toBe('2024-01-01');
    });
  });

  describe('after operator', () => {
    it('includes contacts where date field is after the value', () => {
      const contacts = [
        makeContact({ mop_date: '2024-01-01' }),
        makeContact({ id: 'c2', mop_date: '2026-01-01' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'mop_date', operator: 'after', value: '2025-01-01', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].mop_date).toBe('2026-01-01');
    });
  });

  describe('between operator', () => {
    it('includes contacts where date field is between from and to', () => {
      const contacts = [
        makeContact({ mop_date: '2024-06-15' }),
        makeContact({ id: 'c2', mop_date: '2025-06-15' }),
        makeContact({ id: 'c3', mop_date: '2026-06-15' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          {
            field: 'mop_date',
            operator: 'between',
            value: { from: '2025-01-01', to: '2025-12-31' },
            source: 'contact',
          },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].mop_date).toBe('2025-06-15');
    });

    it('includes contacts on the boundary dates (inclusive)', () => {
      const contacts = [
        makeContact({ mop_date: '2025-01-01' }),
        makeContact({ id: 'c2', mop_date: '2025-12-31' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          {
            field: 'mop_date',
            operator: 'between',
            value: { from: '2025-01-01', to: '2025-12-31' },
            source: 'contact',
          },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(2);
    });
  });

  describe('null field handling', () => {
    it('excludes contacts where the filtered field is null', () => {
      const contacts = [
        makeContact({ mop_date: '2025-06-01' }),
        makeContact({ id: 'c2', mop_date: null }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'mop_date', operator: 'after', value: '2024-01-01', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
    });

    it('excludes contacts where the filtered field is undefined', () => {
      const contacts = [
        makeContact({ owned_property_town: 'Tampines' }),
        makeContact({ id: 'c2', owned_property_town: undefined }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_town', operator: 'eq', value: 'Tampines', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
    });
  });

  describe('AND logic (multiple conditions)', () => {
    it('includes contacts matching ALL conditions', () => {
      const contacts = [
        makeContact({ owned_property_type: 'hdb', owned_property_town: 'Tampines' }),
        makeContact({ id: 'c2', owned_property_type: 'hdb', owned_property_town: 'Bedok' }),
        makeContact({ id: 'c3', owned_property_type: 'private', owned_property_town: 'Tampines' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_type', operator: 'eq', value: 'hdb', source: 'contact' },
          { field: 'owned_property_town', operator: 'eq', value: 'Tampines', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(1);
      expect(result[0].owned_property_town).toBe('Tampines');
      expect(result[0].owned_property_type).toBe('hdb');
    });

    it('excludes contacts that fail any single condition', () => {
      const contacts = [
        makeContact({ owned_property_type: 'hdb', mop_date: '2024-01-01' }),
      ];
      const segment: SegmentDefinition = {
        conditions: [
          { field: 'owned_property_type', operator: 'eq', value: 'hdb', source: 'contact' },
          { field: 'mop_date', operator: 'after', value: '2025-01-01', source: 'contact' },
        ],
      };
      const result = evaluateSegment(contacts, segment);
      expect(result).toHaveLength(0);
    });
  });
});

describe('matchesSegment', () => {
  it('returns true for empty conditions', () => {
    const contact = makeContact();
    const segment: SegmentDefinition = { conditions: [] };
    expect(matchesSegment(contact, segment)).toBe(true);
  });

  it('returns false when a condition field is null', () => {
    const contact = makeContact({ mop_date: null });
    const segment: SegmentDefinition = {
      conditions: [
        { field: 'mop_date', operator: 'before', value: '2030-01-01', source: 'contact' },
      ],
    };
    expect(matchesSegment(contact, segment)).toBe(false);
  });

  it('returns true when all conditions match', () => {
    const contact = makeContact({ owned_property_type: 'hdb', mop_date: '2025-06-01' });
    const segment: SegmentDefinition = {
      conditions: [
        { field: 'owned_property_type', operator: 'eq', value: 'hdb', source: 'contact' },
        { field: 'mop_date', operator: 'before', value: '2026-01-01', source: 'contact' },
      ],
    };
    expect(matchesSegment(contact, segment)).toBe(true);
  });
});

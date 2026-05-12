import type { FilterCondition, SegmentDefinition } from './types';

/**
 * A generic contact record for client-side segment evaluation.
 * Fields are accessed dynamically based on filter conditions.
 */
export type ContactRecord = Record<string, unknown>;

/**
 * Evaluates whether a single contact matches a given filter condition.
 * Returns false if the field value is null/undefined (requirement 12.5).
 */
function matchesCondition(
  contact: ContactRecord,
  condition: FilterCondition
): boolean {
  const fieldValue = contact[condition.field];

  // Null/undefined fields always exclude the contact (requirement 12.5)
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  switch (condition.operator) {
    case 'eq':
      return String(fieldValue) === String(condition.value);

    case 'neq':
      return String(fieldValue) !== String(condition.value);

    case 'in': {
      if (!Array.isArray(condition.value)) {
        return false;
      }
      return condition.value.includes(String(fieldValue));
    }

    case 'before': {
      const fieldDate = new Date(String(fieldValue));
      const compareDate = new Date(String(condition.value));
      if (isNaN(fieldDate.getTime()) || isNaN(compareDate.getTime())) {
        return false;
      }
      return fieldDate < compareDate;
    }

    case 'after': {
      const fieldDate = new Date(String(fieldValue));
      const compareDate = new Date(String(condition.value));
      if (isNaN(fieldDate.getTime()) || isNaN(compareDate.getTime())) {
        return false;
      }
      return fieldDate > compareDate;
    }

    case 'between': {
      const value = condition.value as { from: string; to: string };
      const fieldDate = new Date(String(fieldValue));
      const fromDate = new Date(value.from);
      const toDate = new Date(value.to);
      if (
        isNaN(fieldDate.getTime()) ||
        isNaN(fromDate.getTime()) ||
        isNaN(toDate.getTime())
      ) {
        return false;
      }
      return fieldDate >= fromDate && fieldDate <= toDate;
    }

    default:
      return false;
  }
}

/**
 * Evaluates whether a single contact matches ALL conditions in a segment definition.
 * Uses AND logic across all conditions (requirement 12.4).
 * Empty conditions array means all contacts match (requirement 12.6).
 */
export function matchesSegment(
  contact: ContactRecord,
  segment: SegmentDefinition
): boolean {
  // Empty conditions → all contacts match (requirement 12.6)
  if (!segment.conditions || segment.conditions.length === 0) {
    return true;
  }

  // AND logic: all conditions must match (requirement 12.4)
  return segment.conditions.every((condition) =>
    matchesCondition(contact, condition)
  );
}

/**
 * Filters a list of contacts by a segment definition, returning only those
 * that match ALL conditions. Used for client-side segment preview UI.
 *
 * @param contacts - Array of contact records to evaluate
 * @param segment - Segment definition with filter conditions
 * @returns Contacts that match all conditions in the segment
 */
export function evaluateSegment(
  contacts: ContactRecord[],
  segment: SegmentDefinition
): ContactRecord[] {
  return contacts.filter((contact) => matchesSegment(contact, segment));
}

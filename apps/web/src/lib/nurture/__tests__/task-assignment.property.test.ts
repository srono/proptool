import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveTaskAssignment } from '../task-assignment';

// --- Generators ---

/** Generate an arbitrary UUID-like string (user ID) */
const userIdArb: fc.Arbitrary<string> = fc.uuid();

/** Generate a nullable lead_assigned_to value */
const leadAssignedToArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  userIdArb
);

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 8: Task Assignment Priority
 *
 * **Validates: Requirements 4.7**
 *
 * For any contact eligible for task generation, the generated nurture_task's
 * assigned_to field SHALL equal the contact's lead assigned_to value if a lead
 * assignment exists, otherwise it SHALL equal the playbook's created_by value.
 */
describe('Feature: nurture-playbooks, Property 8: Task Assignment Priority', () => {
  it('assigned_to equals lead.assigned_to when lead assignment exists, else playbook.created_by', () => {
    fc.assert(
      fc.property(
        leadAssignedToArb,
        userIdArb,
        (leadAssignedTo, playbookCreatedBy) => {
          const result = resolveTaskAssignment(leadAssignedTo, playbookCreatedBy);

          if (leadAssignedTo !== null) {
            expect(result).toBe(leadAssignedTo);
          } else {
            expect(result).toBe(playbookCreatedBy);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('always returns lead.assigned_to when it is non-null (lead takes precedence)', () => {
    fc.assert(
      fc.property(
        userIdArb,
        userIdArb,
        (leadAssignedTo, playbookCreatedBy) => {
          const result = resolveTaskAssignment(leadAssignedTo, playbookCreatedBy);
          expect(result).toBe(leadAssignedTo);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('falls back to playbook.created_by when lead.assigned_to is null', () => {
    fc.assert(
      fc.property(
        userIdArb,
        (playbookCreatedBy) => {
          const result = resolveTaskAssignment(null, playbookCreatedBy);
          expect(result).toBe(playbookCreatedBy);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('result is always a non-empty string', () => {
    fc.assert(
      fc.property(
        leadAssignedToArb,
        userIdArb,
        (leadAssignedTo, playbookCreatedBy) => {
          const result = resolveTaskAssignment(leadAssignedTo, playbookCreatedBy);
          expect(result).toBeTruthy();
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('result is always either lead.assigned_to or playbook.created_by (no other value)', () => {
    fc.assert(
      fc.property(
        leadAssignedToArb,
        userIdArb,
        (leadAssignedTo, playbookCreatedBy) => {
          const result = resolveTaskAssignment(leadAssignedTo, playbookCreatedBy);
          const validValues = [leadAssignedTo, playbookCreatedBy].filter(Boolean);
          expect(validValues).toContain(result);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('when lead.assigned_to equals playbook.created_by, result is that same value', () => {
    fc.assert(
      fc.property(
        userIdArb,
        (userId) => {
          // Both are the same user
          const result = resolveTaskAssignment(userId, userId);
          expect(result).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

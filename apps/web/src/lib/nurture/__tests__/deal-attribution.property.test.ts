import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isDealAttributedToPlaybook,
  computeDealAttribution,
  ATTRIBUTION_WINDOW_DAYS,
  Deal,
  CompletedTask,
} from '../analytics';

// --- Constants ---

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Generators ---

/** Generate a UUID-like string */
const uuidArb = fc.uuid();

/** Generate a contact_id from a small pool to increase matching probability */
const contactIdArb = fc.constantFrom(
  'contact-aaa',
  'contact-bbb',
  'contact-ccc',
  'contact-ddd',
  'contact-eee'
);

/** Generate a playbook_id from a small pool */
const playbookIdArb = fc.constantFrom(
  'playbook-111',
  'playbook-222',
  'playbook-333'
);

/** Generate an ISO datetime string within a reasonable range */
const dateArb = fc.date({
  min: new Date('2022-01-01'),
  max: new Date('2025-12-31'),
  noInvalidDate: true,
}).map(d => d.toISOString());

/** Generate a Deal */
const dealArb: fc.Arbitrary<Deal> = fc.record({
  id: uuidArb,
  contact_id: contactIdArb,
  created_at: dateArb,
  status: fc.constantFrom('pending', 'completed', 'cancelled'),
  net_commission: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 100000 })),
});

/** Generate a CompletedTask */
const completedTaskArb: fc.Arbitrary<CompletedTask> = fc.record({
  id: uuidArb,
  contact_id: contactIdArb,
  playbook_id: playbookIdArb,
  completed_at: dateArb,
});

/** Generate a list of deals */
const dealsArb = fc.array(dealArb, { minLength: 0, maxLength: 10 });

/** Generate a list of completed tasks */
const completedTasksArb = fc.array(completedTaskArb, { minLength: 0, maxLength: 15 });

// --- Helper: compute expected attribution from the property rules ---

function isAttributed(deal: Deal, playbookId: string, tasks: CompletedTask[]): boolean {
  const dealCreatedAt = new Date(deal.created_at).getTime();
  const windowStart = dealCreatedAt - ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY;

  return tasks.some(
    (task) =>
      task.contact_id === deal.contact_id &&
      task.playbook_id === playbookId &&
      new Date(task.completed_at).getTime() >= windowStart &&
      new Date(task.completed_at).getTime() <= dealCreatedAt
  );
}

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 15: Deal Attribution
 *
 * **Validates: Requirements 11.4**
 *
 * For any deal and any playbook, the deal SHALL be attributed to the playbook if and only if:
 * the deal's contact_id matches a contact who has at least one nurture_task from that playbook
 * with status "done" AND that task's completed_at is within 180 days before the deal's created_at.
 */
describe('Feature: nurture-playbooks, Property 15: Deal Attribution', () => {
  it('isDealAttributedToPlaybook returns true iff matching contact_id AND task completed_at within 180 days before deal created_at', () => {
    fc.assert(
      fc.property(
        dealArb,
        playbookIdArb,
        completedTasksArb,
        (deal, playbookId, tasks) => {
          const actual = isDealAttributedToPlaybook(deal, playbookId, tasks);
          const expected = isAttributed(deal, playbookId, tasks);
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('attribution is true when task completed_at is exactly at the window boundary (180 days before deal)', () => {
    fc.assert(
      fc.property(
        uuidArb,
        contactIdArb,
        playbookIdArb,
        dateArb,
        (dealId, contactId, playbookId, dealCreatedAt) => {
          const dealCreatedMs = new Date(dealCreatedAt).getTime();
          const exactBoundary = new Date(dealCreatedMs - ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY).toISOString();

          const deal: Deal = {
            id: dealId,
            contact_id: contactId,
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-boundary',
            contact_id: contactId,
            playbook_id: playbookId,
            completed_at: exactBoundary,
          };

          expect(isDealAttributedToPlaybook(deal, playbookId, [task])).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attribution is true when task completed_at equals deal created_at (same moment)', () => {
    fc.assert(
      fc.property(
        uuidArb,
        contactIdArb,
        playbookIdArb,
        dateArb,
        (dealId, contactId, playbookId, dealCreatedAt) => {
          const deal: Deal = {
            id: dealId,
            contact_id: contactId,
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-same-moment',
            contact_id: contactId,
            playbook_id: playbookId,
            completed_at: dealCreatedAt,
          };

          expect(isDealAttributedToPlaybook(deal, playbookId, [task])).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attribution is false when task completed_at is more than 180 days before deal created_at', () => {
    fc.assert(
      fc.property(
        uuidArb,
        contactIdArb,
        playbookIdArb,
        dateArb,
        fc.integer({ min: 1, max: 365 }),
        (dealId, contactId, playbookId, dealCreatedAt, extraDays) => {
          const dealCreatedMs = new Date(dealCreatedAt).getTime();
          const tooEarly = new Date(
            dealCreatedMs - (ATTRIBUTION_WINDOW_DAYS + extraDays) * MS_PER_DAY
          ).toISOString();

          const deal: Deal = {
            id: dealId,
            contact_id: contactId,
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-too-early',
            contact_id: contactId,
            playbook_id: playbookId,
            completed_at: tooEarly,
          };

          expect(isDealAttributedToPlaybook(deal, playbookId, [task])).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attribution is false when task completed_at is after deal created_at', () => {
    fc.assert(
      fc.property(
        uuidArb,
        contactIdArb,
        playbookIdArb,
        dateArb,
        fc.integer({ min: 1, max: 365 }),
        (dealId, contactId, playbookId, dealCreatedAt, daysAfter) => {
          const dealCreatedMs = new Date(dealCreatedAt).getTime();
          const afterDeal = new Date(dealCreatedMs + daysAfter * MS_PER_DAY).toISOString();

          const deal: Deal = {
            id: dealId,
            contact_id: contactId,
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-after-deal',
            contact_id: contactId,
            playbook_id: playbookId,
            completed_at: afterDeal,
          };

          expect(isDealAttributedToPlaybook(deal, playbookId, [task])).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attribution is false when contact_id does not match', () => {
    fc.assert(
      fc.property(
        uuidArb,
        playbookIdArb,
        dateArb,
        (dealId, playbookId, dealCreatedAt) => {
          const deal: Deal = {
            id: dealId,
            contact_id: 'contact-deal-owner',
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-different-contact',
            contact_id: 'contact-other-person',
            playbook_id: playbookId,
            completed_at: dealCreatedAt, // Same time, but different contact
          };

          expect(isDealAttributedToPlaybook(deal, playbookId, [task])).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attribution is false when playbook_id does not match', () => {
    fc.assert(
      fc.property(
        uuidArb,
        contactIdArb,
        dateArb,
        (dealId, contactId, dealCreatedAt) => {
          const deal: Deal = {
            id: dealId,
            contact_id: contactId,
            created_at: dealCreatedAt,
            status: 'completed',
          };

          const task: CompletedTask = {
            id: 'task-different-playbook',
            contact_id: contactId,
            playbook_id: 'playbook-other',
            completed_at: dealCreatedAt,
          };

          // Query for a different playbook than the task belongs to
          expect(isDealAttributedToPlaybook(deal, 'playbook-queried', [task])).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('computeDealAttribution maps each deal to its attributed playbook_ids correctly', () => {
    fc.assert(
      fc.property(
        dealsArb,
        completedTasksArb,
        (deals, tasks) => {
          const attributions = computeDealAttribution(deals, tasks);

          for (const deal of deals) {
            const dealCreatedAt = new Date(deal.created_at).getTime();
            const windowStart = dealCreatedAt - ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY;

            // Find all playbooks that should be attributed
            const expectedPlaybooks = new Set<string>();
            for (const task of tasks) {
              if (task.contact_id !== deal.contact_id) continue;
              const taskCompletedAt = new Date(task.completed_at).getTime();
              if (taskCompletedAt >= windowStart && taskCompletedAt <= dealCreatedAt) {
                expectedPlaybooks.add(task.playbook_id);
              }
            }

            if (expectedPlaybooks.size > 0) {
              const actualPlaybooks = attributions.get(deal.id);
              expect(actualPlaybooks).toBeDefined();
              expect(new Set(actualPlaybooks)).toEqual(expectedPlaybooks);
            } else {
              expect(attributions.has(deal.id)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('deals with no matching tasks have no attributions', () => {
    fc.assert(
      fc.property(dealsArb, (deals) => {
        // No tasks at all → no attributions
        const attributions = computeDealAttribution(deals, []);
        expect(attributions.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeResponseRate,
  CompletedWhatsAppTask,
  InboundMessage,
  RESPONSE_WINDOW_DAYS,
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

/** Generate an ISO datetime string within a reasonable range using integer timestamps */
const dateArb = fc.integer({
  min: new Date('2023-01-01').getTime(),
  max: new Date('2025-12-31').getTime(),
}).map((ts) => new Date(ts).toISOString());

/** Generate a completed WhatsApp task */
const completedWhatsAppTaskArb: fc.Arbitrary<CompletedWhatsAppTask> = fc.record({
  id: uuidArb,
  contact_id: contactIdArb,
  playbook_id: playbookIdArb,
  completed_at: dateArb,
});

/** Generate an inbound message */
const inboundMessageArb: fc.Arbitrary<InboundMessage> = fc.record({
  contact_id: contactIdArb,
  received_at: dateArb,
});

/** Generate a list of completed WhatsApp tasks (0 to 20) */
const completedTasksArb = fc.array(completedWhatsAppTaskArb, { minLength: 0, maxLength: 20 });

/** Generate a list of inbound messages (0 to 30) */
const inboundMessagesArb = fc.array(inboundMessageArb, { minLength: 0, maxLength: 30 });

// --- Helper: compute expected response rate from the property definition ---

function expectedResponseRate(
  tasks: CompletedWhatsAppTask[],
  messages: InboundMessage[]
): number {
  if (tasks.length === 0) return 0;

  const windowMs = RESPONSE_WINDOW_DAYS * MS_PER_DAY;
  const respondedContacts = new Set<string>();

  for (const task of tasks) {
    const completedAt = new Date(task.completed_at).getTime();
    const windowEnd = completedAt + windowMs;

    for (const msg of messages) {
      if (msg.contact_id !== task.contact_id) continue;
      const receivedAt = new Date(msg.received_at).getTime();
      if (receivedAt >= completedAt && receivedAt <= windowEnd) {
        respondedContacts.add(task.contact_id);
        break;
      }
    }
  }

  return respondedContacts.size / tasks.length;
}

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 14: Response Rate Calculation
 *
 * **Validates: Requirements 11.3**
 *
 * For any set of completed WhatsApp nurture tasks and inbound messages,
 * the response rate SHALL equal:
 * (count of unique contacts who sent an inbound WhatsApp message within 7 days
 * of their task being marked done) / (total count of WhatsApp tasks marked done).
 * When the denominator is zero, the rate SHALL be zero.
 */
describe('Feature: nurture-playbooks, Property 14: Response Rate Calculation', () => {
  it('response rate equals unique responded contacts / total tasks for arbitrary inputs', () => {
    fc.assert(
      fc.property(completedTasksArb, inboundMessagesArb, (tasks, messages) => {
        const actual = computeResponseRate(tasks, messages);
        const expected = expectedResponseRate(tasks, messages);
        expect(actual).toBeCloseTo(expected, 10);
      }),
      { numRuns: 500 }
    );
  });

  it('returns zero when there are no completed tasks (denominator is zero)', () => {
    fc.assert(
      fc.property(inboundMessagesArb, (messages) => {
        const rate = computeResponseRate([], messages);
        expect(rate).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('returns zero when there are no inbound messages', () => {
    fc.assert(
      fc.property(
        fc.array(completedWhatsAppTaskArb, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const rate = computeResponseRate(tasks, []);
          expect(rate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rate is between 0 and 1 inclusive', () => {
    fc.assert(
      fc.property(completedTasksArb, inboundMessagesArb, (tasks, messages) => {
        const rate = computeResponseRate(tasks, messages);
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });

  it('counts each contact at most once even with multiple tasks for the same contact', () => {
    // Generate tasks where the same contact has multiple tasks
    const sharedContactId = 'contact-aaa';

    fc.assert(
      fc.property(
        fc.array(dateArb, { minLength: 2, maxLength: 5 }),
        (taskDates) => {
          const tasks: CompletedWhatsAppTask[] = taskDates.map((completedAt, i) => ({
            id: `task-${i}`,
            contact_id: sharedContactId,
            playbook_id: 'playbook-111',
            completed_at: completedAt,
          }));

          // Create a reply that's within 7 days of the first task
          const firstTaskTime = new Date(taskDates[0]).getTime();
          const withinWindowDate = new Date(firstTaskTime + 1000).toISOString();

          const messages: InboundMessage[] = [
            { contact_id: sharedContactId, received_at: withinWindowDate },
          ];

          const rate = computeResponseRate(tasks, messages);

          // The numerator is at most 1 (unique contact), denominator is tasks.length
          // So rate should be at most 1/tasks.length (+ floating point tolerance)
          expect(rate).toBeLessThanOrEqual(1 / tasks.length + 0.0001);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not count replies outside the 7-day window', () => {
    fc.assert(
      fc.property(
        completedWhatsAppTaskArb,
        (task) => {
          const completedAt = new Date(task.completed_at).getTime();
          // Message arrives more than 7 days after task completion
          const outsideWindow = new Date(
            completedAt + (RESPONSE_WINDOW_DAYS + 1) * MS_PER_DAY
          ).toISOString();

          const messages: InboundMessage[] = [
            { contact_id: task.contact_id, received_at: outsideWindow },
          ];

          const rate = computeResponseRate([task], messages);
          expect(rate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not count replies before the task was completed', () => {
    fc.assert(
      fc.property(
        completedWhatsAppTaskArb,
        (task) => {
          const completedAt = new Date(task.completed_at).getTime();
          // Message arrived before task was completed
          const beforeCompletion = new Date(completedAt - MS_PER_DAY).toISOString();

          const messages: InboundMessage[] = [
            { contact_id: task.contact_id, received_at: beforeCompletion },
          ];

          const rate = computeResponseRate([task], messages);
          expect(rate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('counts reply exactly at the window boundary (7 days) as valid', () => {
    fc.assert(
      fc.property(
        completedWhatsAppTaskArb,
        (task) => {
          const completedAt = new Date(task.completed_at).getTime();
          // Message arrives exactly at the 7-day boundary
          const atBoundary = new Date(
            completedAt + RESPONSE_WINDOW_DAYS * MS_PER_DAY
          ).toISOString();

          const messages: InboundMessage[] = [
            { contact_id: task.contact_id, received_at: atBoundary },
          ];

          const rate = computeResponseRate([task], messages);
          expect(rate).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not count messages from different contacts', () => {
    fc.assert(
      fc.property(
        fc.tuple(completedWhatsAppTaskArb, contactIdArb).filter(
          ([task, otherId]) => task.contact_id !== otherId
        ),
        ([task, otherContactId]) => {
          const completedAt = new Date(task.completed_at).getTime();
          // Message from a different contact within the window
          const withinWindow = new Date(completedAt + 1000).toISOString();

          const messages: InboundMessage[] = [
            { contact_id: otherContactId, received_at: withinWindow },
          ];

          const rate = computeResponseRate([task], messages);
          expect(rate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  computeResponseRate,
  computeDealAttribution,
  isDealAttributedToPlaybook,
  computeFunnelMetrics,
  computePlaybookPerformance,
  CompletedWhatsAppTask,
  InboundMessage,
  Deal,
  CompletedTask,
  RESPONSE_WINDOW_DAYS,
  ATTRIBUTION_WINDOW_DAYS,
} from '../analytics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysInMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function isoDate(baseDate: Date, offsetDays: number): string {
  return new Date(baseDate.getTime() + daysInMs(offsetDays)).toISOString();
}

// ─── computeResponseRate ─────────────────────────────────────────────────────

describe('computeResponseRate', () => {
  const baseDate = new Date('2024-06-01T10:00:00Z');

  it('returns 0 when no completed tasks', () => {
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: baseDate.toISOString() },
    ];
    expect(computeResponseRate([], messages)).toBe(0);
  });

  it('returns 0 when no inbound messages', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    expect(computeResponseRate(tasks, [])).toBe(0);
  });

  it('returns 1 when all contacts replied within 7 days', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
      { id: 't2', contact_id: 'c2', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, 1) },
      { contact_id: 'c2', received_at: isoDate(baseDate, 3) },
    ];
    expect(computeResponseRate(tasks, messages)).toBe(1);
  });

  it('returns 0.5 when half the contacts replied within 7 days', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
      { id: 't2', contact_id: 'c2', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, 2) },
      // c2 replied too late
      { contact_id: 'c2', received_at: isoDate(baseDate, 10) },
    ];
    expect(computeResponseRate(tasks, messages)).toBe(0.5);
  });

  it('does not count messages received before task completion', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, -1) },
    ];
    expect(computeResponseRate(tasks, messages)).toBe(0);
  });

  it('counts a contact only once even with multiple tasks', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
      { id: 't2', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, 2) },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, 1) },
    ];
    // 1 unique contact responded / 2 total tasks = 0.5
    expect(computeResponseRate(tasks, messages)).toBe(0.5);
  });

  it('counts reply exactly at 7-day boundary as valid', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, RESPONSE_WINDOW_DAYS) },
    ];
    expect(computeResponseRate(tasks, messages)).toBe(1);
  });

  it('does not count reply just past 7-day boundary', () => {
    const tasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    // 7 days + 1 ms past the boundary
    const justPast = new Date(baseDate.getTime() + daysInMs(RESPONSE_WINDOW_DAYS) + 1).toISOString();
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: justPast },
    ];
    expect(computeResponseRate(tasks, messages)).toBe(0);
  });
});

// ─── computeDealAttribution ──────────────────────────────────────────────────

describe('computeDealAttribution', () => {
  const baseDate = new Date('2024-06-01T10:00:00Z');

  it('returns empty map when no deals', () => {
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const result = computeDealAttribution([], tasks);
    expect(result.size).toBe(0);
  });

  it('returns empty map when no completed tasks', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const result = computeDealAttribution(deals, []);
    expect(result.size).toBe(0);
  });

  it('attributes deal when task completed within 180 days before deal creation', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -30) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.get('d1')).toEqual(['p1']);
  });

  it('does not attribute deal when task completed more than 180 days before', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -(ATTRIBUTION_WINDOW_DAYS + 1)) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.has('d1')).toBe(false);
  });

  it('does not attribute deal when task completed after deal creation', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, 1) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.has('d1')).toBe(false);
  });

  it('does not attribute deal when contact_id does not match', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c2', playbook_id: 'p1', completed_at: isoDate(baseDate, -10) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.has('d1')).toBe(false);
  });

  it('attributes deal to multiple playbooks', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -10) },
      { id: 't2', contact_id: 'c1', playbook_id: 'p2', completed_at: isoDate(baseDate, -20) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.get('d1')?.sort()).toEqual(['p1', 'p2']);
  });

  it('attributes task completed exactly at 180-day boundary', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -ATTRIBUTION_WINDOW_DAYS) },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.get('d1')).toEqual(['p1']);
  });

  it('attributes task completed at same time as deal creation', () => {
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: baseDate.toISOString() },
    ];
    const result = computeDealAttribution(deals, tasks);
    expect(result.get('d1')).toEqual(['p1']);
  });
});

// ─── isDealAttributedToPlaybook ──────────────────────────────────────────────

describe('isDealAttributedToPlaybook', () => {
  const baseDate = new Date('2024-06-01T10:00:00Z');

  it('returns true when task is within attribution window', () => {
    const deal: Deal = { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' };
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -50) },
    ];
    expect(isDealAttributedToPlaybook(deal, 'p1', tasks)).toBe(true);
  });

  it('returns false when task is from different playbook', () => {
    const deal: Deal = { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' };
    const tasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p2', completed_at: isoDate(baseDate, -50) },
    ];
    expect(isDealAttributedToPlaybook(deal, 'p1', tasks)).toBe(false);
  });
});

// ─── computeFunnelMetrics ────────────────────────────────────────────────────

describe('computeFunnelMetrics', () => {
  const baseDate = new Date('2024-06-01T10:00:00Z');

  it('computes funnel metrics correctly', () => {
    const completedTasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -10) },
      { id: 't2', contact_id: 'c2', playbook_id: 'p1', completed_at: isoDate(baseDate, -5) },
    ];
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];

    const result = computeFunnelMetrics({
      totalContacts: 10,
      tasksCreated: 5,
      completedTasks,
      deals,
    });

    expect(result.total_contacts).toBe(10);
    expect(result.tasks_created).toBe(5);
    expect(result.tasks_completed).toBe(2);
    expect(result.deals_from_nurtured).toBe(1);
  });

  it('returns zero deals_from_nurtured when no attribution', () => {
    const completedTasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -200) },
    ];
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed' },
    ];

    const result = computeFunnelMetrics({
      totalContacts: 5,
      tasksCreated: 3,
      completedTasks,
      deals,
    });

    expect(result.deals_from_nurtured).toBe(0);
  });
});

// ─── computePlaybookPerformance ──────────────────────────────────────────────

describe('computePlaybookPerformance', () => {
  const baseDate = new Date('2024-06-01T10:00:00Z');

  it('computes per-playbook performance', () => {
    const completedTasks: CompletedTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -10) },
      { id: 't2', contact_id: 'c2', playbook_id: 'p1', completed_at: isoDate(baseDate, -5) },
      { id: 't3', contact_id: 'c3', playbook_id: 'p2', completed_at: isoDate(baseDate, -3) },
    ];
    const whatsAppTasks: CompletedWhatsAppTask[] = [
      { id: 't1', contact_id: 'c1', playbook_id: 'p1', completed_at: isoDate(baseDate, -10) },
      { id: 't2', contact_id: 'c2', playbook_id: 'p1', completed_at: isoDate(baseDate, -5) },
    ];
    const messages: InboundMessage[] = [
      { contact_id: 'c1', received_at: isoDate(baseDate, -9) },
    ];
    const deals: Deal[] = [
      { id: 'd1', contact_id: 'c1', created_at: baseDate.toISOString(), status: 'completed', net_commission: 5000 },
    ];

    const result = computePlaybookPerformance({
      playbookIds: ['p1', 'p2'],
      completedTasks,
      completedWhatsAppTasks: whatsAppTasks,
      inboundMessages: messages,
      deals,
    });

    expect(result).toHaveLength(2);

    const p1 = result.find((r) => r.playbook_id === 'p1')!;
    expect(p1.tasks_completed).toBe(2);
    expect(p1.response_rate).toBe(0.5); // 1 contact replied / 2 tasks
    expect(p1.deals_won).toBe(1);
    expect(p1.net_commission).toBe(5000);

    const p2 = result.find((r) => r.playbook_id === 'p2')!;
    expect(p2.tasks_completed).toBe(1);
    expect(p2.response_rate).toBe(0); // no whatsapp tasks for p2
    expect(p2.deals_won).toBe(0);
    expect(p2.net_commission).toBe(0);
  });

  it('handles empty data gracefully', () => {
    const result = computePlaybookPerformance({
      playbookIds: ['p1'],
      completedTasks: [],
      completedWhatsAppTasks: [],
      inboundMessages: [],
      deals: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      playbook_id: 'p1',
      tasks_completed: 0,
      response_rate: 0,
      deals_won: 0,
      net_commission: 0,
    });
  });
});

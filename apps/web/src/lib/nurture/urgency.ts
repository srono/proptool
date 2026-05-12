import type { EnrichedNurtureTask, FilterState } from './types';

// ─── Timezone Helpers ────────────────────────────────────────────────────────

const SG_TIMEZONE = 'Asia/Singapore';

/**
 * Get the start of the current calendar day in Asia/Singapore timezone
 * as a UTC timestamp for comparison.
 */
function getSingaporeDayBounds(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  // Format current date in Singapore timezone to get the calendar date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const sgDateStr = formatter.format(now); // "YYYY-MM-DD"

  // Parse the Singapore date and compute start/end in UTC
  // Singapore is UTC+8, so start of day in SG = midnight SG = 16:00 previous day UTC
  const [year, month, day] = sgDateStr.split('-').map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Adjust for UTC+8: subtract 8 hours to get UTC equivalent of midnight SG
  startOfDay.setUTCHours(startOfDay.getUTCHours() - 8);

  const endOfDay = new Date(startOfDay.getTime());
  endOfDay.setUTCHours(endOfDay.getUTCHours() + 24);

  return { startOfDay, endOfDay };
}

// ─── Urgency Classification ──────────────────────────────────────────────────

/**
 * Classify a task's urgency based on its due_at date relative to the current
 * calendar day in Asia/Singapore timezone.
 *
 * - "overdue": due_at is before the start of the current calendar day
 * - "today": due_at falls within the current calendar day
 * - "upcoming": due_at is on or after the start of the next calendar day
 */
export function classifyUrgency(dueAt: string): 'overdue' | 'today' | 'upcoming' {
  const { startOfDay, endOfDay } = getSingaporeDayBounds();
  const dueDate = new Date(dueAt);

  if (dueDate < startOfDay) {
    return 'overdue';
  }
  if (dueDate >= endOfDay) {
    return 'upcoming';
  }
  return 'today';
}

// ─── Stats Computation ───────────────────────────────────────────────────────

/**
 * Count pending tasks (not done, not snoozed, not skipped) by urgency category.
 */
export function computeStatsCounts(tasks: EnrichedNurtureTask[]): {
  overdue: number;
  today: number;
  upcoming: number;
} {
  const counts = { overdue: 0, today: 0, upcoming: 0 };

  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'snoozed' || task.status === 'skipped') {
      continue;
    }
    const urgency = classifyUrgency(task.due_at);
    counts[urgency]++;
  }

  return counts;
}

// ─── Relative Activity Formatting ────────────────────────────────────────────

/**
 * Format a date string as relative time:
 * - "Xh ago" for dates within the past 24 hours
 * - "Xd ago" for dates within the past 7 days
 * - Short date (e.g., "12 Jan") for older dates
 * - "—" for null input
 */
export function formatRelativeActivity(dateStr: string | null): string {
  if (dateStr === null) {
    return '—';
  }

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return `${Math.max(diffHours, 0)}h ago`;
  }
  if (diffDays <= 7) {
    return `${diffDays}d ago`;
  }

  // Short date format: "12 Jan"
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

// ─── Singapore Phone Formatting ──────────────────────────────────────────────

/**
 * Format a Singapore phone number as "+65 XXXX XXXX".
 * Validates that the number is 8 digits starting with 6, 8, or 9.
 * Returns "–" for null or invalid numbers.
 */
export function formatSingaporePhone(phone: string | null): string {
  if (phone === null || phone === undefined || typeof phone !== 'string') {
    return '–';
  }

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle numbers with country code prefix
  let localDigits: string;
  if (digits.startsWith('65') && digits.length === 10) {
    localDigits = digits.slice(2);
  } else if (digits.length === 8) {
    localDigits = digits;
  } else {
    return '–';
  }

  // Validate: must be 8 digits starting with 6, 8, or 9
  if (!/^[689]\d{7}$/.test(localDigits)) {
    return '–';
  }

  return `+65 ${localDigits.slice(0, 4)} ${localDigits.slice(4)}`;
}

// ─── Contact Initials ────────────────────────────────────────────────────────

/**
 * Extract max 2 uppercase characters from a contact name.
 * Uses the first character of the first word and the first character of the last word.
 * If only one word, returns just the first character.
 */
export function getContactInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }

  const first = words[0][0].toUpperCase();
  const last = words[words.length - 1][0].toUpperCase();
  return `${first}${last}`;
}

// ─── Task Grouping by Urgency ────────────────────────────────────────────────

/**
 * Group non-snoozed tasks by urgency classification.
 * Tasks within each group are sorted by due_at ascending.
 * Empty groups are excluded from the result.
 */
export function groupTasksByUrgency(
  tasks: EnrichedNurtureTask[]
): Record<string, EnrichedNurtureTask[]> {
  const groups: Record<string, EnrichedNurtureTask[]> = Object.create(null);

  for (const task of tasks) {
    if (task.status === 'snoozed') {
      continue;
    }
    const urgency = classifyUrgency(task.due_at);
    if (!groups[urgency]) {
      groups[urgency] = [];
    }
    groups[urgency].push(task);
  }

  // Sort tasks within each group by due_at ascending
  for (const key of Object.keys(groups)) {
    groups[key].sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    );
  }

  return groups;
}

// ─── Task Grouping by Playbook ───────────────────────────────────────────────

/**
 * Group tasks by playbook name.
 * Section keys are sorted alphabetically by playbook name.
 * Tasks within each section are sorted by due_at ascending.
 */
export function groupTasksByPlaybook(
  tasks: EnrichedNurtureTask[]
): Record<string, EnrichedNurtureTask[]> {
  const groups: Record<string, EnrichedNurtureTask[]> = Object.create(null);

  for (const task of tasks) {
    const key = task.playbook_name;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  }

  // Sort tasks within each group by due_at ascending
  for (const key of Object.keys(groups)) {
    groups[key].sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    );
  }

  // Return with keys sorted alphabetically
  const sortedKeys = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const sorted: Record<string, EnrichedNurtureTask[]> = {};
  for (const key of sortedKeys) {
    sorted[key] = groups[key];
  }

  return sorted;
}

// ─── Task Grouping by Contact ─────────────────────────────────────────────────

/**
 * Group tasks by contact_id, preserving the original sort order within each
 * contact group. Returns a Map to maintain insertion order of first appearance.
 */
export function groupTasksByContact(
  tasks: EnrichedNurtureTask[]
): Map<string, EnrichedNurtureTask[]> {
  const groups = new Map<string, EnrichedNurtureTask[]>();

  for (const task of tasks) {
    const existing = groups.get(task.contact_id);
    if (existing) {
      existing.push(task);
    } else {
      groups.set(task.contact_id, [task]);
    }
  }

  return groups;
}

// ─── Task Filtering ──────────────────────────────────────────────────────────

/**
 * Apply AND logic for all active filters:
 * - Pill tab filter (urgency category or snoozed)
 * - Playbook filter
 * - Consent filter
 * - My Tasks Only toggle (requires currentUserId to be set in filter state)
 */
export function filterTasks(
  tasks: EnrichedNurtureTask[],
  filters: FilterState
): EnrichedNurtureTask[] {
  return tasks.filter((task) => {
    // Always exclude done and skipped tasks from the nurture list
    if (task.status === 'done' || task.status === 'skipped') {
      return false;
    }

    // Pill tab filter
    if (filters.activePill !== 'all') {
      if (filters.activePill === 'snoozed') {
        if (task.status !== 'snoozed') return false;
      } else {
        // For urgency pills, exclude snoozed tasks
        if (task.status === 'snoozed') return false;
        const urgency = classifyUrgency(task.due_at);
        if (urgency !== filters.activePill) return false;
      }
    }

    // Playbook filter
    if (filters.playbookFilter && task.playbook_name !== filters.playbookFilter) {
      return false;
    }

    // Consent filter
    if (filters.consentFilter && task.consent_badge !== filters.consentFilter) {
      return false;
    }

    // myTasksOnly is handled at the component level (requires current user context)
    // The filter state includes it but the utility doesn't have access to the current user ID
    // This is intentionally left as a pass-through; the component layer applies this filter

    return true;
  });
}

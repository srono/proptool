/**
 * Step display ordering utility.
 *
 * Sorts playbook steps by offset_days ascending, with ties broken
 * by sort_order ascending (creation order).
 *
 * Validates: Requirements 3.5
 */

/** Minimal shape required for ordering — any object with offset_days and sort_order. */
export interface OrderableStep {
  offset_days: number;
  sort_order: number;
}

/**
 * Returns a new array of steps sorted by offset_days ascending,
 * with ties broken by sort_order ascending.
 *
 * Does not mutate the input array.
 */
export function sortSteps<T extends OrderableStep>(steps: T[]): T[] {
  return [...steps].sort((a, b) => {
    if (a.offset_days !== b.offset_days) {
      return a.offset_days - b.offset_days;
    }
    return a.sort_order - b.sort_order;
  });
}

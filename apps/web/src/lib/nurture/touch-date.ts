/**
 * Touch date computation utility.
 *
 * Computes the touch_date for a playbook step as:
 * trigger_date + offset_days calendar days.
 *
 * - Negative offsets produce dates before the trigger date
 * - Positive offsets produce dates after the trigger date
 * - Zero offset produces the trigger date itself
 *
 * Validates: Requirements 3.2, 4.4, 4.8
 */

import { addDays } from 'date-fns';

/**
 * Computes the touch date by adding offset_days calendar days to the trigger date.
 *
 * @param triggerDate - The trigger date (e.g., MOP date, key collection date)
 * @param offsetDays - Number of days to offset (negative = before, positive = after, 0 = same day)
 * @returns The computed touch date
 */
export function computeTouchDate(triggerDate: Date, offsetDays: number): Date {
  return addDays(triggerDate, offsetDays);
}

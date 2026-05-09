/**
 * Google Calendar API utility functions.
 * Uses the Google Calendar v3 REST API directly (no SDK needed).
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const FREEBUSY_API_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';

/** Singapore timezone identifier */
const SGT_TIMEZONE = 'Asia/Singapore';

/** Business hours in SGT (24h format) */
const BUSINESS_HOUR_START = 9; // 09:00
const BUSINESS_HOUR_END = 19; // 19:00

/** Minimum slot duration in minutes */
const MIN_SLOT_DURATION_MINUTES = 60;

/** Maximum number of slots to return */
const MAX_SLOTS = 3;

/** Timeout for FreeBusy API call in milliseconds */
const FREEBUSY_TIMEOUT_MS = 5000;

export interface FreeBusyPeriod {
  start: string;
  end: string;
}

export interface AvailableSlot {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  formatted: string; // e.g., "Mon 16 Jun, 2:00 PM – 3:00 PM"
}

interface FreeBusyResponse {
  calendars: {
    primary: {
      busy: FreeBusyPeriod[];
    };
  };
}

interface CalendarEventInput {
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  location?: string;
}

interface CalendarEventResponse {
  id: string;
  htmlLink: string;
  status: string;
}

/**
 * Creates a Google Calendar event using the user's access token.
 * Returns the created event ID, or null if the request fails.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput
): Promise<string | null> {
  try {
    const res = await fetch(CALENDAR_API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? '',
        location: event.location ?? '',
        start: {
          dateTime: event.start,
          timeZone: 'Asia/Singapore',
        },
        end: {
          dateTime: event.end,
          timeZone: 'Asia/Singapore',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 60 },
          ],
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[Google Calendar] Create event failed:', res.status, errorBody);
      return null;
    }

    const data: CalendarEventResponse = await res.json();
    return data.id;
  } catch (error) {
    console.error('[Google Calendar] Create event error:', error);
    return null;
  }
}

/**
 * Deletes a Google Calendar event by ID.
 * Returns true if successful, false otherwise.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${CALENDAR_API_BASE}/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 410) {
      // 410 Gone means already deleted — treat as success
      console.error('[Google Calendar] Delete event failed:', res.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Google Calendar] Delete event error:', error);
    return false;
  }
}

/**
 * Refreshes a Google access token using the refresh token.
 * Returns the new access token and expiry, or null on failure.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('[Google Calendar] Token refresh failed:', res.status);
      return null;
    }

    const data = await res.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('[Google Calendar] Token refresh error:', error);
    return null;
  }
}

/**
 * Formats a date/time range in en-SG locale for display.
 * Example output: "Mon 16 Jun, 2:00 PM – 3:00 PM"
 */
function formatSlotDisplay(start: Date, end: Date): string {
  const dayFormatter = new Intl.DateTimeFormat('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: SGT_TIMEZONE,
  });

  const timeFormatter = new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SGT_TIMEZONE,
  });

  const dayStr = dayFormatter.format(start);
  const startTime = timeFormatter.format(start);
  const endTime = timeFormatter.format(end);

  return `${dayStr}, ${startTime} – ${endTime}`;
}

/**
 * Pure function that computes available slots from a set of busy periods.
 * Exported separately for property-based testing.
 *
 * @param busyPeriods - Array of busy periods from Google Calendar FreeBusy API
 * @param fromDate - Start of the query window
 * @param toDate - End of the query window (fromDate + 7 days)
 * @returns Up to 3 earliest available slots during business hours (9:00–19:00 SGT, ≥60min)
 */
export function computeAvailableSlots(
  busyPeriods: FreeBusyPeriod[],
  fromDate: Date,
  toDate: Date
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];

  // Parse and sort busy periods by start time
  const sortedBusy = busyPeriods
    .map((p) => ({
      start: new Date(p.start).getTime(),
      end: new Date(p.end).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  // Merge overlapping busy periods
  const mergedBusy: { start: number; end: number }[] = [];
  for (const period of sortedBusy) {
    if (mergedBusy.length === 0 || period.start > mergedBusy[mergedBusy.length - 1].end) {
      mergedBusy.push({ ...period });
    } else {
      mergedBusy[mergedBusy.length - 1].end = Math.max(
        mergedBusy[mergedBusy.length - 1].end,
        period.end
      );
    }
  }

  // Iterate through each day in the window
  const currentDay = new Date(fromDate);
  while (currentDay < toDate && slots.length < MAX_SLOTS) {
    // Get business hours start and end for this day in SGT
    const dayStart = getBusinessHourStart(currentDay);
    const dayEnd = getBusinessHourEnd(currentDay);

    // Clamp to the query window
    const windowStart = Math.max(dayStart.getTime(), fromDate.getTime());
    const windowEnd = Math.min(dayEnd.getTime(), toDate.getTime());

    if (windowStart < windowEnd) {
      // Find free gaps within business hours for this day
      const daySlots = findFreeGaps(windowStart, windowEnd, mergedBusy);
      for (const slot of daySlots) {
        if (slots.length >= MAX_SLOTS) break;
        slots.push(slot);
      }
    }

    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return slots;
}

/**
 * Gets the start of business hours (09:00 SGT) for a given date.
 */
function getBusinessHourStart(date: Date): Date {
  // Format the date in SGT to get the calendar date
  const sgtDateStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SGT_TIMEZONE,
  }).format(date);

  // Parse YYYY-MM-DD and create a date at 09:00 SGT
  // SGT is UTC+8, so 09:00 SGT = 01:00 UTC
  const [year, month, day] = sgtDateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, BUSINESS_HOUR_START - 8, 0, 0));
  return utcDate;
}

/**
 * Gets the end of business hours (19:00 SGT) for a given date.
 */
function getBusinessHourEnd(date: Date): Date {
  const sgtDateStr = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SGT_TIMEZONE,
  }).format(date);

  const [year, month, day] = sgtDateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, BUSINESS_HOUR_END - 8, 0, 0));
  return utcDate;
}

/**
 * Finds free gaps of at least 60 minutes within a time window,
 * avoiding busy periods. Returns AvailableSlot objects.
 */
function findFreeGaps(
  windowStart: number,
  windowEnd: number,
  mergedBusy: { start: number; end: number }[]
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  let cursor = windowStart;

  for (const busy of mergedBusy) {
    // Skip busy periods that end before our cursor
    if (busy.end <= cursor) continue;
    // Stop if busy period starts after our window
    if (busy.start >= windowEnd) break;

    // Free gap between cursor and start of this busy period
    const gapEnd = Math.min(busy.start, windowEnd);
    if (gapEnd - cursor >= MIN_SLOT_DURATION_MINUTES * 60 * 1000) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + MIN_SLOT_DURATION_MINUTES * 60 * 1000);
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        formatted: formatSlotDisplay(slotStart, slotEnd),
      });
    }

    // Move cursor past this busy period
    cursor = Math.max(cursor, busy.end);
  }

  // Check for a gap after the last busy period
  if (cursor < windowEnd && windowEnd - cursor >= MIN_SLOT_DURATION_MINUTES * 60 * 1000) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + MIN_SLOT_DURATION_MINUTES * 60 * 1000);
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      formatted: formatSlotDisplay(slotStart, slotEnd),
    });
  }

  return slots;
}

/**
 * Queries Google Calendar FreeBusy API for the next 7 days,
 * then computes available slots during business hours (9:00-19:00 SGT, ≥60min).
 * Returns up to 3 earliest available slots.
 * Timeout: 5 seconds.
 */
export async function getAvailableSlots(
  accessToken: string,
  fromDate?: Date
): Promise<AvailableSlot[]> {
  const now = fromDate ?? new Date();
  const toDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FREEBUSY_TIMEOUT_MS);

    const res = await fetch(FREEBUSY_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: now.toISOString(),
        timeMax: toDate.toISOString(),
        timeZone: SGT_TIMEZONE,
        items: [{ id: 'primary' }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[Google Calendar] FreeBusy query failed:', res.status, errorBody);
      return [];
    }

    const data: FreeBusyResponse = await res.json();
    const busyPeriods = data.calendars?.primary?.busy ?? [];

    return computeAvailableSlots(busyPeriods, now, toDate);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Google Calendar] FreeBusy query timed out after 5s');
    } else {
      console.error('[Google Calendar] FreeBusy query error:', error);
    }
    return [];
  }
}

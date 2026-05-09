/**
 * Google Calendar API utility functions.
 * Uses the Google Calendar v3 REST API directly (no SDK needed).
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

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

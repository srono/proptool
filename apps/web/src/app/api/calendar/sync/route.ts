import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCalendarEvent, refreshGoogleToken } from '@/lib/google/calendar';

/**
 * POST /api/calendar/sync
 * Syncs a viewing to the user's Google Calendar.
 * Accepts: { viewing_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { viewing_id } = await request.json();

    if (!viewing_id) {
      return NextResponse.json({ error: 'viewing_id is required' }, { status: 400 });
    }

    // Fetch user's Google tokens
    const { data: profile } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    if (!profile?.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Refresh token if expired
    let accessToken = profile.google_access_token;
    const tokenExpiry = profile.google_token_expiry
      ? new Date(profile.google_token_expiry)
      : null;

    if (!accessToken || !tokenExpiry || tokenExpiry <= new Date()) {
      const refreshed = await refreshGoogleToken(profile.google_refresh_token);
      if (!refreshed) {
        return NextResponse.json(
          { error: 'Failed to refresh Google token' },
          { status: 401 }
        );
      }

      accessToken = refreshed.accessToken;

      // Update stored token
      await supabase
        .from('users')
        .update({
          google_access_token: refreshed.accessToken,
          google_token_expiry: refreshed.expiresAt.toISOString(),
        })
        .eq('id', user.id);
    }

    // Fetch viewing with related data
    const { data: viewing, error: viewingError } = await supabase
      .from('viewings')
      .select(`
        id,
        scheduled_at,
        duration_mins,
        lead_id,
        listing_id,
        leads (
          id,
          deal_type,
          contacts (
            full_name,
            phone
          )
        ),
        listings (
          address,
          district,
          property_type
        )
      `)
      .eq('id', viewing_id)
      .single();

    if (viewingError || !viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 });
    }

    // Build calendar event
    const lead = viewing.leads as unknown as {
      id: string;
      deal_type: string;
      contacts: { full_name: string; phone: string } | { full_name: string; phone: string }[];
    };
    const listing = viewing.listings as unknown as {
      address: string;
      district: string;
      property_type: string;
    };

    const contact = Array.isArray(lead?.contacts)
      ? lead.contacts[0]
      : lead?.contacts;

    const contactName = contact?.full_name ?? 'Unknown';
    const contactPhone = contact?.phone ?? '';
    const listingAddress = listing?.address ?? 'TBD';
    const listingDistrict = listing?.district ?? '';
    const listingType = listing?.property_type ?? '';

    const startTime = new Date(viewing.scheduled_at);
    const endTime = new Date(startTime.getTime() + (viewing.duration_mins ?? 60) * 60 * 1000);

    const eventId = await createCalendarEvent(accessToken!, {
      summary: `Viewing: ${contactName} — ${listingAddress}`,
      description: `Property viewing with ${contactName} (${contactPhone}). ${listingType} at ${listingAddress}, ${listingDistrict}.`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      location: `${listingAddress}, ${listingDistrict}`,
    });

    if (!eventId) {
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    // Store the Google Calendar event ID on the viewing
    await supabase
      .from('viewings')
      .update({ gcal_event_id: eventId })
      .eq('id', viewing_id);

    return NextResponse.json({ success: true, gcal_event_id: eventId });
  } catch (error) {
    console.error('[Calendar Sync] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

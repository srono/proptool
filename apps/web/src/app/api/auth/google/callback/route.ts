import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google, exchanges code for tokens,
 * and stores them on the user's profile.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    const message = error ?? 'No authorization code received';
    return NextResponse.redirect(
      `${APP_URL}/settings?tab=integrations&error=${encodeURIComponent(message)}`
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error('[Google OAuth] Token exchange failed:', errorBody);
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=integrations&error=${encodeURIComponent('Token exchange failed')}`
      );
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens on the user's profile
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${APP_URL}/login?error=${encodeURIComponent('Not authenticated')}`
      );
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        google_access_token: access_token,
        google_refresh_token: refresh_token,
        google_token_expiry: expiresAt,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Google OAuth] Failed to store tokens:', updateError);
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=integrations&error=${encodeURIComponent('Failed to save tokens')}`
      );
    }

    return NextResponse.redirect(
      `${APP_URL}/settings?tab=integrations&success=${encodeURIComponent('Google Calendar connected!')}`
    );
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    return NextResponse.redirect(
      `${APP_URL}/settings?tab=integrations&error=${encodeURIComponent('Unexpected error')}`
    );
  }
}

import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

/**
 * GET /api/auth/google
 * Redirects the user to Google OAuth consent screen for Calendar access.
 */
export async function GET() {
  const redirectUri = `${APP_URL}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}

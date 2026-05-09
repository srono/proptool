import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import webpush from 'web-push';

interface SendPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
}

/**
 * Lazily configures VAPID details on first use (avoids build-time errors).
 */
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@cinvea.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

/**
 * POST /api/push/send
 * Sends a web push notification to all subscriptions for a given user.
 * This is an internal endpoint called by webhooks and background jobs.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, title, body, url }: SendPayload = await request.json();

    if (!user_id || !title) {
      return NextResponse.json(
        { error: 'user_id and title are required' },
        { status: 400 }
      );
    }

    ensureVapidConfigured();

    const supabase = createAdminClient();

    // Fetch all push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', user_id);

    if (error || !subscriptions?.length) {
      // No subscriptions — not an error, just nothing to send
      return NextResponse.json({ success: true, sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/' });

    // Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          },
          payload
        )
      )
    );

    // Clean up expired/invalid subscriptions (410 Gone or 404)
    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id)
        .in('endpoint', expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error('[Push Send] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

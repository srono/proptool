import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSuggestions } from '@/lib/ai/suggestion-engine';

interface SuggestionsRequestBody {
  contact_id: string;
  listing_context_id?: string;
}

/** Overall request timeout in milliseconds */
const OVERALL_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Step 1: Verify authenticated user (401)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: SuggestionsRequestBody = await request.json();
    const { contact_id, listing_context_id } = body;

    // Step 2: Validate contact_id presence (400)
    if (!contact_id) {
      return NextResponse.json(
        { error: 'Missing required field: contact_id' },
        { status: 400 }
      );
    }

    // Step 3: Get user's tenant_id from profile
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = profile.tenant_id;

    // Step 4: Validate tenant ownership of contact (403)
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Step 5: Generate suggestions with 15-second overall timeout
    const suggestions = await Promise.race([
      generateSuggestions(
        {
          contactId: contact_id,
          tenantId,
          userId: user.id,
          listingContextId: listing_context_id,
        },
        supabase
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Overall timeout')), OVERALL_TIMEOUT_MS)
      ),
    ]).catch(() => {
      // On timeout or any error, return empty suggestions
      return [];
    });

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('[Suggestions API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

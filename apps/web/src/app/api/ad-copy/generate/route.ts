import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildAdCopyPrompt } from '@/lib/ai/ad-copy-prompt-builder';
import type { ListingData, AgentInfo, TenantConfig } from '@/lib/ai/ad-copy-prompt-builder';
import { parseAdCopyResponse } from '@/lib/ai/ad-copy-response-parser';
import type {
  GenerateAdCopyRequest,
  GenerateAdCopyResponse,
  GenerateAdCopyErrorResponse,
} from '@/lib/ai/ad-copy-types';

/** Timeout for the OpenAI call in milliseconds */
const OPENAI_TIMEOUT_MS = 15_000;

/** Default model when AD_COPY_MODEL env var is not set */
const DEFAULT_MODEL = 'gpt-4o-mini';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Step 1: Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: 'Please log in to continue', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Step 2: Get user's tenant_id from profile
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, full_name, phone, cea_licence_number')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: 'Please log in to continue', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = profile.tenant_id;

    // Step 3: Parse and validate request body
    const body: GenerateAdCopyRequest = await request.json();
    const {
      listing_id,
      platform,
      tone,
      length,
      cta_style,
      target_audience,
      avoid_emojis,
      include_hashtags,
    } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!listing_id) missingFields.push('listing_id');
    if (!platform) missingFields.push('platform');
    if (!tone) missingFields.push('tone');
    if (!length) missingFields.push('length');
    if (!cta_style) missingFields.push('cta_style');
    if (typeof avoid_emojis !== 'boolean') missingFields.push('avoid_emojis');
    if (typeof include_hashtags !== 'boolean') missingFields.push('include_hashtags');

    if (missingFields.length > 0) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        {
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Step 4: Load listing and validate tenant ownership
    const { data: listing } = await supabase
      .from('listings')
      .select(
        'id, tenant_id, address, postal_code, district, property_type, listing_type, asking_price, asking_rental, floor_area_sqft, tenure, completion_year, description'
      )
      .eq('id', listing_id)
      .single();

    if (!listing) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: "You don't have access to this listing", code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (listing.tenant_id !== tenantId) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: "You don't have access to this listing", code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Step 5: Validate mandatory listing fields
    const missingListingFields: string[] = [];
    if (!listing.address || listing.address.trim() === '') {
      missingListingFields.push('address');
    }
    if (!listing.property_type || listing.property_type.trim() === '') {
      missingListingFields.push('property_type');
    }
    if (!listing.listing_type || listing.listing_type.trim() === '') {
      missingListingFields.push('listing_type');
    }
    if (listing.asking_price == null && listing.asking_rental == null) {
      missingListingFields.push('price/rental');
    }

    if (missingListingFields.length > 0) {
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        {
          error: `Listing is missing required data: ${missingListingFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Step 6: Load tenant config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('cea_registration_number, settings_json')
      .eq('id', tenantId)
      .single();

    // Build listing data for prompt
    const listingData: ListingData = {
      address: listing.address,
      postal_code: listing.postal_code ?? null,
      district: listing.district ?? null,
      property_type: listing.property_type,
      listing_type: listing.listing_type,
      asking_price: listing.asking_price ?? null,
      asking_rental: listing.asking_rental ?? null,
      floor_area_sqft: listing.floor_area_sqft ?? null,
      tenure: listing.tenure ?? null,
      completion_year: listing.completion_year ?? null,
      description: listing.description ?? null,
    };

    // Build agent info
    const agentInfo: AgentInfo | undefined =
      profile.full_name && profile.phone
        ? {
            full_name: profile.full_name,
            phone: profile.phone,
            cea_licence_number: profile.cea_licence_number ?? null,
          }
        : undefined;

    // Build tenant config
    const tenantConfig: TenantConfig | undefined = tenant
      ? {
          cea_registration_number: tenant.cea_registration_number ?? null,
          requires_agent_attribution: !!tenant.cea_registration_number,
        }
      : undefined;

    // Step 7: Build prompt
    const { systemPrompt, userPrompt } = buildAdCopyPrompt({
      params: {
        platform,
        tone,
        length,
        cta_style,
        target_audience,
        avoid_emojis,
        include_hashtags,
      },
      listing: listingData,
      agent: agentInfo,
      tenantConfig,
    });

    // Step 8: Call OpenAI with timeout
    const model = process.env.AD_COPY_MODEL || DEFAULT_MODEL;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let rawContent: string;
    try {
      const response = await openai.chat.completions.create(
        {
          model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        },
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      rawContent = response.choices[0]?.message?.content ?? '';
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Handle timeout (AbortError)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[AdCopy API] OpenAI call timed out after 15s');
        return NextResponse.json<GenerateAdCopyErrorResponse>(
          { error: 'Generation timed out. Please try again.', code: 'TIMEOUT' },
          { status: 504 }
        );
      }

      // Handle OpenAI-specific errors
      if (isOpenAIError(error)) {
        const status = error.status;

        // Rate limit (429)
        if (status === 429) {
          console.error('[AdCopy API] OpenAI rate limit:', error.message);
          return NextResponse.json<GenerateAdCopyErrorResponse>(
            {
              error: 'AI service is temporarily busy. Please try again in a moment.',
              code: 'GENERATION_FAILED',
            },
            { status: 503 }
          );
        }

        // Content policy (400 with content_policy_violation)
        if (
          status === 400 &&
          error.code === 'content_policy_violation'
        ) {
          console.error('[AdCopy API] OpenAI content policy rejection:', error.message);
          return NextResponse.json<GenerateAdCopyErrorResponse>(
            {
              error: 'Generation could not be completed. Please adjust your listing description.',
              code: 'GENERATION_FAILED',
            },
            { status: 422 }
          );
        }

        // Auth error (401)
        if (status === 401) {
          console.error('[AdCopy API] OpenAI auth error:', error.message);
          return NextResponse.json<GenerateAdCopyErrorResponse>(
            {
              error: 'AI service is currently unavailable. Please try again later.',
              code: 'GENERATION_FAILED',
            },
            { status: 503 }
          );
        }

        // Invalid model (404)
        if (status === 404) {
          console.error('[AdCopy API] Invalid model identifier:', model, error.message);
          return NextResponse.json<GenerateAdCopyErrorResponse>(
            {
              error: 'AI service is currently unavailable. Please try again later.',
              code: 'GENERATION_FAILED',
            },
            { status: 503 }
          );
        }
      }

      // Unexpected OpenAI error
      console.error('[AdCopy API] OpenAI unexpected error:', error);
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: 'Something went wrong. Please try again.', code: 'GENERATION_FAILED' },
        { status: 500 }
      );
    }

    // Step 9: Parse response
    const parseResult = parseAdCopyResponse(rawContent, include_hashtags);

    if (!parseResult.success) {
      console.error('[AdCopy API] Response parse error:', parseResult.error);
      return NextResponse.json<GenerateAdCopyErrorResponse>(
        { error: 'Something went wrong. Please try again.', code: 'GENERATION_FAILED' },
        { status: 500 }
      );
    }

    // Step 10: Return success response
    const responseBody: GenerateAdCopyResponse = {
      variants: parseResult.variants,
      model_used: model,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error('[AdCopy API] Unexpected error:', error);
    return NextResponse.json<GenerateAdCopyErrorResponse>(
      { error: 'Something went wrong. Please try again.', code: 'GENERATION_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * Type guard for OpenAI API errors which have status and code properties.
 */
function isOpenAIError(
  error: unknown
): error is { status: number; code?: string; message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

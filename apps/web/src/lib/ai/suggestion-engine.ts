import type { SupabaseClient } from '@supabase/supabase-js';
import type { Suggestion } from '@agentos/shared';
import OpenAI from 'openai';

import { buildConversationContext } from './context-builder';
import { detectSchedulingIntent } from './scheduling-intent';
import { selectActiveLead } from './lead-selector';
import { shouldUseFirstName } from './greeting-detection';
import { buildSuggestionPrompt } from './prompt-builder';
import type { ListingContextData, TimeSlot } from './prompt-builder';
import { parseSuggestionResponse } from './response-parser';
import { getAvailableSlots, refreshGoogleToken } from '../google/calendar';

// --- Types ---

export interface SuggestionEngineInput {
  contactId: string;
  tenantId: string;
  userId: string;
  listingContextId?: string;
}

/** LLM call timeout in milliseconds */
const LLM_TIMEOUT_MS = 10_000;

/** Default OpenAI model used when SUGGESTION_MODEL env var is not set */
const DEFAULT_MODEL = 'gpt-4o-mini';

/** Resolved model identifier — read once at module load */
const SUGGESTION_MODEL = (process.env.SUGGESTION_MODEL ?? '').trim() || DEFAULT_MODEL;

// --- Main Engine ---

/**
 * Generates AI reply suggestions for a conversation.
 *
 * Orchestration flow:
 * 1. Fetch last 20 messages for the contact (scoped to tenant)
 * 2. Fetch contact details (first_name, last_name)
 * 3. Fetch active lead + buyer requirements for the contact
 * 4. Detect scheduling intent from the most recent inbound message
 * 5. If scheduling intent detected AND user has Google Calendar connected, fetch available slots
 * 6. Fetch follow-up context (listing context) if listingContextId provided or existing context exists
 * 7. Determine if first-name greeting should be used
 * 8. Build the LLM prompt using all gathered context
 * 9. Call OpenAI GPT-4o-mini with the prompt (temperature 0.7, 10s timeout)
 * 10. Parse and validate the response
 *
 * Returns empty array on ANY failure (graceful degradation).
 */
export async function generateSuggestions(
  input: SuggestionEngineInput,
  supabase: SupabaseClient
): Promise<Suggestion[]> {
  try {
    const { contactId, tenantId, userId, listingContextId } = input;

    // Step 1: Fetch last 20 messages for the contact (scoped to tenant)
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!messages || messages.length === 0) {
      return [];
    }

    // Step 2: Fetch contact details
    const { data: contact } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) {
      return [];
    }

    // Parse first/last name from full_name
    const nameParts = (contact.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'there';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Step 3: Fetch active lead + buyer requirements
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId);

    const activeLead = selectActiveLead(leads || []);

    let buyerRequirements: {
      districts: string[];
      property_types: string[];
    } | null = null;

    if (activeLead) {
      const { data: requirements } = await supabase
        .from('buyer_requirements')
        .select('districts, property_types')
        .eq('lead_id', activeLead.id)
        .eq('tenant_id', tenantId)
        .single();

      if (requirements) {
        buyerRequirements = requirements;
      }
    }

    // Step 4: Detect scheduling intent from the most recent inbound message
    const mostRecentInbound = messages.find(
      (m: { direction: string }) => m.direction === 'inbound'
    );
    const hasSchedulingIntent = mostRecentInbound
      ? detectSchedulingIntent(mostRecentInbound.body)
      : false;

    // Step 5: If scheduling intent detected, fetch calendar slots
    let calendarSlots: TimeSlot[] | undefined;

    if (hasSchedulingIntent) {
      calendarSlots = await fetchCalendarSlots(supabase, userId);
    }

    // Step 6: Fetch follow-up context (listing context)
    let listingContext: ListingContextData | undefined;

    if (listingContextId) {
      listingContext = await fetchListingContext(supabase, listingContextId, tenantId);
    }

    if (!listingContext) {
      // Check for existing follow-up context
      listingContext = await fetchExistingFollowUpContext(supabase, contactId, tenantId);
    }

    // Step 7: Determine if first-name greeting should be used
    const useFirstName = shouldUseFirstName(messages);

    // Step 8: Build the LLM prompt
    const conversationContextMessages = buildConversationContext(messages);

    const prompt = buildSuggestionPrompt({
      conversationContext: {
        messages: conversationContextMessages,
        contact: { firstName, lastName },
        lead: activeLead
          ? {
              dealType: activeLead.deal_type,
              budgetMin: activeLead.budget_min,
              budgetMax: activeLead.budget_max,
              preferredDistricts: buyerRequirements?.districts || [],
              propertyTypes: buyerRequirements?.property_types || [],
            }
          : undefined,
        calendarSlots,
        listingContext,
        useFirstName,
      },
      hasSchedulingIntent,
    });

    // Step 9: Call OpenAI GPT-4o-mini with 10s timeout
    const rawResponse = await callOpenAI(prompt.systemPrompt, prompt.userPrompt);

    if (!rawResponse) {
      return [];
    }

    // Step 10: Parse and validate the response
    return parseSuggestionResponse(rawResponse);
  } catch (error) {
    console.error('[SuggestionEngine] Unexpected error:', error);
    return [];
  }
}

// --- Helper Functions ---

/**
 * Fetches calendar availability slots for the user.
 * Returns undefined if the user has no Google Calendar connected or on any failure.
 */
async function fetchCalendarSlots(
  supabase: SupabaseClient,
  userId: string
): Promise<TimeSlot[] | undefined> {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', userId)
      .single();

    if (!profile?.google_refresh_token) {
      return undefined;
    }

    // Refresh token if expired
    let accessToken = profile.google_access_token;
    const tokenExpiry = profile.google_token_expiry
      ? new Date(profile.google_token_expiry)
      : null;

    if (!accessToken || !tokenExpiry || tokenExpiry <= new Date()) {
      const refreshed = await refreshGoogleToken(profile.google_refresh_token);
      if (!refreshed) {
        return undefined;
      }

      accessToken = refreshed.accessToken;

      // Update stored token (fire and forget)
      supabase
        .from('users')
        .update({
          google_access_token: refreshed.accessToken,
          google_token_expiry: refreshed.expiresAt.toISOString(),
        })
        .eq('id', userId)
        .then(() => {});
    }

    const slots = await getAvailableSlots(accessToken);

    if (slots.length === 0) {
      return undefined;
    }

    return slots.map((slot) => ({
      start: slot.start,
      end: slot.end,
      formatted: slot.formatted,
    }));
  } catch (error) {
    console.error('[SuggestionEngine] Calendar fetch error:', error);
    return undefined;
  }
}

/**
 * Fetches listing context by listing ID, verifying it belongs to the tenant.
 */
async function fetchListingContext(
  supabase: SupabaseClient,
  listingId: string,
  tenantId: string
): Promise<ListingContextData | undefined> {
  try {
    const { data: listing } = await supabase
      .from('listings')
      .select(
        'id, address, district, property_type, tenure, floor_area_sqft, asking_price, asking_rental, psf, floor, unit_number, completion_year, description'
      )
      .eq('id', listingId)
      .eq('tenant_id', tenantId)
      .single();

    if (!listing) {
      return undefined;
    }

    return mapListingToContext(listing);
  } catch {
    return undefined;
  }
}

/**
 * Fetches existing follow-up context for a conversation from the
 * conversation_listing_context table, then loads the listing details.
 */
async function fetchExistingFollowUpContext(
  supabase: SupabaseClient,
  contactId: string,
  tenantId: string
): Promise<ListingContextData | undefined> {
  try {
    const { data: context } = await supabase
      .from('conversation_listing_context')
      .select('listing_id')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .single();

    if (!context?.listing_id) {
      return undefined;
    }

    return fetchListingContext(supabase, context.listing_id, tenantId);
  } catch {
    return undefined;
  }
}

/**
 * Maps a raw listing row to the ListingContextData interface.
 */
function mapListingToContext(listing: {
  id: string;
  address: string;
  district: string;
  property_type: string;
  tenure: string;
  floor_area_sqft: number;
  asking_price: number | null;
  asking_rental: number | null;
  psf: number | null;
  floor: string | null;
  unit_number: string | null;
  completion_year: number | null;
  description: string | null;
}): ListingContextData {
  return {
    listingId: listing.id,
    address: listing.address,
    district: listing.district,
    propertyType: listing.property_type,
    tenure: listing.tenure,
    floorAreaSqft: listing.floor_area_sqft,
    askingPrice: listing.asking_price,
    askingRental: listing.asking_rental,
    psf: listing.psf,
    floor: listing.floor,
    unitNumber: listing.unit_number,
    completionYear: listing.completion_year,
    description: listing.description,
  };
}

/**
 * Calls OpenAI GPT-4o-mini with the given prompts.
 * Implements a 10-second timeout using AbortController.
 * Returns the raw response content string, or null on failure.
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const response = await openai.chat.completions.create(
      {
        model: SUGGESTION_MODEL,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content;
    return content ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[SuggestionEngine] OpenAI call timed out after 10s, model:', SUGGESTION_MODEL);
    } else {
      console.error('[SuggestionEngine] OpenAI call error:', error, 'model:', SUGGESTION_MODEL);
    }
    return null;
  }
}

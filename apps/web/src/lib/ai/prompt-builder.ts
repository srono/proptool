import { formatPrice } from './format-price';

// --- Types ---

export interface PromptBuilderInput {
  conversationContext: ConversationContext;
  hasSchedulingIntent: boolean;
}

export interface ConversationContext {
  messages: Array<{
    direction: 'inbound' | 'outbound';
    body: string;
    relativeTime: string;
  }>;
  contact: {
    firstName: string;
    lastName: string;
  };
  lead?: {
    dealType: string;
    budgetMin: number | null;
    budgetMax: number | null;
    preferredDistricts: string[];
    propertyTypes: string[];
  };
  calendarSlots?: TimeSlot[];
  listingContext?: ListingContextData;
  useFirstName?: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  formatted: string;
}

export interface ListingContextData {
  listingId: string;
  address: string;
  district: string;
  propertyType: string;
  tenure: string;
  floorAreaSqft: number;
  askingPrice: number | null;
  askingRental: number | null;
  psf: number | null;
  floor: string | null;
  unitNumber: string | null;
  completionYear: number | null;
  description: string | null;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

// --- System Prompt ---

const SYSTEM_PROMPT = `You are a reply assistant for a Singapore property agent using WhatsApp.
Generate 2-4 short reply suggestions.

Rules:
- Use professional WhatsApp tone (short sentences, no formal salutations or sign-offs)
- Use Singapore property terminology (HDB, condo, landed, PSF, tenure)
- Use en-SG date/number formatting
- Each reply must be under 300 characters, plain text only (no markdown)
- Each reply must be semantically distinct
- Reply in the language of the most recent inbound message

Return a JSON array of objects with "text" (string, required) and "category" (one of: greeting, scheduling, listing_info, follow_up, general).`;

// --- Prompt Builder ---

/**
 * Builds the system and user prompts for the LLM suggestion generation call.
 *
 * The user prompt always includes:
 * - Conversation History section
 * - Contact & Lead Context section (with only non-null lead fields)
 *
 * Conditionally includes:
 * - Calendar Availability section (only if calendarSlots is non-empty)
 * - Listing Context section (only if listingContext is provided)
 */
export function buildSuggestionPrompt(input: PromptBuilderInput): BuiltPrompt {
  const { conversationContext } = input;
  const sections: string[] = [];

  // Section 1: Conversation History (always present)
  sections.push(buildConversationHistorySection(conversationContext.messages));

  // Section 2: Contact & Lead Context (always present)
  sections.push(
    buildContactLeadSection(
      conversationContext.contact,
      conversationContext.lead,
      conversationContext.useFirstName
    )
  );

  // Section 3: Calendar Availability (only if slots provided)
  if (
    conversationContext.calendarSlots &&
    conversationContext.calendarSlots.length > 0
  ) {
    sections.push(
      buildCalendarAvailabilitySection(conversationContext.calendarSlots)
    );
  }

  // Section 4: Listing Context (only if listing data provided)
  if (conversationContext.listingContext) {
    sections.push(
      buildListingContextSection(conversationContext.listingContext)
    );
  }

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: sections.join('\n\n'),
  };
}

// --- Section Builders ---

function buildConversationHistorySection(
  messages: ConversationContext['messages']
): string {
  const lines = messages.map(
    (msg) => `[${msg.direction}] (${msg.relativeTime}) ${msg.body}`
  );

  return `## Conversation History\n${lines.join('\n')}`;
}

function buildContactLeadSection(
  contact: ConversationContext['contact'],
  lead?: ConversationContext['lead'],
  useFirstName?: boolean
): string {
  const lines: string[] = [];

  lines.push(`Name: ${contact.firstName} ${contact.lastName}`);

  if (lead) {
    if (lead.dealType) {
      lines.push(`Deal type: ${lead.dealType}`);
    }

    if (lead.budgetMin !== null && lead.budgetMax !== null) {
      lines.push(`Budget: ${formatPrice(lead.budgetMin)} – ${formatPrice(lead.budgetMax)}`);
    } else if (lead.budgetMin !== null) {
      lines.push(`Budget: from ${formatPrice(lead.budgetMin)}`);
    } else if (lead.budgetMax !== null) {
      lines.push(`Budget: up to ${formatPrice(lead.budgetMax)}`);
    }

    if (lead.preferredDistricts.length > 0) {
      lines.push(`Preferred districts: ${lead.preferredDistricts.join(', ')}`);
    }

    if (lead.propertyTypes.length > 0) {
      lines.push(`Property types: ${lead.propertyTypes.join(', ')}`);
    }
  }

  if (useFirstName) {
    lines.push(`\nNote: Use the contact's first name ("${contact.firstName}") in your reply where appropriate.`);
  }

  return `## Contact & Lead Context\n${lines.join('\n')}`;
}

function buildCalendarAvailabilitySection(slots: TimeSlot[]): string {
  const lines = slots.map((slot) => `- ${slot.formatted}`);

  return `## Calendar Availability\nAvailable slots:\n${lines.join('\n')}`;
}

function buildListingContextSection(listing: ListingContextData): string {
  const lines: string[] = [];

  lines.push(`Address: ${listing.address}`);
  lines.push(`District: ${listing.district}`);
  lines.push(`Type: ${listing.propertyType}`);
  lines.push(`Tenure: ${listing.tenure}`);
  lines.push(`Floor area: ${listing.floorAreaSqft.toLocaleString('en-US')} sqft`);

  if (listing.askingPrice !== null) {
    lines.push(`Asking price: ${formatPrice(listing.askingPrice)}`);
  }

  if (listing.askingRental !== null) {
    lines.push(`Asking rental: ${formatPrice(listing.askingRental)}/mo`);
  }

  if (listing.psf !== null) {
    lines.push(`PSF: ${formatPrice(listing.psf)}`);
  }

  if (listing.floor !== null) {
    lines.push(`Floor: ${listing.floor}`);
  }

  if (listing.unitNumber !== null) {
    lines.push(`Unit: ${listing.unitNumber}`);
  }

  if (listing.completionYear !== null) {
    lines.push(`Completion: ${listing.completionYear}`);
  }

  if (listing.description !== null) {
    lines.push(`Description: ${listing.description}`);
  }

  return `## Listing Context\n${lines.join('\n')}`;
}

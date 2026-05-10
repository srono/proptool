import type {
  AdPlatform,
  AdTone,
  AdLength,
  CtaStyle,
  TargetAudience,
  CopyVariantType,
} from './ad-copy-types';

// --- Types ---

export interface ListingData {
  address: string;
  postal_code: string | null;
  district: string | null;
  property_type: string;
  listing_type: string;
  asking_price: number | null;
  asking_rental: number | null;
  floor_area_sqft: number | null;
  tenure: string | null;
  completion_year: number | null;
  description: string | null;
}

export interface AgentInfo {
  full_name: string;
  phone: string;
  cea_licence_number: string | null;
}

export interface TenantConfig {
  cea_registration_number: string | null;
  requires_agent_attribution: boolean;
}

export interface AdCopyPromptInput {
  params: {
    platform: AdPlatform;
    tone: AdTone;
    length: AdLength;
    cta_style: CtaStyle;
    target_audience?: TargetAudience;
    avoid_emojis: boolean;
    include_hashtags: boolean;
  };
  listing: ListingData;
  agent?: AgentInfo;
  tenantConfig?: TenantConfig;
}

export interface AdCopyPromptResult {
  systemPrompt: string;
  userPrompt: string;
}

// --- Constants ---

const PLATFORM_CONSTRAINTS: Record<AdPlatform, string> = {
  facebook:
    'Optimise for Facebook feed. Primary text up to 125 characters shows without truncation; longer text is acceptable but front-load the hook.',
  instagram:
    'Optimise for Instagram. Captions can be up to 2200 characters. Use line breaks for readability. Hashtags go at the end.',
  whatsapp:
    'Optimise for WhatsApp broadcast. Keep it concise and conversational. No markdown formatting. Use line breaks sparingly.',
  generic:
    'Write for general social media use. Keep formatting simple and platform-agnostic.',
};

const TONE_INSTRUCTIONS: Record<AdTone, string> = {
  professional:
    'Use a professional, authoritative tone. Focus on facts and value proposition.',
  premium:
    'Use a premium, aspirational tone. Emphasise luxury, exclusivity, and lifestyle.',
  friendly:
    'Use a warm, approachable tone. Write as if speaking to a friend about an exciting opportunity.',
  urgency:
    'Use an urgent, action-oriented tone. Emphasise time-sensitivity and opportunity cost of waiting.',
  investor:
    'Use a data-driven, ROI-focused tone. Emphasise yield, capital appreciation potential, and market positioning.',
  family:
    'Use a family-oriented tone. Emphasise space, safety, schools, and community.',
};

const LENGTH_LIMITS: Record<AdLength, string> = {
  short: 'Keep the primary caption under 80 words.',
  medium: 'Aim for 81–150 words for the primary caption.',
  long: 'Write a detailed primary caption of 151–300 words.',
};

const CTA_PHRASES: Record<CtaStyle, string> = {
  enquire_now: 'Enquire Now',
  whatsapp_now: 'WhatsApp Now',
  book_viewing: 'Book a Viewing',
  request_details: 'Request Details',
};

const AUDIENCE_ANGLES: Record<TargetAudience, string> = {
  family: 'Target families looking for space, schools, and a safe neighbourhood.',
  upgrader: 'Target upgraders moving from HDB to private or from smaller to larger units.',
  investor: 'Target property investors focused on rental yield and capital gains.',
  tenant: 'Target tenants looking for a rental home with good value and convenience.',
  first_time_buyer:
    'Target first-time buyers who need guidance and reassurance about the purchase process.',
};

const VARIANT_SPECS: Array<{ type: CopyVariantType; maxLength: number; description: string }> = [
  { type: 'primary_caption', maxLength: 2000, description: 'Full ad caption' },
  { type: 'short_headline', maxLength: 100, description: 'Short punchy headline' },
  { type: 'cta_line', maxLength: 150, description: 'Call-to-action line' },
  { type: 'short_form', maxLength: 280, description: 'Short-form version (tweet-length)' },
  { type: 'instagram_caption', maxLength: 2200, description: 'Instagram caption' },
  { type: 'whatsapp_promo', maxLength: 1000, description: 'WhatsApp promo text' },
];

// --- Prompt Builder ---

/**
 * Builds the system and user prompts for ad copy generation.
 *
 * The system prompt instructs the LLM on output format, platform constraints,
 * tone, and length. The user prompt provides listing data and generation context.
 */
export function buildAdCopyPrompt(input: AdCopyPromptInput): AdCopyPromptResult {
  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);

  return { systemPrompt, userPrompt };
}

// --- System Prompt Builder ---

function buildSystemPrompt(input: AdCopyPromptInput): string {
  const { params } = input;
  const sections: string[] = [];

  // Role and output format
  sections.push(
    `You are a Singapore property marketing copywriter. Generate ad copy for a property listing.`
  );

  // Platform constraints
  sections.push(`Platform: ${PLATFORM_CONSTRAINTS[params.platform]}`);

  // Tone instructions
  sections.push(`Tone: ${TONE_INSTRUCTIONS[params.tone]}`);

  // Length limits
  sections.push(`Length: ${LENGTH_LIMITS[params.length]}`);

  // CTA style
  sections.push(
    `CTA: End with a clear call-to-action using the phrase "${CTA_PHRASES[params.cta_style]}" or a close variation.`
  );

  // Target audience
  if (params.target_audience) {
    sections.push(`Audience: ${AUDIENCE_ANGLES[params.target_audience]}`);
  }

  // Emoji and hashtag toggles
  if (params.avoid_emojis) {
    sections.push('Emojis: Do NOT use any emojis in the output.');
  } else {
    sections.push('Emojis: You may use emojis sparingly to enhance readability.');
  }

  if (params.include_hashtags) {
    sections.push(
      'Hashtags: Include a "hashtags" variant with 5–15 relevant hashtags. Use property type, district, and listing type as hashtag themes.'
    );
  } else {
    sections.push('Hashtags: Do NOT include any hashtags in the output.');
  }

  // Output format specification
  const variantDescriptions = VARIANT_SPECS.map(
    (v) => `  - "${v.type}": ${v.description} (max ${v.maxLength} characters)`
  );

  const hashtagLine = params.include_hashtags
    ? `  - "hashtags": 5–15 relevant hashtags (max 500 characters)\n`
    : '';

  sections.push(
    `Output format: Return a JSON object with a "variants" array. Each variant has "type", "content", and "max_length" fields.\n\nRequired variant types:\n${variantDescriptions.join('\n')}\n${hashtagLine}\nExample structure:\n{\n  "variants": [\n    { "type": "primary_caption", "content": "...", "max_length": 2000 },\n    { "type": "short_headline", "content": "...", "max_length": 100 },\n    ...\n  ]\n}`
  );

  // Compliance rules
  sections.push(
    `Compliance rules:\n- Do NOT use unsupported superlatives (e.g., "best deal", "guaranteed return", "highest yield", "number one", "top performer")\n- Do NOT make misleading claims about appreciation rates, guaranteed returns, or artificial scarcity\n- Do NOT use discriminatory language targeting race, ethnicity, religion, age, sex, sexual orientation, family status, or disability\n- Do NOT make unverified factual claims about distances, yields, or school proximity without qualification`
  );

  return sections.join('\n\n');
}

// --- User Prompt Builder ---

function buildUserPrompt(input: AdCopyPromptInput): string {
  const { listing, agent, tenantConfig, params } = input;
  const sections: string[] = [];

  // Section 1: Listing Data (always present)
  sections.push(buildListingSection(listing));

  // Section 2: Agent Attribution (conditional)
  const agentSection = buildAgentSection(agent, tenantConfig);
  if (agentSection) {
    sections.push(agentSection);
  }

  // Section 3: Generation instruction
  sections.push(
    `Generate ad copy for the ${params.platform} platform with a ${params.tone} tone.`
  );

  return sections.join('\n\n');
}

function buildListingSection(listing: ListingData): string {
  const lines: string[] = [];

  // Mandatory fields (always included)
  lines.push(`Address: ${listing.address}`);
  lines.push(`Property type: ${listing.property_type}`);
  lines.push(`Listing type: ${listing.listing_type}`);

  if (listing.asking_price !== null) {
    lines.push(`Asking price: $${listing.asking_price.toLocaleString('en-US')}`);
  }

  if (listing.asking_rental !== null) {
    lines.push(`Asking rental: $${listing.asking_rental.toLocaleString('en-US')}/mo`);
  }

  // Optional fields (only included when non-null)
  if (listing.postal_code !== null) {
    lines.push(`Postal code: ${listing.postal_code}`);
  }

  if (listing.district !== null) {
    lines.push(`District: ${listing.district}`);
  }

  if (listing.floor_area_sqft !== null) {
    lines.push(`Floor area: ${listing.floor_area_sqft.toLocaleString('en-US')} sqft`);
  }

  if (listing.tenure !== null) {
    lines.push(`Tenure: ${listing.tenure}`);
  }

  if (listing.completion_year !== null) {
    lines.push(`TOP year: ${listing.completion_year}`);
  }

  if (listing.description !== null) {
    lines.push(`Description: ${listing.description}`);
  }

  return `## Listing Details\n${lines.join('\n')}`;
}

function buildAgentSection(
  agent?: AgentInfo,
  tenantConfig?: TenantConfig
): string | null {
  const lines: string[] = [];

  // Include agent attribution when tenant config requires it
  if (tenantConfig?.requires_agent_attribution && agent) {
    lines.push(`Agent: ${agent.full_name}`);
    lines.push(`Phone: ${agent.phone}`);

    if (agent.cea_licence_number !== null) {
      lines.push(`CEA licence: ${agent.cea_licence_number}`);
    }
  }

  // Include CEA registration number when tenant has one
  if (tenantConfig?.cea_registration_number) {
    lines.push(`CEA registration number: ${tenantConfig.cea_registration_number}`);
  }

  if (lines.length === 0) {
    return null;
  }

  return `## Agent Attribution\nInclude the following agent details in the generated copy:\n${lines.join('\n')}`;
}

/**
 * Area Insight generation — hybrid approach.
 * Template-based for transaction summaries, LLM-assisted for talking points.
 */

import { fetchNearbyTransactions, generateTransactionSummary, type NearbyTransaction } from '@/lib/ura/client';

export interface AreaInsights {
  area_summary: string;
  planning_context: string | null;
  nearby_transactions: NearbyTransaction[];
  transaction_summary: string;
  fit_signals: string[];
  watchouts: string[];
  agent_talking_points: string[];
  seller_pitch_snippet: string;
  confidence_note: string;
  last_refreshed_at: string;
}

interface ListingContext {
  address: string;
  postal_code: string;
  district: string;
  property_type: string;
  asking_price: number | null;
  asking_rental: number | null;
  floor_area_sqft: number;
  tenure: string;
  listing_type: string;
  hdb_type?: string | null;
}

interface BuyerContext {
  districts?: string[];
  property_types?: string[];
  budget_min?: number | null;
  budget_max?: number | null;
  timeline?: string | null;
}

/**
 * Generate full Area Insight for a listing.
 */
export async function generateAreaInsight(listing: ListingContext): Promise<AreaInsights> {
  // 1. Fetch transaction data (routes to HDB or URA based on property type)
  const transactions = await fetchNearbyTransactions(
    listing.postal_code,
    listing.district,
    listing.property_type,
    listing.address,
    listing.hdb_type
  );

  // 2. Compute PSF for comparison
  const listingPsf = listing.asking_price && listing.floor_area_sqft
    ? Math.round(listing.asking_price / listing.floor_area_sqft)
    : null;

  // 3. Generate template-based transaction summary
  const transactionSummary = generateTransactionSummary(transactions, listingPsf);

  // 4. Generate area summary (template-based)
  const areaSummary = generateAreaSummary(listing, transactions);

  // 5. Generate talking points and seller pitch (LLM if available, fallback to template)
  const { talkingPoints, sellerPitch, watchouts } = await generateLLMContent(listing, transactions, transactionSummary);

  // 6. Confidence note
  const dataSource = listing.property_type === 'hdb' ? 'data.gov.sg' : 'URA';
  const confidenceNote = transactions.length >= 10
    ? `Based on ${transactions.length} transactions. Data from ${dataSource}.`
    : transactions.length > 0
    ? `Limited data: ${transactions.length} transactions found. Supplement with your own market knowledge.`
    : `No transaction data available for this area from ${dataSource}. Summary based on general district knowledge.`;

  return {
    area_summary: areaSummary,
    planning_context: null, // Future: integrate URA Master Plan data
    nearby_transactions: transactions.slice(0, 10),
    transaction_summary: transactionSummary,
    fit_signals: [],
    watchouts,
    agent_talking_points: talkingPoints,
    seller_pitch_snippet: sellerPitch,
    confidence_note: confidenceNote,
    last_refreshed_at: new Date().toISOString(),
  };
}

/**
 * Generate buyer fit signals by comparing listing context with buyer requirements.
 */
export function generateBuyerFitSignals(
  listing: ListingContext,
  buyer: BuyerContext,
  insights: AreaInsights | null
): { fit_signals: string[]; watchouts: string[] } {
  const signals: string[] = [];
  const watchouts: string[] = [];

  // District match
  if (buyer.districts?.includes(listing.district)) {
    signals.push(`Matches buyer's preferred district (${listing.district})`);
  } else if (buyer.districts && buyer.districts.length > 0) {
    watchouts.push(`Not in buyer's preferred districts (wants: ${buyer.districts.join(', ')})`);
  }

  // Property type match
  if (buyer.property_types?.includes(listing.property_type)) {
    signals.push(`Property type matches buyer preference (${listing.property_type})`);
  }

  // Budget match
  const price = listing.listing_type === 'sale' ? listing.asking_price : listing.asking_rental;
  if (price && buyer.budget_min && buyer.budget_max) {
    if (price >= buyer.budget_min && price <= buyer.budget_max) {
      signals.push('Price within buyer budget range');
    } else if (price > buyer.budget_max) {
      const overPct = Math.round(((price - buyer.budget_max) / buyer.budget_max) * 100);
      watchouts.push(`Price ${overPct}% above buyer's max budget`);
    } else if (price < buyer.budget_min) {
      signals.push('Price below buyer budget — room for negotiation');
    }
  }

  // Timeline
  if (buyer.timeline === 'Within 3 months' || buyer.timeline === '0_3mo') {
    signals.push('Buyer timeline is urgent — ready to move quickly');
  }

  // Add insight-based watchouts
  if (insights?.watchouts) {
    watchouts.push(...insights.watchouts);
  }

  return { fit_signals: signals, watchouts };
}

// --- Internal helpers ---

function generateAreaSummary(listing: ListingContext, transactions: NearbyTransaction[]): string {
  const districtName = getDistrictName(listing.district);
  let summary = `${listing.district} (${districtName}). `;

  if (listing.property_type === 'landed') {
    summary += 'Landed property enclave. ';
  } else if (listing.property_type === 'condo') {
    summary += 'Private condominium area. ';
  } else if (listing.property_type === 'hdb') {
    summary += 'HDB estate. ';
  }

  summary += `Tenure: ${listing.tenure}. `;

  if (transactions.length > 0) {
    const avgPsf = Math.round(transactions.reduce((s, t) => s + t.psf, 0) / transactions.length);
    summary += `Recent area average: $${avgPsf.toLocaleString()} psf.`;
  }

  return summary;
}

async function generateLLMContent(
  listing: ListingContext,
  transactions: NearbyTransaction[],
  transactionSummary: string
): Promise<{ talkingPoints: string[]; sellerPitch: string; watchouts: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;

  // If no API key, use template fallback
  if (!apiKey) {
    return generateTemplateFallback(listing, transactions, transactionSummary);
  }

  try {
    const prompt = buildPrompt(listing, transactions, transactionSummary);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Singapore property market analyst helping real estate agents prepare for client conversations. Be concise, factual, and practical. Never make price predictions. Use Singapore property terminology.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      console.error('[Insights] OpenAI error:', res.status);
      return generateTemplateFallback(listing, transactions, transactionSummary);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    return parseLLMResponse(content, listing);
  } catch (error) {
    console.error('[Insights] LLM generation failed:', error);
    return generateTemplateFallback(listing, transactions, transactionSummary);
  }
}

function buildPrompt(listing: ListingContext, transactions: NearbyTransaction[], summary: string): string {
  const price = listing.asking_price
    ? `$${(listing.asking_price / 1000000).toFixed(2)}M`
    : listing.asking_rental
    ? `$${listing.asking_rental}/mo rental`
    : 'Price TBD';

  const psf = listing.asking_price && listing.floor_area_sqft
    ? `$${Math.round(listing.asking_price / listing.floor_area_sqft)} psf`
    : '';

  const recentTx = transactions.slice(0, 5).map(
    (t) => `${t.project}: $${t.psf} psf (${t.contract_date})`
  ).join('; ');

  return `Generate insights for this Singapore property listing:

Property: ${listing.address}, ${listing.district}
Type: ${listing.property_type}${listing.hdb_type ? ` (${listing.hdb_type})` : ''}, ${listing.tenure}
Size: ${listing.floor_area_sqft} sqft | Price: ${price} ${psf}
Listing type: ${listing.listing_type}

Transaction context: ${summary}
Recent nearby: ${recentTx || 'No data'}

Respond in this exact JSON format:
{
  "talking_points": ["point 1", "point 2", "point 3"],
  "seller_pitch": "A 2-3 sentence pitch paragraph the agent can use with sellers or share via WhatsApp",
  "watchouts": ["watchout 1 if any"]
}

Rules:
- Talking points should help the agent sound knowledgeable during viewings
- Seller pitch should justify the listing's positioning with market evidence
- Watchouts are potential buyer objections to prepare for (0-2 max)
- Be specific to Singapore market context
- Never predict prices or guarantee returns`;
}

function parseLLMResponse(
  content: string,
  listing: ListingContext
): { talkingPoints: string[]; sellerPitch: string; watchouts: string[] } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        talkingPoints: parsed.talking_points ?? [],
        sellerPitch: parsed.seller_pitch ?? '',
        watchouts: parsed.watchouts ?? [],
      };
    }
  } catch {
    // Fall through to template
  }

  return generateTemplateFallback(listing, [], '');
}

function generateTemplateFallback(
  listing: ListingContext,
  transactions: NearbyTransaction[],
  _summary: string
): { talkingPoints: string[]; sellerPitch: string; watchouts: string[] } {
  const talkingPoints: string[] = [];
  const watchouts: string[] = [];

  // Generate template talking points
  if (listing.tenure === 'freehold') {
    talkingPoints.push('Freehold tenure — no lease decay concerns, strong long-term value retention.');
  } else {
    const remainingLease = listing.tenure === '99yr' ? 'Check remaining lease balance' : '999-year effectively freehold';
    talkingPoints.push(`${listing.tenure} tenure — ${remainingLease}.`);
  }

  if (transactions.length > 0) {
    const avgPsf = Math.round(transactions.reduce((s, t) => s + t.psf, 0) / transactions.length);
    talkingPoints.push(`Area average PSF: $${avgPsf.toLocaleString()} based on recent transactions.`);
  }

  talkingPoints.push(`${listing.district} — ${getDistrictName(listing.district)}. Established neighbourhood with amenities.`);

  // Watchouts
  if (listing.property_type === 'hdb' && listing.asking_price && listing.asking_price > 700000) {
    watchouts.push('Price above $700K for HDB — buyers may question value vs private property options.');
  }

  if (listing.tenure === '99yr') {
    watchouts.push('Leasehold tenure — some buyers may have concerns about remaining lease for financing.');
  }

  // Seller pitch
  const price = listing.asking_price
    ? `$${(listing.asking_price / 1000000).toFixed(2)}M`
    : listing.asking_rental
    ? `$${listing.asking_rental.toLocaleString()}/month`
    : '';

  const sellerPitch = `${listing.address} is well-positioned in ${listing.district} (${getDistrictName(listing.district)}). ` +
    `At ${price}, the ${listing.floor_area_sqft.toLocaleString()} sqft ${listing.property_type} offers ${listing.tenure} tenure ` +
    `in an established area with strong demand from qualified buyers.`;

  return { talkingPoints, sellerPitch, watchouts };
}

function getDistrictName(district: string): string {
  const map: Record<string, string> = {
    D01: 'Raffles Place, Marina', D02: 'Tanjong Pagar', D03: 'Queenstown, Tiong Bahru',
    D04: 'Harbourfront', D05: 'Pasir Panjang, Clementi', D06: 'Beach Road',
    D07: 'Golden Mile', D08: 'Little India', D09: 'Orchard, River Valley',
    D10: 'Bukit Timah, Holland', D11: 'Novena, Thomson', D12: 'Toa Payoh, Balestier',
    D13: 'Macpherson', D14: 'Geylang, Eunos', D15: 'Katong, East Coast',
    D16: 'Bedok, Upper East Coast', D17: 'Changi', D18: 'Tampines, Pasir Ris',
    D19: 'Serangoon, Hougang', D20: 'Bishan, Ang Mo Kio', D21: 'Upper Bukit Timah',
    D22: 'Jurong', D23: 'Bukit Panjang, Choa Chu Kang', D24: 'Lim Chu Kang, Tengah',
    D25: 'Woodlands', D26: 'Upper Thomson', D27: 'Yishun, Sembawang', D28: 'Seletar',
  };
  return map[district] ?? district;
}

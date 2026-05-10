import type {
  ComplianceResult,
  ComplianceWarning,
  ComplianceCategory,
} from './ad-copy-types';

interface CompliancePattern {
  regex: RegExp;
  category: ComplianceCategory;
  message: string;
}

// --- Unsupported Superlatives ---
const UNSUPPORTED_SUPERLATIVES: CompliancePattern[] = [
  {
    regex: /\bbest deal\b/gi,
    category: 'unsupported_superlative',
    message: 'Unsupported superlative: "best deal" cannot be substantiated.',
  },
  {
    regex: /\bguaranteed return\b/gi,
    category: 'unsupported_superlative',
    message: 'Unsupported superlative: "guaranteed return" cannot be substantiated.',
  },
  {
    regex: /\bhighest yield\b/gi,
    category: 'unsupported_superlative',
    message: 'Unsupported superlative: "highest yield" cannot be substantiated.',
  },
  {
    regex: /\bnumber one\b/gi,
    category: 'unsupported_superlative',
    message: 'Unsupported superlative: "number one" cannot be substantiated.',
  },
  {
    regex: /\btop performer\b/gi,
    category: 'unsupported_superlative',
    message: 'Unsupported superlative: "top performer" cannot be substantiated.',
  },
];

// --- Misleading Claims ---
const MISLEADING_CLAIMS: CompliancePattern[] = [
  {
    regex: /\d+(\.\d+)?%\s*(annual\s+)?appreciation/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: specific appreciation rate promises require verification.',
  },
  {
    regex: /appreciation\s*(of\s+)?\d+(\.\d+)?%/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: specific appreciation rate promises require verification.',
  },
  {
    regex: /guaranteed\s+(rental\s+)?return(s)?\s*(of\s+)?\d+(\.\d+)?%/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: guaranteed rental return percentages are unverifiable.',
  },
  {
    regex: /\d+(\.\d+)?%\s*guaranteed\s+(rental\s+)?return/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: guaranteed rental return percentages are unverifiable.',
  },
  {
    regex: /assured\s+(financing|loan|mortgage)\s+approval/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: financing approval cannot be assured.',
  },
  {
    regex: /\blast unit\b/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: "last unit" implies artificial scarcity without verifiable basis.',
  },
  {
    regex: /\bselling fast\b/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: "selling fast" implies artificial scarcity without verifiable basis.',
  },
  {
    regex: /\blimited time only\b/gi,
    category: 'misleading_claim',
    message: 'Misleading claim: "limited time only" implies artificial scarcity without verifiable basis.',
  },
];

// --- Discriminatory Language ---
const DISCRIMINATORY_LANGUAGE: CompliancePattern[] = [
  {
    regex: /\b(ideal for|perfect for|suitable for|designed for|meant for|only for|exclusively for)\s+(chinese|malay|indian|caucasian|asian|white|black)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on race or ethnicity violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not for|excluding)\s+(chinese|malay|indian|caucasian|asian|white|black|foreigners?|locals?)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on race, ethnicity, or national origin violates Meta housing ad policies.',
  },
  {
    regex: /\b(christians?|muslims?|hindus?|buddhists?|jews?|jewish|catholic|protestant)\s+(only|preferred|welcome)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on religion violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not for|excluding)\s+(christians?|muslims?|hindus?|buddhists?|jews?|jewish|catholics?|protestants?)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on religion violates Meta housing ad policies.',
  },
  {
    regex: /\b(young|elderly|seniors?|retirees?|millennials?|gen[- ]?z|boomers?)\s+(only|preferred)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on age violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not for|excluding)\s+(elderly|seniors?|retirees?|young people|children|kids|families)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on age or family status violates Meta housing ad policies.',
  },
  {
    regex: /\b(males?|females?|men|women|ladies|gentlemen)\s+(only|preferred)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on sex violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not for|excluding)\s+(males?|females?|men|women|couples?|singles?)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on sex or sexual orientation violates Meta housing ad policies.',
  },
  {
    regex: /\b(straight|heterosexual|gay|lesbian|lgbtq?)\s+(only|preferred|couples?)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on sexual orientation violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not for|excluding)\s+(disabled|handicapped|wheelchair)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on disability violates Meta housing ad policies.',
  },
  {
    regex: /\b(no|not suitable for)\s+(families|children|kids|pets)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: excluding based on family status violates Meta housing ad policies.',
  },
  {
    regex: /\b(ideal for|perfect for|suitable for)\s+(singles? only|couples? only|no kids|no children|childless)\b/gi,
    category: 'discriminatory_language',
    message: 'Discriminatory language: targeting or excluding based on family status violates Meta housing ad policies.',
  },
];

// --- Unverified Factual Claims ---
const UNVERIFIED_FACTUAL_CLAIMS: CompliancePattern[] = [
  {
    regex: /\b\d+\s*(min|minute|minutes|mins)\s*(walk|walking)\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: numeric walking-distance claims require verification. Verify before publishing.',
  },
  {
    regex: /\b(walk|walking)\s*\d+\s*(min|minute|minutes|mins)\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: numeric walking-distance claims require verification. Verify before publishing.',
  },
  {
    regex: /\b\d+\s*(m|meters?|metres?)\s*(from|to|away)\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: numeric distance claims require verification. Verify before publishing.',
  },
  {
    regex: /\b(school|schools)\b.{0,30}\b(\d+\s*(m|meters?|metres?|min|minute|minutes|mins|km))\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: school proximity with distance/time requires verification. Verify before publishing.',
  },
  {
    regex: /\b\d+\s*(m|meters?|metres?|min|minute|minutes|mins|km)\b.{0,30}\b(school|schools)\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: school proximity with distance/time requires verification. Verify before publishing.',
  },
  {
    regex: /\b(MRT|mrt|train station)\b.{0,30}\b(\d+\s*(m|meters?|metres?|min|minute|minutes|mins|km))\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: MRT proximity with distance/time requires verification. Verify before publishing.',
  },
  {
    regex: /\b\d+\s*(m|meters?|metres?|min|minute|minutes|mins|km)\b.{0,30}\b(MRT|mrt|train station)\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: MRT proximity with distance/time requires verification. Verify before publishing.',
  },
  {
    regex: /\b(rental\s+)?yield\s*(of\s+)?\d+(\.\d+)?%/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: stated rental yield percentage requires verification. Verify before publishing.',
  },
  {
    regex: /\b\d+(\.\d+)?%\s*(rental\s+)?yield\b/gi,
    category: 'unverified_factual_claim',
    message: 'Unverified factual claim: stated rental yield percentage requires verification. Verify before publishing.',
  },
];

const ALL_PATTERNS: CompliancePattern[] = [
  ...UNSUPPORTED_SUPERLATIVES,
  ...MISLEADING_CLAIMS,
  ...DISCRIMINATORY_LANGUAGE,
  ...UNVERIFIED_FACTUAL_CLAIMS,
];

/**
 * Scans ad copy text for compliance issues across four categories:
 * - Unsupported superlatives
 * - Misleading claims
 * - Discriminatory language (Meta housing ad protected categories)
 * - Unverified factual claims
 *
 * Uses case-insensitive regex matching.
 */
export function checkCompliance(text: string): ComplianceResult {
  const warnings: ComplianceWarning[] = [];
  const seenPhrases = new Set<string>();

  for (const pattern of ALL_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const phrase = match[0];
      // Deduplicate: same phrase + same category only reported once
      const key = `${phrase.toLowerCase()}::${pattern.category}`;
      if (!seenPhrases.has(key)) {
        seenPhrases.add(key);
        warnings.push({
          phrase,
          category: pattern.category,
          message: pattern.message,
        });
      }
    }
  }

  return {
    warnings,
    scanned_at: new Date().toISOString(),
  };
}

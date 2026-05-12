'use client';

import { useState, useMemo } from 'react';
import type {
  AdPlatform,
  AdTone,
  AdLength,
  CtaStyle,
  TargetAudience,
  GenerationParams,
} from '@/lib/ai/ad-copy-types';
import {
  validateGenerationForm,
  type ListingDataForValidation,
} from '@/lib/ai/generation-form-validation';

// --- Option definitions ---

const PLATFORM_OPTIONS: { value: AdPlatform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp promo' },
  { value: 'generic', label: 'Generic social' },
];

const TONE_OPTIONS: { value: AdTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'premium', label: 'Premium' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'investor', label: 'Investor-focused' },
  { value: 'family', label: 'Family-focused' },
];

const LENGTH_OPTIONS: { value: AdLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const CTA_OPTIONS: { value: CtaStyle; label: string }[] = [
  { value: 'enquire_now', label: 'Enquire now' },
  { value: 'whatsapp_now', label: 'WhatsApp now' },
  { value: 'book_viewing', label: 'Book a viewing' },
  { value: 'request_details', label: 'Request details' },
];

const AUDIENCE_OPTIONS: { value: TargetAudience; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'upgrader', label: 'Upgrader' },
  { value: 'investor', label: 'Investor' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'first_time_buyer', label: 'First-time buyer' },
];

// --- Props ---

interface GenerationFormProps {
  onGenerate: (params: GenerationParams) => void;
  isGenerating: boolean;
  listingData: ListingDataForValidation & { listing_id: string };
}

export function GenerationForm({ onGenerate, isGenerating, listingData }: GenerationFormProps) {
  // Form state with defaults per requirement 3.8
  const [platform, setPlatform] = useState<AdPlatform>('facebook');
  const [tone, setTone] = useState<AdTone>('professional');
  const [length, setLength] = useState<AdLength>('medium');
  const [ctaStyle, setCtaStyle] = useState<CtaStyle>('enquire_now');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>('');
  const [avoidEmojis, setAvoidEmojis] = useState(false);
  const [includeHashtags, setIncludeHashtags] = useState(true);

  // Validation using the shared validation function
  const validation = useMemo(
    () =>
      validateGenerationForm(
        { platform, tone, length, cta_style: ctaStyle },
        listingData
      ),
    [platform, tone, length, ctaStyle, listingData]
  );

  const canGenerate = validation.valid && !isGenerating;

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!canGenerate) return;

    const params: GenerationParams = {
      listing_id: listingData.listing_id,
      platform,
      tone,
      length,
      cta_style: ctaStyle,
      avoid_emojis: avoidEmojis,
      include_hashtags: includeHashtags,
      ...(targetAudience ? { target_audience: targetAudience } : {}),
    };

    onGenerate(params);
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {/* Platform selector */}
      <div>
        <label
          htmlFor="platform"
          className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
        >
          Platform <span className="text-brand">*</span>
        </label>
        <select
          id="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as AdPlatform)}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
        >
          {PLATFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {validation.missingFormFields.includes('platform') && (
          <p className="text-xs text-status-red mt-1">Platform is required</p>
        )}
      </div>

      {/* Tone selector */}
      <div>
        <label
          htmlFor="tone"
          className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
        >
          Tone <span className="text-brand">*</span>
        </label>
        <select
          id="tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as AdTone)}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
        >
          {TONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {validation.missingFormFields.includes('tone') && (
          <p className="text-xs text-status-red mt-1">Tone is required</p>
        )}
      </div>

      {/* Length selector */}
      <div>
        <label
          htmlFor="length"
          className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
        >
          Length <span className="text-brand">*</span>
        </label>
        <select
          id="length"
          value={length}
          onChange={(e) => setLength(e.target.value as AdLength)}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
        >
          {LENGTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {validation.missingFormFields.includes('length') && (
          <p className="text-xs text-status-red mt-1">Length is required</p>
        )}
      </div>

      {/* CTA style selector */}
      <div>
        <label
          htmlFor="cta_style"
          className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
        >
          CTA Style <span className="text-brand">*</span>
        </label>
        <select
          id="cta_style"
          value={ctaStyle}
          onChange={(e) => setCtaStyle(e.target.value as CtaStyle)}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
        >
          {CTA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {validation.missingFormFields.includes('cta_style') && (
          <p className="text-xs text-status-red mt-1">CTA style is required</p>
        )}
      </div>

      {/* Target audience (optional) */}
      <div>
        <label
          htmlFor="target_audience"
          className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
        >
          Target Audience <span className="text-gray-2/50 text-[10px] normal-case">(optional)</span>
        </label>
        <select
          id="target_audience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value as TargetAudience | '')}
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px]"
        >
          <option value="">No specific audience</option>
          {AUDIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <button
            type="button"
            role="switch"
            aria-checked={avoidEmojis}
            onClick={() => setAvoidEmojis(!avoidEmojis)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              avoidEmojis ? 'bg-brand' : 'bg-onyx-raised border border-onyx-line'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                avoidEmojis ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-2">Avoid emojis</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <button
            type="button"
            role="switch"
            aria-checked={includeHashtags}
            onClick={() => setIncludeHashtags(!includeHashtags)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              includeHashtags ? 'bg-brand' : 'bg-onyx-raised border border-onyx-line'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                includeHashtags ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-2">Include hashtags</span>
        </label>
      </div>

      {/* Validation messages for listing data */}
      {validation.missingListingFields.length > 0 && (
        <div className="rounded-xl bg-status-red/10 border border-status-red/30 px-4 py-3">
          <p className="text-xs text-status-red font-medium">
            Listing is missing required data:{' '}
            {validation.missingListingFields.join(', ')}
          </p>
        </div>
      )}

      {/* Generate button */}
      <button
        type="submit"
        disabled={!canGenerate}
        className={`w-full rounded-pill font-medium text-sm px-[18px] py-[10px] min-h-[44px] transition-opacity ${
          canGenerate
            ? 'bg-aqua text-onyx cursor-pointer hover:opacity-90'
            : 'bg-aqua/40 text-onyx/60 cursor-not-allowed'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Ad Copy'}
      </button>
    </form>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AdPlatform, CopyVariant, CopyVariantType } from '@/lib/ai/ad-copy-types';

// --- Tab definitions ---

const TABS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'short', label: 'Short Version' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** Maps each tab to the variant types it displays */
const TAB_VARIANT_MAP: Record<TabKey, CopyVariantType[]> = {
  facebook: ['primary_caption', 'short_headline', 'cta_line', 'hashtags'],
  instagram: ['instagram_caption', 'hashtags'],
  whatsapp: ['whatsapp_promo'],
  short: ['short_form'],
};

/** Human-readable labels for each variant type */
const VARIANT_TYPE_LABELS: Record<CopyVariantType, string> = {
  primary_caption: 'Primary Caption',
  short_headline: 'Short Headline',
  cta_line: 'CTA Line',
  short_form: 'Short Form',
  instagram_caption: 'Instagram Caption',
  whatsapp_promo: 'WhatsApp Promo Text',
  hashtags: 'Hashtags',
};

// --- Props ---

interface CopyOutputPanelProps {
  variants: CopyVariant[];
  platform: AdPlatform;
  onVariantChange: (type: CopyVariantType, content: string) => void;
  isGenerating: boolean;
}

/** Resolves the initial active tab from the selected platform */
function getInitialTab(platform: AdPlatform): TabKey {
  switch (platform) {
    case 'facebook':
      return 'facebook';
    case 'instagram':
      return 'instagram';
    case 'whatsapp':
      return 'whatsapp';
    case 'generic':
    default:
      return 'facebook';
  }
}

export function CopyOutputPanel({
  variants,
  platform,
  onVariantChange,
  isGenerating,
}: CopyOutputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => getInitialTab(platform));
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Update active tab when platform changes (new generation)
  useEffect(() => {
    setActiveTab(getInitialTab(platform));
  }, [platform]);

  // Check if tabs overflow for scroll indicator on mobile
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    function checkOverflow() {
      if (container) {
        setShowScrollIndicator(container.scrollWidth > container.clientWidth);
      }
    }

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);

  // Get variants for the active tab
  const activeVariantTypes = TAB_VARIANT_MAP[activeTab];
  const activeVariants = variants.filter((v) => activeVariantTypes.includes(v.type));

  // Handle text area change — preserves edits across tabs via parent state
  const handleContentChange = useCallback(
    (type: CopyVariantType, content: string) => {
      onVariantChange(type, content);
    },
    [onVariantChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Pre_Publish_Reminder — fixed at top */}
      <div className="sticky top-0 z-10 bg-status-amber/10 border border-status-amber/30 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-status-amber font-medium">
          Review and verify all factual statements before publishing
        </p>
      </div>

      {/* Tab navigation — horizontally scrollable on mobile */}
      <div className="relative mb-4">
        <div
          ref={tabsContainerRef}
          className="flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Copy output platform tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 text-center rounded-pill px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] min-w-[44px] ${
                activeTab === tab.key
                  ? 'bg-aqua text-onyx'
                  : 'text-gray-2 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Scroll indicator fade on mobile */}
        {showScrollIndicator && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-onyx-card to-transparent rounded-r-pill pointer-events-none md:hidden" />
        )}
      </div>

      {/* Tab content */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="flex-1 space-y-4"
      >
        {activeVariants.length === 0 && !isGenerating && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-2">
              No variants available for this tab. Generate copy to see results.
            </p>
          </div>
        )}

        {isGenerating && activeVariants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-2 animate-pulse">Generating copy...</p>
          </div>
        )}

        {activeVariants.map((variant) => (
          <VariantTextArea
            key={variant.type}
            variant={variant}
            onChange={handleContentChange}
            isGenerating={isGenerating}
          />
        ))}
      </div>
    </div>
  );
}

// --- Variant Text Area ---

interface VariantTextAreaProps {
  variant: CopyVariant;
  onChange: (type: CopyVariantType, content: string) => void;
  isGenerating: boolean;
}

function VariantTextArea({ variant, onChange, isGenerating }: VariantTextAreaProps) {
  const label = VARIANT_TYPE_LABELS[variant.type];

  return (
    <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
      <label
        htmlFor={`variant-${variant.type}`}
        className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-2"
      >
        {label}
      </label>
      <textarea
        id={`variant-${variant.type}`}
        value={variant.content}
        onChange={(e) => onChange(variant.type, e.target.value)}
        maxLength={3000}
        disabled={isGenerating}
        rows={variant.type === 'short_headline' || variant.type === 'cta_line' ? 2 : 5}
        className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`${label} content`}
      />
      <div className="flex justify-end mt-1">
        <span className="text-[10px] text-gray-2">
          {variant.content.length} / 3000
        </span>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  MarketingAssetRecord,
  GenerationParams,
  CopyVariant,
  CopyVariantType,
  ComplianceWarning,
  GenerateAdCopyResponse,
  GenerateAdCopyErrorResponse,
} from '@/lib/ai/ad-copy-types';
import { checkCompliance } from '@/lib/ai/compliance-checker';
import { isDirty } from '@/lib/ai/dirty-state';
import { GenerationForm } from './generation-form';
import { CopyVariantCard } from './copy-variant-card';
import { ComplianceNotes } from './compliance-notes';
import { SavedCopySection } from './saved-copy-section';
import { createClient } from '@/lib/supabase/client';

export interface AdCopyClientShellProps {
  listing: {
    id: string;
    tenant_id: string;
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
    listing_status: string;
  };
  agentProfile: {
    full_name: string | null;
    phone: string | null;
    cea_licence_number: string | null;
  };
  tenantConfig: {
    id: string;
    cea_registration_number: string | null;
    settings_json: Record<string, unknown> | null;
  };
  savedRecords: MarketingAssetRecord[];
}

export function AdCopyClientShell({
  listing,
  agentProfile,
  tenantConfig,
  savedRecords: initialSavedRecords,
}: AdCopyClientShellProps) {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<GenerationParams['platform']>('facebook');

  // Track original generated content for dirty detection
  const originalContentRef = useRef<Record<CopyVariantType, string>>({} as Record<CopyVariantType, string>);

  // Compliance state
  const [complianceWarnings, setComplianceWarnings] = useState<ComplianceWarning[]>([]);
  const [complianceCheckFailed, setComplianceCheckFailed] = useState(false);

  // Save state per variant
  const [savedVariants, setSavedVariants] = useState<Set<CopyVariantType>>(new Set());
  const [savingVariants, setSavingVariants] = useState<Set<CopyVariantType>>(new Set());
  const [publishedVariants, setPublishedVariants] = useState<Set<CopyVariantType>>(new Set());

  // Saved records
  const [savedRecords, setSavedRecords] = useState<MarketingAssetRecord[]>(initialSavedRecords);

  // Has generated at least once
  const hasGenerated = variants.length > 0;

  // Handle generation
  const handleGenerate = useCallback(async (params: GenerationParams) => {
    // Warn about unsaved edits
    if (hasGenerated) {
      const hasDirtyVariants = variants.some(
        (v) => isDirty(v.content, originalContentRef.current[v.type] ?? '')
      );
      if (hasDirtyVariants) {
        const confirmed = window.confirm(
          'You have unsaved changes that will be lost. Continue?'
        );
        if (!confirmed) return;
      }
    }

    setIsGenerating(true);
    setError(null);
    setComplianceWarnings([]);
    setComplianceCheckFailed(false);
    setSavedVariants(new Set());
    setSavingVariants(new Set());
    setPublishedVariants(new Set());
    setCurrentPlatform(params.platform);

    try {
      const response = await fetch('/api/ad-copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData: GenerateAdCopyErrorResponse = await response.json();
        setError(errorData.error || 'Generation failed. Please try again.');
        setIsGenerating(false);
        return;
      }

      const data: GenerateAdCopyResponse = await response.json();
      setVariants(data.variants);

      // Store original content for dirty detection
      const originals: Record<string, string> = {};
      data.variants.forEach((v) => {
        originals[v.type] = v.content;
      });
      originalContentRef.current = originals as Record<CopyVariantType, string>;

      // Run compliance check
      try {
        const allText = data.variants.map((v) => v.content).join('\n');
        const result = checkCompliance(allText);
        setComplianceWarnings(result.warnings);
        setComplianceCheckFailed(false);
      } catch {
        setComplianceCheckFailed(true);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [hasGenerated, variants]);

  // Handle variant content change (editing)
  const handleVariantChange = useCallback((type: CopyVariantType, content: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.type === type ? { ...v, content } : v))
    );
    // Re-enable save if content changed after a save
    setSavedVariants((prev) => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  }, []);

  // Handle save
  const handleSave = useCallback(async (variant: CopyVariant) => {
    setSavingVariants((prev) => new Set(prev).add(variant.type));

    try {
      const supabase = createClient();

      // Get current user ID for saved_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to save.');
        setSavingVariants((prev) => {
          const next = new Set(prev);
          next.delete(variant.type);
          return next;
        });
        return;
      }

      const assetType = mapVariantTypeToAssetType(variant.type);

      const { error: saveError } = await supabase
        .from('listing_marketing_assets')
        .insert({
          tenant_id: listing.tenant_id,
          listing_id: listing.id,
          asset_type: assetType,
          platform: currentPlatform,
          tone: 'professional',
          content_text: variant.content,
          compliance_flags: complianceWarnings,
          generated_by: 'ai',
          saved_by: user.id,
        });

      if (saveError) {
        setError('Failed to save. Please try again.');
      } else {
        setSavedVariants((prev) => new Set(prev).add(variant.type));
        originalContentRef.current[variant.type] = variant.content;
      }
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSavingVariants((prev) => {
        const next = new Set(prev);
        next.delete(variant.type);
        return next;
      });
    }
  }, [listing.tenant_id, listing.id, currentPlatform, complianceWarnings]);

  // Handle mark as used
  const handleMarkAsUsed = useCallback(async (variant: CopyVariant) => {
    // For now, mark locally — in a full implementation this would update the DB record
    setPublishedVariants((prev) => new Set(prev).add(variant.type));
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
          Ad Copy Assistant
        </h1>
        <p className="text-[13px] text-gray-2 mt-1">
          Generate marketing copy for {listing.address}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-status-red/10 border border-status-red/30 px-4 py-3">
          <p className="text-xs text-status-red font-medium">{error}</p>
        </div>
      )}

      {/* Main layout: responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-5">
        {/* Left: Generation Form */}
        <div className="bg-onyx-card rounded-2xl border border-onyx-line p-5">
          <h2 className="text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-4">
            Generation Settings
          </h2>
          <GenerationForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            listingData={{
              listing_id: listing.id,
              address: listing.address,
              property_type: listing.property_type,
              listing_type: listing.listing_type,
              asking_price: listing.asking_price,
              asking_rental: listing.asking_rental,
            }}
          />
        </div>

        {/* Right: Output Panel */}
        <div className="space-y-4">
          {hasGenerated || isGenerating ? (
            <>
              {/* Pre-publish reminder */}
              <div className="sticky top-0 z-10 bg-status-amber/10 border border-status-amber/30 rounded-xl px-4 py-3">
                <p className="text-xs text-status-amber font-medium">
                  Review and verify all factual statements before publishing
                </p>
              </div>

              {/* Loading state */}
              {isGenerating && variants.length === 0 && (
                <div className="bg-onyx-card rounded-2xl border border-onyx-line p-8 text-center">
                  <p className="text-sm text-gray-2 animate-pulse">Generating copy...</p>
                </div>
              )}

              {/* Variant cards with copy/save/mark-as-used actions */}
              {!isGenerating && variants.length > 0 && (
                <div className="space-y-3">
                  {variants.map((variant) => (
                    <CopyVariantCard
                      key={variant.type}
                      type={variant.type}
                      content={variant.content}
                      maxLength={variant.max_length}
                      isGenerating={isGenerating}
                      isSaved={savedVariants.has(variant.type)}
                      isSaving={savingVariants.has(variant.type)}
                      isPublished={publishedVariants.has(variant.type)}
                      isDirty={isDirty(
                        variant.content,
                        originalContentRef.current[variant.type] ?? ''
                      )}
                      onContentChange={(content) =>
                        handleVariantChange(variant.type, content)
                      }
                      onSave={() => handleSave(variant)}
                      onMarkAsUsed={() => handleMarkAsUsed(variant)}
                    />
                  ))}
                </div>
              )}

              {/* Compliance notes */}
              {!isGenerating && hasGenerated && (
                <ComplianceNotes
                  warnings={complianceWarnings}
                  checkFailed={complianceCheckFailed}
                />
              )}
            </>
          ) : (
            <div className="bg-onyx-card rounded-2xl border border-onyx-line p-8 text-center">
              <p className="text-sm text-gray-2">
                Configure your settings and click &ldquo;Generate Ad Copy&rdquo; to get started.
              </p>
            </div>
          )}

          {/* Saved copy section */}
          {savedRecords.length > 0 && (
            <div className="mt-6">
              <SavedCopySection records={savedRecords} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function mapVariantTypeToAssetType(type: CopyVariantType): string {
  switch (type) {
    case 'primary_caption':
      return 'ad_copy';
    case 'short_headline':
      return 'headline';
    case 'instagram_caption':
      return 'caption';
    case 'whatsapp_promo':
      return 'whatsapp_text';
    case 'hashtags':
      return 'hashtags';
    case 'short_form':
      return 'short_form';
    case 'cta_line':
      return 'ad_copy';
    default:
      return 'ad_copy';
  }
}

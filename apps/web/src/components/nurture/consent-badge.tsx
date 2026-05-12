import type { ConsentBadge as ConsentBadgeValue } from '@/lib/nurture/consent';

interface ConsentBadgeProps {
  value: ConsentBadgeValue;
  /** Optional additional CSS classes */
  className?: string;
}

const BADGE_CONFIG: Record<ConsentBadgeValue, { emoji: string; label: string }> = {
  green: { emoji: '🟢', label: 'Valid consent' },
  yellow: { emoji: '🟡', label: 'Partial consent' },
  red: { emoji: '🔴', label: 'No consent' },
};

/**
 * Consent badge component that renders a colored circle emoji
 * indicating the contact's PDPA consent status.
 *
 * - 🟢 Green: Valid consent — whatsapp_optin is true and ad_purpose matches
 * - 🟡 Yellow: Partial consent — whatsapp_optin is true but ad_purpose mismatch
 * - 🔴 Red: No consent — whatsapp_optin is false, channel_preference is "none", or expired
 *
 * Validates: Requirements 6.3, 10.4
 */
export function ConsentBadge({ value, className }: ConsentBadgeProps) {
  const { emoji, label } = BADGE_CONFIG[value];

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center text-base leading-none${className ? ` ${className}` : ''}`}
    >
      {emoji}
    </span>
  );
}

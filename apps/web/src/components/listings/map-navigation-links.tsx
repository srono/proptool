import { ExternalLink, Map } from 'lucide-react';

import {
  buildAriaLabel,
  buildGoogleMapsUrl,
  buildOneMapUrl,
  isValidPostalCode,
} from '@/lib/maps/url-builders';

export interface MapNavigationLinksProps {
  address: string;
  postalCode: string;
}

export function MapNavigationLinks({
  address,
  postalCode,
}: MapNavigationLinksProps) {
  const hasValidAddress = address.trim().length > 0;
  const hasValidPostalCode = isValidPostalCode(postalCode);

  if (!hasValidAddress || !hasValidPostalCode) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={buildGoogleMapsUrl(address, postalCode)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={buildAriaLabel('Google Maps', address)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-2 hover:text-white hover:bg-onyx-line/50 transition-colors"
        title="Open in Google Maps"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
      <a
        href={buildOneMapUrl(postalCode)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={buildAriaLabel('OneMap', address)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-2 hover:text-white hover:bg-onyx-line/50 transition-colors"
        title="Open in OneMap"
      >
        <Map className="h-4 w-4" />
      </a>
    </div>
  );
}

/**
 * URA Data Service API client + HDB Resale data from data.gov.sg.
 * Routes to the correct data source based on property type:
 * - HDB → data.gov.sg HDB Resale Flat Prices API
 * - Private (condo/landed/apartment) → URA PMI_Resi_Transaction API
 */

const URA_BASE_URL = 'https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1';
const HDB_RESALE_URL = 'https://data.gov.sg/api/action/datastore_search';
// Resource ID for HDB Resale Flat Prices (Jan 2017 onwards)
const HDB_RESALE_RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

interface UraTransaction {
  project: string;
  street: string;
  area: string; // sqm
  floorRange: string;
  noOfUnits: string;
  contractDate: string; // mmyy format
  typeOfSale: string;
  price: string;
  propertyType: string;
  district: string;
  typeOfArea: string;
  tenure: string;
  psf?: number;
  nettPrice?: string;
}

interface UraApiResponse {
  Status: string;
  Message: string;
  Result: Array<{
    street: string;
    project: string;
    transaction: UraTransaction[];
  }>;
}

interface HdbResaleRecord {
  month: string; // "2024-09"
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

interface HdbApiResponse {
  success: boolean;
  result: {
    records: HdbResaleRecord[];
    total: number;
  };
}

export interface NearbyTransaction {
  project: string;
  street: string;
  price: number;
  psf: number;
  area_sqft: number;
  floor_range: string;
  contract_date: string;
  type_of_sale: string;
  property_type: string;
}

/**
 * Get a daily token from URA (required before making data requests).
 * Token is valid for the calendar day.
 */
async function getUraToken(): Promise<string | null> {
  const accessKey = process.env.URA_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const res = await fetch('https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1', {
      method: 'GET',
      headers: { AccessKey: accessKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.Result ?? null;
  } catch {
    return null;
  }
}

/**
 * Normalize HDB flat type from our DB format to data.gov.sg API format.
 * DB: '2room', '3room', '4room', '5room', 'executive'
 * API: '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'
 */
function normalizeFlatType(flatType: string): string {
  const mapping: Record<string, string> = {
    '2room': '2 ROOM',
    '3room': '3 ROOM',
    '4room': '4 ROOM',
    '5room': '5 ROOM',
    'executive': 'EXECUTIVE',
  };

  const lower = flatType.toLowerCase().replace(/[\s-]/g, '');
  if (mapping[lower]) return mapping[lower];

  // Fallback: try to insert space before 'room' and uppercase
  const withSpace = flatType.toUpperCase().replace(/(\d)(ROOM)/i, '$1 $2');
  return withSpace;
}

/**
 * Map district codes to HDB town names for data.gov.sg queries.
 */
function districtToHdbTown(district: string, address: string): string {
  // Try to extract town from address first (more accurate)
  const addressUpper = address.toUpperCase();
  const hdbTowns = [
    'ANG MO KIO', 'BEDOK', 'BISHAN', 'BUKIT BATOK', 'BUKIT MERAH',
    'BUKIT PANJANG', 'BUKIT TIMAH', 'CENTRAL AREA', 'CHOA CHU KANG',
    'CLEMENTI', 'GEYLANG', 'HOUGANG', 'JURONG EAST', 'JURONG WEST',
    'KALLANG/WHAMPOA', 'MARINE PARADE', 'PASIR RIS', 'PUNGGOL',
    'QUEENSTOWN', 'SEMBAWANG', 'SENGKANG', 'SERANGOON', 'TAMPINES',
    'TOA PAYOH', 'WOODLANDS', 'YISHUN',
  ];

  for (const town of hdbTowns) {
    if (addressUpper.includes(town) || addressUpper.includes(town.replace('/', ' '))) {
      return town;
    }
  }

  // Fallback: map district to most likely HDB town
  const districtTownMap: Record<string, string> = {
    D03: 'QUEENSTOWN', D04: 'BUKIT MERAH', D05: 'CLEMENTI',
    D12: 'TOA PAYOH', D13: 'GEYLANG', D14: 'GEYLANG',
    D16: 'BEDOK', D17: 'PASIR RIS', D18: 'TAMPINES',
    D19: 'SERANGOON', D20: 'BISHAN', D21: 'BUKIT TIMAH',
    D22: 'JURONG EAST', D23: 'BUKIT PANJANG', D24: 'CHOA CHU KANG',
    D25: 'WOODLANDS', D26: 'ANG MO KIO', D27: 'YISHUN', D28: 'SENGKANG',
  };

  return districtTownMap[district] ?? '';
}

/**
 * Fetch HDB resale transactions from data.gov.sg for a given town.
 * Returns the most recent transactions (up to 20).
 */
async function fetchHdbResaleTransactions(
  town: string,
  flatType?: string | null
): Promise<NearbyTransaction[]> {
  if (!town) {
    console.warn('[HDB] No town resolved for HDB lookup');
    return [];
  }

  try {
    // Build query filters for data.gov.sg
    const filters: Record<string, string> = { town: town.toUpperCase() };
    if (flatType) {
      // Normalize flat type for API
      // DB stores: '2room', '3room', '4room', '5room', 'executive'
      // API expects: '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'
      const normalized = normalizeFlatType(flatType);
      if (normalized) {
        filters.flat_type = normalized;
      }
    }

    const params = new URLSearchParams({
      resource_id: HDB_RESALE_RESOURCE_ID,
      filters: JSON.stringify(filters),
      sort: 'month desc',
      limit: '20',
    });

    const res = await fetch(`${HDB_RESALE_URL}?${params.toString()}`);

    if (!res.ok) {
      console.error('[HDB] data.gov.sg API error:', res.status);
      return [];
    }

    const data: HdbApiResponse = await res.json();
    if (!data.success || !data.result?.records) return [];

    return data.result.records.map((record) => {
      const areaSqm = parseFloat(record.floor_area_sqm) || 0;
      const areaSqft = areaSqm * 10.764;
      const price = parseFloat(record.resale_price) || 0;
      const psf = areaSqft > 0 ? Math.round(price / areaSqft) : 0;

      // Format month from "2024-09" to "Sep 2024"
      const [year, month] = record.month.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1] ?? month;

      return {
        project: `BLK ${record.block} ${record.street_name}`,
        street: record.street_name,
        price,
        psf,
        area_sqft: Math.round(areaSqft),
        floor_range: record.storey_range,
        contract_date: `${monthName} ${year}`,
        type_of_sale: 'Resale',
        property_type: record.flat_type,
      };
    });
  } catch (error) {
    console.error('[HDB] Fetch error:', error);
    return [];
  }
}

/**
 * Fetch nearby transactions — routes to the correct data source based on property type.
 * - HDB listings → data.gov.sg HDB Resale Flat Prices
 * - Private listings → URA PMI_Resi_Transaction
 */
export async function fetchNearbyTransactions(
  postalCode: string,
  district: string,
  propertyType?: string,
  address?: string,
  hdbType?: string | null
): Promise<NearbyTransaction[]> {
  // Route HDB listings to data.gov.sg
  if (propertyType === 'hdb') {
    const town = districtToHdbTown(district, address ?? '');
    console.log(`[HDB] Fetching resale data for town: ${town}, flat type: ${hdbType ?? 'all'}`);
    return fetchHdbResaleTransactions(town, hdbType);
  }

  // Private residential → URA API
  return fetchPrivateTransactions(postalCode, district, propertyType);
}

/**
 * Fetch private residential transactions from URA.
 * Optionally filters by property type category.
 */
async function fetchPrivateTransactions(
  postalCode: string,
  district: string,
  propertyType?: string
): Promise<NearbyTransaction[]> {
  const token = await getUraToken();
  if (!token) {
    console.warn('[URA] No token available — URA_ACCESS_KEY may not be configured');
    return [];
  }

  const accessKey = process.env.URA_ACCESS_KEY!;

  try {
    // URA splits data by district into 4 batches:
    // Batch 1: D01-D07, Batch 2: D08-D14, Batch 3: D15-D21, Batch 4: D22-D28
    const districtNum = parseInt(district.replace('D', ''));
    const batch = districtNum <= 7 ? 1 : districtNum <= 14 ? 2 : districtNum <= 21 ? 3 : 4;

    const res = await fetch(
      `${URA_BASE_URL}?service=PMI_Resi_Transaction&batch=${batch}`,
      {
        headers: {
          AccessKey: accessKey,
          Token: token,
        },
      }
    );

    if (!res.ok) {
      console.error('[URA] API error:', res.status);
      return [];
    }

    const data: UraApiResponse = await res.json();
    if (data.Status !== 'Success' || !data.Result) return [];

    // Filter by district and optionally by property type
    const districtFilter = district.replace('D', '');
    const transactions: NearbyTransaction[] = [];

    // Map our property types to URA property type codes
    // URA types: "Apartment", "Condominium", "Detached House", "Semi-Detached House", "Terrace House", "Executive Condominium"
    const uraTypeFilter = getUraPropertyTypeFilter(propertyType);

    for (const project of data.Result) {
      for (const tx of project.transaction ?? []) {
        if (tx.district !== districtFilter) continue;

        // Filter by property type if specified
        if (uraTypeFilter.length > 0 && !uraTypeFilter.includes(tx.propertyType)) continue;

        const areaSqm = parseFloat(tx.area) || 0;
        const areaSqft = areaSqm * 10.764;
        const price = parseFloat(tx.price) || 0;
        const psf = areaSqft > 0 ? Math.round(price / areaSqft) : 0;

        transactions.push({
          project: project.project || tx.project || 'Unknown',
          street: project.street || tx.street || '',
          price,
          psf,
          area_sqft: Math.round(areaSqft),
          floor_range: tx.floorRange || '',
          contract_date: formatContractDate(tx.contractDate),
          type_of_sale: tx.typeOfSale || '',
          property_type: tx.propertyType || '',
        });
      }
    }

    // Sort by date descending, take top 20
    return transactions
      .sort((a, b) => b.contract_date.localeCompare(a.contract_date))
      .slice(0, 20);
  } catch (error) {
    console.error('[URA] Fetch error:', error);
    return [];
  }
}

/**
 * Map our property type to URA property type filter values.
 */
function getUraPropertyTypeFilter(propertyType?: string): string[] {
  switch (propertyType) {
    case 'condo':
      return ['Condominium', 'Apartment', 'Executive Condominium'];
    case 'landed':
      return ['Detached House', 'Semi-Detached House', 'Terrace House'];
    default:
      // No filter — return all private residential types
      return [];
  }
}

/**
 * Convert URA contract date format (mmyy) to readable date.
 */
function formatContractDate(mmyy: string): string {
  if (!mmyy || mmyy.length < 4) return 'Unknown';
  const month = mmyy.substring(0, 2);
  const year = '20' + mmyy.substring(2, 4);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month) - 1;
  return `${months[monthIdx] ?? month} ${year}`;
}

/**
 * Generate a transaction summary from nearby transactions (template-based).
 */
export function generateTransactionSummary(
  transactions: NearbyTransaction[],
  listingPsf: number | null
): string {
  if (transactions.length === 0) {
    return 'No recent transaction data available for this area.';
  }

  const avgPsf = Math.round(
    transactions.reduce((sum, t) => sum + t.psf, 0) / transactions.length
  );
  const minPsf = Math.min(...transactions.map((t) => t.psf));
  const maxPsf = Math.max(...transactions.map((t) => t.psf));
  const recentDate = transactions[0].contract_date;
  const projectNames = [...new Set(transactions.slice(0, 5).map((t) => t.project))];

  let summary = `Based on ${transactions.length} recent transactions in the area, `;
  summary += `average PSF is $${avgPsf.toLocaleString()} (range: $${minPsf.toLocaleString()}–$${maxPsf.toLocaleString()} psf). `;
  summary += `Most recent transaction: ${recentDate}. `;
  summary += `Nearby projects: ${projectNames.join(', ')}.`;

  if (listingPsf) {
    const diff = ((listingPsf - avgPsf) / avgPsf) * 100;
    if (Math.abs(diff) < 5) {
      summary += ` Asking PSF is in line with recent market transactions.`;
    } else if (diff > 0) {
      summary += ` Asking PSF is ${Math.round(diff)}% above recent area average.`;
    } else {
      summary += ` Asking PSF is ${Math.round(Math.abs(diff))}% below recent area average — competitive positioning.`;
    }
  }

  return summary;
}

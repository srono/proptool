# Requirements Document

## Introduction

Listings Management is the core feature of PropAgent SG that enables Singapore property agents to create, manage, and track property listings across all property types (HDB, Condo, Landed, Commercial). The feature includes CRUD operations for listings, AI-powered area insights using real government transaction data (URA and data.gov.sg), buyer-listing matching via fit signals, and multi-tenant data isolation. Listings serve as the central entity connecting leads, viewings, and deals within the agent's workflow.

## Glossary

- **Listing_System**: The module responsible for creating, reading, updating, and displaying property listings within PropAgent SG
- **Area_Insight_Engine**: The subsystem that generates AI-powered market insights by fetching real transaction data and producing agent-ready talking points
- **URA_Client**: The integration client that authenticates with and fetches private residential transaction data from the URA Data Service API
- **HDB_Data_Client**: The integration client that fetches HDB resale flat prices from the data.gov.sg API
- **Buyer_Matcher**: The subsystem that compares listing attributes against buyer requirements to produce fit signals and watchouts
- **PSF**: Price per square foot — a computed metric derived by dividing asking price by floor area in square feet
- **RLS**: Row-Level Security — Supabase database policy ensuring agents can only access listings belonging to their tenant
- **District**: One of 28 Singapore postal districts (D01–D28) used to categorize property location
- **Tenure**: The leasehold classification of a property — freehold, 99-year leasehold, or 999-year leasehold
- **Exclusivity**: A flag indicating the agent has an exclusive mandate to market the property, with an optional expiry date
- **Listing_Form**: The UI component responsible for capturing and validating listing data during creation and editing

## Requirements

### Requirement 1: Listing Creation

**User Story:** As a property agent, I want to create new property listings with all relevant Singapore property details, so that I can manage my inventory and match properties to buyers.

#### Acceptance Criteria

1. WHEN the agent submits the listing form with valid data, THE Listing_System SHALL persist the listing with status "draft" and redirect the agent to the listings page.
2. THE Listing_Form SHALL require the following fields: address, postal_code, property_type, tenure, and floor_area_sqft.
3. WHEN the property_type is "hdb", THE Listing_Form SHALL display an additional HDB type selector with options: 2 Room, 3 Room, 4 Room, 5 Room, and Executive.
4. THE Listing_System SHALL support listing_type values of "sale" and "rental", and display the appropriate price field (asking_price for sale, asking_rental for rental).
5. WHEN listing_type is "sale" and both asking_price and floor_area_sqft are provided, THE Listing_System SHALL compute and store the PSF value as asking_price divided by floor_area_sqft, rounded to the nearest integer.
6. THE Listing_System SHALL accept optional fields: district (D01–D28), floor, unit_number, completion_year, media_urls, and description.
7. WHEN is_exclusive is set to true, THE Listing_Form SHALL display an exclusivity_expiry date field.
8. IF the agent submits the form with missing required fields, THEN THE Listing_Form SHALL display inline validation errors identifying each missing field.

### Requirement 2: Listing Editing

**User Story:** As a property agent, I want to edit existing listings, so that I can keep property details accurate and up to date.

#### Acceptance Criteria

1. WHEN the agent navigates to the edit page for a listing, THE Listing_Form SHALL pre-populate all fields with the existing listing data.
2. WHEN the agent submits valid changes, THE Listing_System SHALL update the listing record and preserve the existing listing_status.
3. WHEN the asking_price or floor_area_sqft is modified for a sale listing, THE Listing_System SHALL recompute the PSF value.
4. IF the agent changes property_type away from "hdb", THEN THE Listing_System SHALL clear the hdb_type field to null.

### Requirement 3: Listing List View

**User Story:** As a property agent, I want to view all my listings in a filterable grid, so that I can quickly find and manage specific properties.

#### Acceptance Criteria

1. THE Listing_System SHALL display all listings belonging to the agent in a responsive grid layout, ordered by creation date descending.
2. THE Listing_System SHALL provide filter tabs for: All, Sale, Rental, and Draft listings.
3. WHEN the "Sale" tab is active, THE Listing_System SHALL display only listings with listing_type equal to "sale".
4. WHEN the "Rental" tab is active, THE Listing_System SHALL display only listings with listing_type equal to "rental".
5. WHEN the "Draft" tab is active, THE Listing_System SHALL display only listings with listing_status equal to "draft".
6. THE Listing_System SHALL display for each listing card: address, district, property_type, listing_status badge, listing_type badge, price (with "/mo" suffix for rentals), PSF (for sale listings), and the first media photo if available.
7. WHEN no listings exist, THE Listing_System SHALL display an empty state with a prompt to create the first listing.

### Requirement 4: Listing Detail View

**User Story:** As a property agent, I want to view comprehensive listing details including market insights and performance metrics, so that I can make informed decisions and prepare for client conversations.

#### Acceptance Criteria

1. WHEN the agent navigates to a listing detail page, THE Listing_System SHALL display the full property details including address, district, property_type, tenure, floor_area_sqft, price, PSF, and listing status.
2. THE Listing_System SHALL display a photo hero section showing the first media image, or a placeholder graphic when no media is available.
3. THE Listing_System SHALL display performance metrics: days on market (computed from created_at), enquiry count, and scheduled viewing count.
4. THE Listing_System SHALL display a matched buyers count based on buyer requirements that match the listing's district, property_type, and price range.
5. THE Listing_System SHALL provide action buttons for: Share, Edit (navigates to edit page), and Send to buyers.

### Requirement 5: Listing Status Management

**User Story:** As a property agent, I want to track the lifecycle status of each listing, so that I can manage my active inventory and report on outcomes.

#### Acceptance Criteria

1. THE Listing_System SHALL support the following listing statuses: draft, live, under_offer, sold, rented, and withdrawn.
2. WHEN a listing is created, THE Listing_System SHALL assign the initial status of "draft".
3. THE Listing_System SHALL display status badges with distinct visual styling for each status: draft (neutral), live (green), under_offer (amber), sold (brand/aqua), rented (brand/aqua), and withdrawn (red).

### Requirement 6: Area Insights Generation

**User Story:** As a property agent, I want AI-generated area insights for my listings based on real transaction data, so that I can sound knowledgeable during viewings and provide evidence-based advice to clients.

#### Acceptance Criteria

1. WHEN area insights are requested for a listing, THE Area_Insight_Engine SHALL fetch real transaction data from the appropriate government data source based on property_type.
2. WHEN the property_type is "hdb", THE Area_Insight_Engine SHALL fetch transaction data from the data.gov.sg HDB Resale Flat Prices API.
3. WHEN the property_type is "condo" or "landed", THE Area_Insight_Engine SHALL fetch transaction data from the URA PMI_Resi_Transaction API.
4. THE Area_Insight_Engine SHALL generate the following insight components: area_summary, nearby_transactions (up to 10), transaction_summary, agent_talking_points, seller_pitch_snippet, watchouts, and confidence_note.
5. THE Area_Insight_Engine SHALL use a hybrid approach: template-based generation for area_summary and transaction_summary, and LLM generation (GPT-4o-mini) for agent_talking_points and seller_pitch_snippet.
6. IF the OpenAI API key is not configured or the LLM call fails, THEN THE Area_Insight_Engine SHALL fall back to template-based generation for all insight components.
7. THE Area_Insight_Engine SHALL include a confidence_note indicating the number of transactions found and the data source used.
8. WHILE fewer than 10 transactions are available, THE Area_Insight_Engine SHALL indicate limited data in the confidence_note and advise supplementing with market knowledge.

### Requirement 7: Transaction Data Integration (URA)

**User Story:** As a property agent, I want accurate private property transaction data from URA, so that area insights reflect real market conditions.

#### Acceptance Criteria

1. WHEN fetching URA data, THE URA_Client SHALL first obtain a daily authentication token using the URA access key.
2. THE URA_Client SHALL request transaction data from the correct batch based on district number: Batch 1 (D01–D07), Batch 2 (D08–D14), Batch 3 (D15–D21), Batch 4 (D22–D28).
3. THE URA_Client SHALL filter transactions by district and property type, mapping "condo" to URA types Condominium, Apartment, and Executive Condominium, and "landed" to Detached House, Semi-Detached House, and Terrace House.
4. THE URA_Client SHALL convert transaction area from square metres to square feet (multiply by 10.764) and compute PSF for each transaction.
5. THE URA_Client SHALL return the 20 most recent transactions sorted by contract date descending.
6. THE URA_Client SHALL convert URA contract date format (mmyy) to a readable format (e.g., "Sep 2024").
7. IF the URA access key is not configured or the token request fails, THEN THE URA_Client SHALL return an empty transaction list without throwing an error.

### Requirement 8: Transaction Data Integration (HDB)

**User Story:** As a property agent, I want accurate HDB resale transaction data from data.gov.sg, so that area insights for HDB listings reflect real market conditions.

#### Acceptance Criteria

1. WHEN fetching HDB data, THE HDB_Data_Client SHALL query the data.gov.sg datastore_search endpoint with the HDB Resale Flat Prices resource.
2. THE HDB_Data_Client SHALL resolve the HDB town from the listing address or fall back to a district-to-town mapping.
3. WHEN an hdb_type is specified, THE HDB_Data_Client SHALL normalize the flat type (e.g., "4room" to "4 ROOM") and include it as a filter.
4. THE HDB_Data_Client SHALL request up to 20 records sorted by month descending.
5. THE HDB_Data_Client SHALL convert floor area from square metres to square feet and compute PSF for each transaction.
6. IF the data.gov.sg API returns an error or no records, THEN THE HDB_Data_Client SHALL return an empty transaction list without throwing an error.

### Requirement 9: Transaction Summary Generation

**User Story:** As a property agent, I want a concise transaction summary comparing my listing's PSF to the area average, so that I can quickly assess pricing competitiveness.

#### Acceptance Criteria

1. WHEN transactions are available, THE Area_Insight_Engine SHALL compute and display: average PSF, minimum PSF, maximum PSF, most recent transaction date, and nearby project names.
2. WHEN the listing has an asking PSF and the area average PSF is available, THE Area_Insight_Engine SHALL compare the two and indicate whether the asking PSF is in line (within 5%), above, or below the area average, with the percentage difference.
3. IF no transactions are available, THEN THE Area_Insight_Engine SHALL display "No recent transaction data available for this area."

### Requirement 10: Buyer Fit Signal Generation

**User Story:** As a property agent, I want to see how well a listing matches a buyer's requirements, so that I can prioritize which buyers to contact for each listing.

#### Acceptance Criteria

1. WHEN comparing a listing to buyer requirements, THE Buyer_Matcher SHALL evaluate: district match, property_type match, budget match, and timeline urgency.
2. WHEN the listing district matches one of the buyer's preferred districts, THE Buyer_Matcher SHALL produce a positive fit signal indicating the district match.
3. WHEN the listing price exceeds the buyer's maximum budget, THE Buyer_Matcher SHALL produce a watchout indicating the percentage above budget.
4. WHEN the listing price is below the buyer's minimum budget, THE Buyer_Matcher SHALL produce a positive fit signal indicating room for negotiation.
5. WHEN the buyer's timeline is "Within 3 months", THE Buyer_Matcher SHALL produce a positive fit signal indicating urgency.
6. WHEN the listing district does not match any of the buyer's preferred districts, THE Buyer_Matcher SHALL produce a watchout listing the buyer's preferred districts.

### Requirement 11: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want my listings to be private to my agency, so that competing agents cannot view my inventory.

#### Acceptance Criteria

1. THE Listing_System SHALL enforce Row-Level Security policies ensuring agents can only query listings belonging to their own tenant_id.
2. WHEN a listing is created, THE Listing_System SHALL automatically associate the listing with the authenticated agent's tenant_id and agent_id.
3. THE Listing_System SHALL scope all listing queries (list, detail, edit) to the authenticated agent's tenant.

### Requirement 12: LLM-Powered Talking Points

**User Story:** As a property agent, I want AI-generated talking points specific to my listing's market context, so that I can sound knowledgeable during viewings without extensive manual research.

#### Acceptance Criteria

1. THE Area_Insight_Engine SHALL send a structured prompt to GPT-4o-mini including: property details (address, district, type, tenure, size, price, PSF), transaction context summary, and recent nearby transactions.
2. THE Area_Insight_Engine SHALL instruct the LLM to produce: 3 talking points for viewings, a 2–3 sentence seller pitch suitable for WhatsApp sharing, and 0–2 watchouts representing potential buyer objections.
3. THE Area_Insight_Engine SHALL constrain the LLM to: use Singapore property terminology, remain factual, avoid price predictions, and avoid guaranteeing returns.
4. THE Area_Insight_Engine SHALL parse the LLM response as JSON and extract talking_points, seller_pitch, and watchouts fields.
5. IF the LLM response cannot be parsed as valid JSON, THEN THE Area_Insight_Engine SHALL fall back to template-based generation.

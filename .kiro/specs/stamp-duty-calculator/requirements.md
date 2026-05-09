# Requirements Document

## Introduction

The Stamp Duty Calculator is a client-side tool within PropAgent SG that enables Singapore property agents to estimate Buyer's Stamp Duty (BSD) and Additional Buyer's Stamp Duty (ABSD) for residential property purchases. The calculator accounts for buyer profile (citizen, PR, foreigner, entity, trust), property count, and property type to determine eligibility and compute duty amounts using progressive BSD bands and flat-rate ABSD percentages. It provides agents with a quick reference during client consultations, displaying a band-by-band breakdown and total payable duty. The tool is accessible from the dashboard and the /tools/stamp-duty route.

## Glossary

- **Calculator**: The client-side stamp duty calculation module rendered at /tools/stamp-duty
- **BSD**: Buyer's Stamp Duty — a progressive tax applied to all residential property purchases in Singapore, computed across tiered price bands
- **ABSD**: Additional Buyer's Stamp Duty — a flat-rate tax applied on top of BSD, determined by buyer profile and property count
- **Buyer_Profile**: The residency or entity classification of the purchaser — one of: citizen, pr, foreigner, entity, or trust
- **Property_Count**: The ordinal position of the property being purchased relative to the buyer's existing holdings — one of: 1st, 2nd, or 3rd_plus
- **Property_Type**: The classification of the property — one of: hdb, condo, landed, or commercial
- **Eligibility_Engine**: The subsystem that determines whether a given Buyer_Profile and Property_Type and Property_Count combination is eligible, conditional, or restricted
- **BSD_Band**: A price range with an associated tax rate used in the progressive BSD calculation
- **ABSD_Rate**: The flat percentage applied to the full purchase price for ABSD, determined by Buyer_Profile and Property_Count
- **Eligibility_Status**: The result of an eligibility check — one of: eligible (🟢), conditional (🟡), or restricted (🔴)
- **Purchase_Price**: The total agreed price of the property in Singapore Dollars (S$)

## Requirements

### Requirement 1: BSD Calculation

**User Story:** As a property agent, I want to calculate Buyer's Stamp Duty using progressive bands, so that I can give clients an accurate BSD estimate during consultations.

#### Acceptance Criteria

1. WHEN a valid Purchase_Price is provided, THE Calculator SHALL compute BSD by applying progressive BSD_Band rates to successive portions of the Purchase_Price.
2. THE Calculator SHALL apply the following BSD_Band rates (effective 15 Feb 2023): 1% on the first $180,000; 2% on the next $180,000; 3% on the next $640,000; 4% on the next $500,000; 5% on the next $1,500,000; 6% on the remainder above $3,000,000.
3. WHEN the Purchase_Price falls within a BSD_Band, THE Calculator SHALL tax only the portion of the price within that band and apply no duty for higher bands.
4. THE Calculator SHALL produce a BSD breakdown containing each applicable band with its band_min, band_max, rate_pct, taxable_amount, and duty_amount.
5. THE Calculator SHALL compute the total BSD as the sum of all individual band duty_amounts.

### Requirement 2: ABSD Calculation

**User Story:** As a property agent, I want to calculate Additional Buyer's Stamp Duty based on buyer profile and property count, so that I can inform clients of their full stamp duty obligations.

#### Acceptance Criteria

1. WHEN a valid Purchase_Price, Buyer_Profile, and Property_Count are provided, THE Calculator SHALL compute ABSD as Purchase_Price multiplied by the applicable ABSD_Rate percentage.
2. THE Calculator SHALL apply the following ABSD_Rates (effective 27 April 2023): citizen 1st property 0%, citizen 2nd property 20%, citizen 3rd_plus property 30%; PR 1st property 5%, PR 2nd property 30%, PR 3rd_plus property 35%; foreigner all properties 60%; entity all properties 65%; trust all properties 65%.
3. WHEN the ABSD_Rate is 0%, THE Calculator SHALL set the ABSD amount to zero and display the rate as 0%.

### Requirement 3: Total Duty Computation

**User Story:** As a property agent, I want to see the combined total of BSD and ABSD, so that I can communicate the full stamp duty cost to clients in a single figure.

#### Acceptance Criteria

1. WHEN BSD and ABSD have been computed, THE Calculator SHALL calculate total_duty as bsd_amount plus absd_amount.
2. THE Calculator SHALL display BSD, ABSD (with rate percentage), and total duty as three distinct values in the results section.

### Requirement 4: Eligibility Check

**User Story:** As a property agent, I want to verify whether a buyer is eligible to purchase a specific property type, so that I can advise clients on restrictions before they commit.

#### Acceptance Criteria

1. WHEN a Buyer_Profile, Property_Type, and Property_Count combination is evaluated, THE Eligibility_Engine SHALL return an Eligibility_Status of eligible, conditional, or restricted.
2. WHEN the Eligibility_Status is restricted, THE Eligibility_Engine SHALL provide a restriction_note explaining why the purchase is not allowed.
3. WHEN the Eligibility_Status is conditional, THE Eligibility_Engine SHALL provide a note describing the conditions that must be met.
4. THE Eligibility_Engine SHALL enforce the following restrictions: foreigners cannot purchase HDB or landed property; entities cannot purchase HDB or landed property; trusts cannot purchase HDB or landed property; PRs are limited to resale HDB only and require SLA approval for landed property.
5. THE Eligibility_Engine SHALL indicate Eligibility_Status using visual badges: 🟢 for eligible, 🟡 for conditional, 🔴 for restricted.
6. THE Eligibility_Engine SHALL cover all combinations of five Buyer_Profiles, four Property_Types, and three Property_Counts (60 total combinations).

### Requirement 5: User Input and Interaction

**User Story:** As a property agent, I want an intuitive input form for the stamp duty calculator, so that I can quickly enter property details and get results during client meetings.

#### Acceptance Criteria

1. THE Calculator SHALL provide an input field for Purchase_Price that accepts numeric values formatted with commas.
2. THE Calculator SHALL provide a dropdown selector for Buyer_Profile with options: Singapore Citizen, Permanent Resident (PR), Foreigner, Entity / Company, and Trust.
3. THE Calculator SHALL provide a dropdown selector for Property_Count with options: 1st Property, 2nd Property, and 3rd or more.
4. WHEN the agent clicks the Calculate button, THE Calculator SHALL validate that Purchase_Price is a positive number before performing the calculation.
5. IF the agent submits an empty or non-numeric Purchase_Price, THEN THE Calculator SHALL not perform the calculation and shall retain the current form state.

### Requirement 6: Results Display

**User Story:** As a property agent, I want to see a detailed breakdown of the stamp duty calculation, so that I can explain each component to clients transparently.

#### Acceptance Criteria

1. WHEN a calculation is completed, THE Calculator SHALL display a results section containing BSD amount, ABSD amount with rate percentage, and total duty amount.
2. THE Calculator SHALL display a BSD breakdown table showing each band's range, rate percentage, taxable amount, and duty amount.
3. THE Calculator SHALL format all monetary values in Singapore Dollar format with comma separators and no decimal places.
4. THE Calculator SHALL display the STAMP_DUTY_DISCLAIMER text: "This is an estimate only. Consult a lawyer or IRAS for definitive stamp duty obligations."
5. WHILE no calculation has been performed, THE Calculator SHALL not display the results section.

### Requirement 7: Navigation and Accessibility

**User Story:** As a property agent, I want to access the stamp duty calculator quickly from the dashboard, so that I can use it without navigating through multiple menus.

#### Acceptance Criteria

1. THE Calculator SHALL be accessible at the route /tools/stamp-duty within the dashboard layout.
2. THE Calculator SHALL be rendered as a client-side component to support interactive state management without server round-trips.
3. THE Calculator SHALL display a page title of "Stamp Duty Calculator" and a subtitle describing its purpose.

### Requirement 8: Rate Versioning

**User Story:** As a property agent, I want the calculator to use the correct stamp duty rates for the applicable period, so that estimates remain accurate when government rates change.

#### Acceptance Criteria

1. THE Calculator SHALL associate each BSD_Band rate with an effective_from date.
2. THE Calculator SHALL associate each ABSD_Rate with an effective_from date.
3. THE Calculator SHALL support rate records with a null effective_to date to indicate the rate is currently active.
4. WHEN rates are updated, THE Calculator SHALL use the rates where effective_from is the most recent date on or before the transaction date and effective_to is null or after the transaction date.

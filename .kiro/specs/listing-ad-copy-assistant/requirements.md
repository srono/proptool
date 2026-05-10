# Requirements Document

## Introduction

The Listing Ad Copy Assistant enables property agents to generate high-quality, compliance-aware social media ad copy for a specific listing. The feature produces channel-ready marketing text for Facebook, Instagram, WhatsApp, and generic social platforms. Agents select a listing, configure platform, tone, length, and audience angle, and receive multiple editable copy variants along with a compliance checklist. The generated copy is designed for copy-and-paste use without requiring direct integration to ad platforms. The feature enforces Singapore property advertising accuracy rules and Meta housing ad anti-discrimination constraints by flagging risky phrases and requiring agent verification before publishing.

## Glossary

- **Ad_Copy_Assistant**: The feature module that generates marketing copy from listing data, accessible from the Listing Detail Page or the Tools Menu
- **Listing_Detail_Page**: The page at /listings/{id} that displays all information about a specific listing including photos, pricing, area insights, and performance metrics
- **Marketing_Section**: A new block on the Listing_Detail_Page containing marketing actions: Generate Ad Copy, Generate Flyer, Copy Listing Link, View Landing Page
- **Generation_Form**: The input controls panel where the agent selects platform, tone, length, CTA style, audience angle, and toggles before generating copy
- **Copy_Output_Panel**: The panel displaying generated copy variants organized by tabs (Facebook, Instagram, WhatsApp, Short Version)
- **Compliance_Checker**: The subsystem that scans generated copy for risky phrases including unsupported superlatives, unverifiable claims, misleading statements, and discriminatory language
- **Compliance_Warning**: A flagged item displayed to the agent indicating a phrase in the generated copy that requires verification or removal
- **Copy_Variant**: A single generated text output such as a full caption, short headline, CTA line, or WhatsApp promo text
- **Marketing_Asset_Record**: A row in the listing_marketing_assets table storing a saved copy variant with metadata including platform, tone, compliance flags, and creation timestamp
- **Listing_Picker**: A search interface in the Tools Menu entry point allowing the agent to find a listing by address, project name, or status before generating copy
- **Pre_Publish_Reminder**: A persistent notice displayed with generated output stating "Review and verify all factual statements before publishing"
- **AI_Model_Config**: The environment-variable-based configuration that determines which AI model (e.g., gpt-4.1-mini, gpt-4.1) is used for each AI-powered feature, allowing cost and performance optimization per task

## Requirements

### Requirement 1: Access Ad Copy Assistant from Listing Detail

**User Story:** As a property agent, I want to access the Ad Copy Assistant directly from a listing's detail page, so that I can generate marketing copy without navigating away from the listing context.

#### Acceptance Criteria

1. THE Listing_Detail_Page SHALL display a Marketing_Section block positioned as the last item in the left column, after the Area Insight section.
2. WHEN the agent taps the "Generate Ad Copy" button, THE System SHALL navigate to the Ad_Copy_Assistant with the current listing's ID passed as context so that the listing is pre-selected on arrival.
3. WHEN the agent taps the "Generate Ad Copy" button, THE Ad_Copy_Assistant page SHALL load within 1 navigation step (single tap) from the Listing_Detail_Page.
4. THE Marketing_Section SHALL display buttons for "Generate Flyer", "Copy Listing Link", and "View Landing Page" in a visually disabled state with no interactive behavior.
5. IF the listing has a status of "draft", THEN THE "Generate Ad Copy" button SHALL remain visible but display a disabled state indicating that the listing must be published before generating ad copy.

### Requirement 2: Access Ad Copy Assistant from Tools Menu

**User Story:** As a property agent, I want to access the Ad Copy Assistant from the Tools Menu, so that I can generate ad copy for any listing without first navigating to that listing's detail page.

#### Acceptance Criteria

1. THE Tools Menu SHALL include an "Ad Copy Assistant" item positioned after "Market Comparables" in the menu order.
2. WHEN the agent selects "Ad Copy Assistant" from the Tools Menu, THE Ad_Copy_Assistant SHALL display the Listing_Picker as the first step.
3. THE Listing_Picker SHALL allow the agent to search for a listing by address, project name, or listing status, requiring a minimum of 2 characters before filtering results, and displaying at most 20 matching listings ordered by most recently created.
4. IF the Listing_Picker search returns no matching listings, THEN THE Listing_Picker SHALL display a message indicating no listings match the current search criteria.
5. WHEN the agent selects a listing from the Listing_Picker, THE Ad_Copy_Assistant SHALL load the selected listing's data and display the Generation_Form.
6. IF the selected listing's data fails to load, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the listing could not be loaded and allow the agent to retry or select a different listing.

### Requirement 3: Configure Generation Parameters

**User Story:** As a property agent, I want to choose platform, tone, length, and other options before generating copy, so that the output matches my intended marketing channel and style.

#### Acceptance Criteria

1. THE Generation_Form SHALL display a platform selector with options: Facebook, Instagram, WhatsApp promo, and Generic social.
2. THE Generation_Form SHALL display a tone selector with options: Professional, Premium, Friendly, Urgency, Investor-focused, and Family-focused.
3. THE Generation_Form SHALL display a length selector with options: Short (up to 80 words), Medium (81–150 words), and Long (151–300 words).
4. THE Generation_Form SHALL display a CTA style selector with options: "Enquire now", "WhatsApp now", "Book a viewing", and "Request details".
5. THE Generation_Form SHALL display an optional target audience angle selector with options: Family, Upgrader, Investor, Tenant, and First-time buyer.
6. THE Generation_Form SHALL display an "Avoid emojis" toggle, defaulting to off (emojis allowed).
7. THE Generation_Form SHALL display an "Include hashtags" toggle, defaulting to on (hashtags included).
8. THE Generation_Form SHALL pre-select default values of Facebook for platform, Professional for tone, Medium for length, and "Enquire now" for CTA style so the agent can generate copy immediately without configuring every option.
9. IF the agent has not selected a value for platform, tone, length, or CTA style, THEN THE Generation_Form SHALL disable the generate action and display an inline indication identifying which required fields are missing.
10. THE Generation_Form SHALL visually distinguish required selectors (platform, tone, length, CTA style) from optional selectors (target audience angle, emojis toggle, hashtags toggle) by displaying a required-field indicator on each required selector.

### Requirement 4: Generate Ad Copy from Listing Data

**User Story:** As a property agent, I want the system to generate ad copy using my listing's structured data, so that I get accurate, channel-ready marketing text without writing from scratch.

#### Acceptance Criteria

1. WHEN the agent clicks the "Generate" button on the Generation_Form, THE Ad_Copy_Assistant SHALL use the following listing fields as input to the copy generator: address, project name, postal code, district, property type, listing type, price or asking rental, floor area, bedrooms, bathrooms, tenure, TOP year, key amenities, nearby highlights, listing description, and agent name with contact details.
2. IF one or more of the listing fields (excluding address, property type, listing type, and price or asking rental) are empty or null, THEN THE Ad_Copy_Assistant SHALL proceed with generation using only the available fields and omit references to missing data in the generated copy.
3. IF any of the mandatory listing fields (address, property type, listing type, and price or asking rental) are empty or null, THEN THE Ad_Copy_Assistant SHALL disable the Generate button and display a validation message indicating which mandatory fields are missing.
4. WHEN the agent clicks the "Generate" button, THE Ad_Copy_Assistant SHALL produce the generated output within 10 seconds and display a loading indicator during generation.
5. IF the generation process does not complete within 15 seconds, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the generation timed out and re-enable the Generate button.
6. IF the generation process fails due to a non-timeout error (such as network failure, rate limiting, or content policy rejection), THEN THE Ad_Copy_Assistant SHALL display an error message indicating generation failed and re-enable the Generate button.
7. WHEN generation completes successfully, THE Ad_Copy_Assistant SHALL generate at minimum the following Copy_Variant types: a primary ad copy (full caption) of no more than 2000 characters, a short headline of no more than 100 characters, a CTA line of no more than 150 characters, a short-form version of no more than 280 characters, an Instagram caption version of no more than 2200 characters, and a WhatsApp promo text version of no more than 1000 characters.
8. WHERE the "Include hashtags" toggle is enabled, THE Ad_Copy_Assistant SHALL generate a hashtag set of between 5 and 15 hashtags relevant to the listing's property type, district, and listing type.
9. WHERE the tenant configuration requires agent attribution, THE Ad_Copy_Assistant SHALL include the agent's name and contact number in the generated copy.
10. WHERE the tenant configuration includes a CEA registration number requirement, THE Ad_Copy_Assistant SHALL include the agent's CEA registration number in the generated copy.

### Requirement 5: Display Generated Copy Variants

**User Story:** As a property agent, I want to see the generated copy organized by platform and variant type, so that I can quickly find and use the right version for each channel.

#### Acceptance Criteria

1. THE Copy_Output_Panel SHALL organize generated variants into tabs: Facebook, Instagram, WhatsApp, and Short Version, where each tab contains only the Copy_Variants generated for that platform or format.
2. WHEN generation completes, THE Copy_Output_Panel SHALL display the tab corresponding to the selected platform as the active tab. IF the selected platform is "Generic social", THEN THE Copy_Output_Panel SHALL display the Facebook tab as the active tab by default.
3. THE Copy_Output_Panel SHALL display each Copy_Variant with a label indicating its type (Primary Caption, Short Headline, CTA Line, Hashtags, Instagram Caption, or WhatsApp Promo Text), and each variant SHALL be rendered in its own individually editable text area.
4. THE Copy_Output_Panel SHALL display the Pre_Publish_Reminder as a notice fixed at the top of the output area that remains visible when the agent switches between tabs or scrolls within a tab.
5. THE Copy_Output_Panel SHALL render each Copy_Variant's text in an editable text area with a maximum length of 3000 characters, so the agent can modify content before copying or saving.
6. WHEN the agent switches between tabs, THE Copy_Output_Panel SHALL preserve any edits the agent has made to Copy_Variants in other tabs.

### Requirement 6: Compliance Checking

**User Story:** As a property agent, I want the system to flag risky or non-compliant phrases in generated copy, so that I avoid publishing misleading or discriminatory content that violates Singapore advertising rules or Meta housing ad policies.

#### Acceptance Criteria

1. WHEN copy is generated, THE Compliance_Checker SHALL scan the output for unsupported superlatives including "best deal", "guaranteed return", "highest yield", "number one", and "top performer" and flag each occurrence as a Compliance_Warning.
2. WHEN copy is generated, THE Compliance_Checker SHALL scan the output for misleading claims and flag each occurrence as a Compliance_Warning, where misleading claims are defined as: promises of specific property appreciation rates, guaranteed rental return percentages, assured financing approval outcomes, or urgency language implying artificial scarcity such as "last unit", "selling fast", or "limited time only" without a verifiable basis.
3. WHEN copy is generated, THE Compliance_Checker SHALL scan the output for language that targets or excludes audiences based on Meta housing ad protected categories — including race, ethnicity, national origin, religion, age, sex, sexual orientation, family status, or disability — and flag each occurrence as a Compliance_Warning.
4. WHEN copy is generated, THE Compliance_Checker SHALL scan the output for factual statements that require verification — including numeric walking-distance claims, school proximity claims specifying distance or travel time, MRT station proximity claims specifying distance or travel time, and any stated rental yield percentage — and flag each as a Compliance_Warning with the note "Verify before publishing."
5. WHEN one or more Compliance_Warning items are detected, THE Copy_Output_Panel SHALL display the warnings in a compliance notes section positioned directly below the generated copy, with each warning quoting the flagged phrase and stating the compliance rule category it violates.
6. IF no Compliance_Warning items are detected, THEN THE Copy_Output_Panel SHALL display a confirmation message "No compliance issues detected" in the compliance notes section.
7. IF the Compliance_Checker fails to complete the scan within 10 seconds or encounters an error, THEN THE Copy_Output_Panel SHALL display the generated copy with a warning indicating that compliance checking could not be completed and advising manual review before publishing.

### Requirement 7: Copy to Clipboard

**User Story:** As a property agent, I want to copy generated ad copy to my clipboard with one click, so that I can paste it directly into my social media platform.

#### Acceptance Criteria

1. THE Copy_Output_Panel SHALL display a "Copy" button visually associated with each Copy_Variant, positioned within 8px of the variant's content boundary.
2. WHILE a Copy_Variant is still being generated, THE Copy_Output_Panel SHALL disable the "Copy" button for that variant.
3. WHEN the agent clicks the "Copy" button for a Copy_Variant, THE Ad_Copy_Assistant SHALL copy the plain-text content of that variant (preserving line breaks but excluding any rich formatting) to the system clipboard.
4. WHEN the copy-to-clipboard operation succeeds, THE Ad_Copy_Assistant SHALL replace the "Copy" button label with a confirmation indicator (e.g., "Copied!") for 2 seconds, then revert to the original "Copy" label.
5. IF the copy-to-clipboard operation fails, THEN THE Ad_Copy_Assistant SHALL display an inline error message indicating the failure and suggesting manual copy, visible for 5 seconds adjacent to the clicked button.
6. IF the browser does not support or has denied clipboard access, THEN THE Ad_Copy_Assistant SHALL display the Copy_Variant text in a selectable text area to allow manual selection and copying.

### Requirement 8: Regenerate with Different Parameters

**User Story:** As a property agent, I want to regenerate copy with a different tone or settings, so that I can explore multiple angles for the same listing without starting over.

#### Acceptance Criteria

1. THE Generation_Form SHALL remain visible and editable after copy is generated, allowing the agent to change any parameter.
2. WHEN the agent clicks "Generate" after copy has already been generated, THE Ad_Copy_Assistant SHALL produce new copy variants using the current parameter values and replace the previous output in the Copy_Output_Panel.
3. IF the agent has unsaved manual edits in the Copy_Output_Panel when clicking "Generate" again, THEN THE Ad_Copy_Assistant SHALL display a confirmation prompt warning that unsaved changes will be lost and allow the agent to cancel or proceed.
4. WHILE a regeneration is in progress, THE Ad_Copy_Assistant SHALL display a loading indicator and disable the Generate button to prevent duplicate requests.
5. IF the regeneration does not complete within 15 seconds, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the generation timed out, re-enable the Generate button, and preserve the Generation_Form's current parameter selections.
6. IF the regeneration fails due to a service error, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the failure, re-enable the Generate button, and retain the previously generated output in the Copy_Output_Panel.

### Requirement 9: Save Generated Copy to Listing

**User Story:** As a property agent, I want to save generated copy variants to the listing record, so that I can retrieve them later and track which marketing assets I have created.

#### Acceptance Criteria

1. THE Copy_Output_Panel SHALL display a "Save" button for each Copy_Variant that contains content_text of at least 1 character.
2. WHEN the agent clicks the "Save" button for a Copy_Variant, THE Ad_Copy_Assistant SHALL persist a new Marketing_Asset_Record associated with the listing containing the following data: tenant_id, listing_id, asset_type (ad_copy, caption, headline, or whatsapp_text), platform, tone, target_angle, content_text (the current text including any manual edits, maximum 5000 characters), compliance_flags (array of any active warnings), generated_by set to "ai", saved_by set to the current user's ID, and created_at set to the current timestamp.
3. WHILE the save operation is in progress, THE Ad_Copy_Assistant SHALL disable the Save button and display a loading indicator to prevent duplicate submissions.
4. WHEN the save operation succeeds, THE Ad_Copy_Assistant SHALL replace the loading indicator with a "Saved" confirmation indicator adjacent to the Save button.
5. IF the save operation fails, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the save failed and suggesting the agent retry, and SHALL re-enable the Save button.
6. THE Ad_Copy_Assistant SHALL prevent duplicate saves by disabling the Save button after a successful save until the content_text is modified (any character addition, deletion, or change from the last saved version).

### Requirement 10: Mark Copy as Used

**User Story:** As a property agent, I want to mark a saved copy variant as used for a campaign or post, so that I can track which marketing assets have been published.

#### Acceptance Criteria

1. WHILE a Marketing_Asset_Record has been saved and does not have a published_at value, THE Ad_Copy_Assistant SHALL display a "Mark as Used" action for that variant.
2. WHEN the agent clicks "Mark as Used", THE Ad_Copy_Assistant SHALL update the Marketing_Asset_Record with the published_at timestamp set to the current time and display the "Used" badge on that variant within 2 seconds.
3. WHILE a Marketing_Asset_Record has a published_at value, THE Ad_Copy_Assistant SHALL display a "Used" badge on that variant indicating it has been published and SHALL hide the "Mark as Used" action.
4. IF the "Mark as Used" action fails due to a system or network error, THEN THE Ad_Copy_Assistant SHALL display an error message indicating the variant could not be marked as used and SHALL retain the "Mark as Used" action in its original enabled state.

### Requirement 11: View Saved Marketing Assets for a Listing

**User Story:** As a property agent, I want to view previously saved ad copy for a listing, so that I can reuse or reference past marketing content.

#### Acceptance Criteria

1. THE Marketing_Section on the Listing_Detail_Page SHALL display a count of saved Marketing_Asset_Records for the current listing, showing "0" when no records exist.
2. WHEN the agent opens the Ad_Copy_Assistant for a listing that has saved Marketing_Asset_Records, THE Ad_Copy_Assistant SHALL display a "Saved Copy" tab or section listing previously saved variants, sorted by creation date in descending order (most recent first).
3. THE Ad_Copy_Assistant SHALL display each saved Marketing_Asset_Record with its platform, tone, creation date, content_text (the full saved copy), and a "Used" badge if the record has a published_at value.
4. THE Ad_Copy_Assistant SHALL display a maximum of 50 saved Marketing_Asset_Records per listing, with the most recent records shown first.
5. IF the agent opens the Ad_Copy_Assistant for a listing that has no saved Marketing_Asset_Records, THEN THE Ad_Copy_Assistant SHALL display an empty state message indicating no saved copy exists for this listing.

### Requirement 12: Configurable AI Model Selection

**User Story:** As a system administrator, I want to configure which AI model is used for ad copy generation, so that I can optimize cost and processing time by assigning appropriate models to different tasks.

#### Acceptance Criteria

1. THE Ad_Copy_Assistant SHALL read the AI model identifier from an environment variable (e.g., AD_COPY_MODEL) to determine which model to use for copy generation.
2. IF the AD_COPY_MODEL environment variable is not set, THEN THE Ad_Copy_Assistant SHALL fall back to a default model identifier defined in the application configuration.
3. THE application configuration SHALL support specifying different AI model identifiers for different AI-powered features (e.g., ad copy generation, reply suggestions) so that each task can use a model appropriate to its complexity and cost requirements.
4. WHEN the configured model identifier is invalid or the model service returns an authentication or transient error, THE Ad_Copy_Assistant SHALL display an error message indicating the AI service is unavailable and log the error details for debugging without exposing internal configuration to the agent.

### Requirement 13: Mobile Responsiveness

**User Story:** As a property agent, I want to use the Ad Copy Assistant on my mobile device, so that I can generate and copy marketing text while on the go.

#### Acceptance Criteria

1. WHILE the viewport width is less than 768px, THE Ad_Copy_Assistant SHALL render the Generation_Form and Copy_Output_Panel in a single-column stacked layout with the Generation_Form above the Copy_Output_Panel, where each panel occupies the full available width.
2. WHILE the viewport width is 768px or wider, THE Ad_Copy_Assistant SHALL render the Generation_Form and Copy_Output_Panel in a side-by-side layout with the Generation_Form on the left and the Copy_Output_Panel on the right.
3. WHILE the viewport width is less than 768px, THE Copy_Output_Panel tabs SHALL be horizontally scrollable without wrapping to a second line, and a visual indicator (such as a fade or arrow) SHALL signal when additional tabs are available beyond the visible area.
4. THE Ad_Copy_Assistant SHALL render all interactive elements (buttons, form inputs, and tabs) with a minimum touch target size of 44x44px.
5. WHILE the viewport width is less than 768px, THE Ad_Copy_Assistant SHALL render all form input fields at a minimum height of 44px and a font size of at least 16px to prevent automatic zoom on focus in mobile browsers.

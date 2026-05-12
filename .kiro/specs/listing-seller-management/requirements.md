# Requirements Document

## Introduction

This feature adds seller management to listings. Currently, listings exist as standalone property records with no link to the property owner/seller. Buyers are connected to listings indirectly through leads, viewings, and buyer requirements, but there is no equivalent seller relationship. This feature introduces a direct seller-contact association on each listing, enables communication with sellers through the existing messaging system, and supports contacts who are both buyers and sellers (e.g., house upgrade scenarios).

## Glossary

- **Listing**: A property record in the system representing a property for sale or rental
- **Contact**: A permanent person-level record storing identity, communication details, and consent information
- **Seller**: A contact who owns or is authorized to sell/rent a property linked to a listing
- **Lead**: An opportunity-level record linked to a contact, categorized by role (buyer, seller, landlord, tenant, co_broke, nurture)
- **Seller_Lead**: A lead with `lead_category` set to 'seller', representing the selling opportunity for a contact
- **Listing_Form**: The UI form used to create or edit a listing
- **Listing_Detail_Page**: The UI page displaying full listing information and related data
- **Message_System**: The existing communication system supporting WhatsApp, SMS, email, and internal notes
- **Dual_Role_Contact**: A contact who has both buyer and seller leads simultaneously (e.g., selling one property to buy another)

## Requirements

### Requirement 1: Seller-Listing Association

**User Story:** As an agent, I want to attach a seller contact to a listing, so that I can track who owns the property and quickly access their details.

#### Acceptance Criteria

1. WHEN a listing is created or edited, THE Listing_Form SHALL provide a seller contact selection field that allows the agent to search existing contacts by name or phone number, displaying up to 20 matching results after the agent enters at least 1 character
2. WHEN a listing is created or edited, THE Listing_Form SHALL allow the agent to create a new contact inline by providing at minimum a full name and phone number, and then associate that new contact as the seller
3. WHEN a listing is edited, THE Listing_Form SHALL allow the agent to change the seller contact to a different contact or remove the seller contact association, clearing the displayed selection
4. THE Listing SHALL store a reference to at most one seller contact (zero or one), where the seller contact field is optional
5. WHEN a seller contact is selected, THE Listing_Form SHALL display the selected contact's full name and phone number as confirmation of the selection
6. IF the seller contact field is left empty during listing creation or edit, THEN THE Listing_Form SHALL allow the listing to be saved without a seller contact
7. IF the contact referenced as seller is deleted from the system, THEN THE Listing SHALL clear the seller reference and THE Listing_Detail_Page SHALL display a prompt to attach a new seller

### Requirement 2: Seller Lead Auto-Creation

**User Story:** As an agent, I want a seller lead to be automatically created when I attach a seller to a listing, so that the selling opportunity is tracked in the pipeline without manual effort.

#### Acceptance Criteria

1. WHEN a contact is attached as a seller to a listing, THE System SHALL create a seller lead with `lead_category` set to 'seller', `origin_listing_id` set to the listing ID, `is_active` set to true, and `status` set to 'new_lead'
2. IF the contact already has a seller lead where `is_active` is true and `origin_listing_id` matches the same listing, THEN THE System SHALL reuse the existing lead instead of creating a duplicate
3. WHEN a seller is removed from a listing, THE System SHALL retain the seller lead record without changing its `status` or `is_active` fields
4. IF the system fails to create the seller lead during seller attachment, THEN THE System SHALL display an error message indicating the lead could not be created and SHALL still save the seller-listing association
5. WHEN the seller on a listing is changed from one contact to another, THE System SHALL retain the previous seller's lead record unchanged and SHALL create a new seller lead for the newly attached contact following criterion 1

### Requirement 3: Seller Information Display on Listing Detail

**User Story:** As an agent, I want to see the seller's contact information on the listing detail page, so that I can quickly reach the property owner without navigating away.

#### Acceptance Criteria

1. WHEN a listing has a seller contact attached, THE Listing_Detail_Page SHALL display a seller card showing the contact's full name, phone number, and email; IF the contact's email is null, THEN the seller card SHALL omit the email field and display only the full name and phone number
2. WHEN a listing has a seller contact attached, THE Listing_Detail_Page SHALL display a link to the seller's contact profile that navigates to the contact's detail page
3. WHEN a listing has no seller contact attached, THE Listing_Detail_Page SHALL display a call-to-action element that allows the agent to initiate the seller attachment flow
4. WHEN the seller contact has a seller lead where `is_active` is true and `origin_listing_id` matches the current listing, THE Listing_Detail_Page SHALL display that lead's pipeline stage label
5. IF the seller contact has no seller lead where `is_active` is true and `origin_listing_id` matches the current listing, THEN THE Listing_Detail_Page SHALL omit the pipeline stage display from the seller card

### Requirement 4: Seller Communication via Existing Channels

**User Story:** As an agent, I want to message the seller directly from the listing page, so that I can communicate updates about viewings, offers, and market feedback without switching context.

#### Acceptance Criteria

1. WHEN a listing has a seller contact attached, THE Listing_Detail_Page SHALL display a "Message Seller" action that navigates the agent to the messaging interface for that seller's contact_id
2. IF the seller contact attached to a listing has no phone number, THEN THE Listing_Detail_Page SHALL disable the "Message Seller" action and display an indicator that a phone number is required
3. WHEN the agent sends a message to the seller from the listing context, THE Message_System SHALL associate the message with the seller's contact_id
4. IF the seller contact has an active seller lead for the listing, THEN THE Message_System SHALL associate the message with that seller lead's lead_id
5. IF the message fails to send, THEN THE Message_System SHALL display the message with a failed status indicator and allow the agent to retry sending

### Requirement 5: Dual-Role Contact Support

**User Story:** As an agent, I want a single contact to be both a buyer and a seller simultaneously, so that I can manage house upgrade clients without creating duplicate contact records.

#### Acceptance Criteria

1. THE System SHALL allow a contact to be attached as a seller to multiple listings while simultaneously having active buyer leads, with no system-imposed limit on the number of concurrent seller associations per contact
2. WHEN viewing a Dual_Role_Contact's profile, THE System SHALL display both buyer leads and seller leads in the contact's lead list, with each lead labeled by its lead_category so the agent can distinguish buyer leads from seller leads
3. WHEN an agent advances the pipeline stage of a buyer lead belonging to a Dual_Role_Contact, THE System SHALL not modify the pipeline stage or status of any seller lead belonging to the same contact, and vice versa
4. WHEN searching for a seller contact during listing creation, THE System SHALL return all contacts matching the search query regardless of their existing lead categories, including contacts who already have active seller leads for other listings

### Requirement 6: Seller Viewing Updates

**User Story:** As an agent, I want to track whether the seller has been updated about viewing outcomes, so that I maintain good seller communication practices.

#### Acceptance Criteria

1. WHEN a viewing for the listing transitions to `completed` status, THE System SHALL set the viewing's `seller_updated` field to false
2. WHEN a listing has a seller contact attached, THE Listing_Detail_Page SHALL display the `seller_updated` status (true or false) on each completed viewing record in the listing's viewings section
3. WHEN the agent marks a completed viewing as `seller_updated`, THE System SHALL set the `seller_updated` field to true and record the timestamp of the update
4. WHILE a listing has a seller contact attached and has 1 or more completed viewings where `seller_updated` is false, THE Listing_Detail_Page SHALL display a reminder indicator showing the count of viewings pending seller updates
5. IF a listing has no seller contact attached, THEN THE Listing_Detail_Page SHALL NOT display the seller update reminder indicator

### Requirement 7: Seller Contact in Listing List View

**User Story:** As an agent, I want to see the seller name in the listings list, so that I can quickly identify which client owns which property.

#### Acceptance Criteria

1. WHEN displaying the listings list in table view, THE System SHALL show a "Seller" column that displays the seller contact's full name (first name followed by last name) for each listing that has a seller attached
2. WHEN displaying the listings list in card view, THE System SHALL show the seller contact's full name (first name followed by last name) on each listing card that has a seller attached
3. IF a listing has no seller attached, THEN THE System SHALL display a dash character ("—") in the seller name position
4. IF the seller contact's full name exceeds the available column width, THEN THE System SHALL truncate the name with an ellipsis while showing at minimum the first 12 characters
5. WHEN the agent clicks the seller name in the listings list, THE System SHALL navigate to the seller's contact profile page

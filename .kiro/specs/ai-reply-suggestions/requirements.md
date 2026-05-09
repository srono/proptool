# Requirements Document

## Introduction

AI Reply Suggestions is a feature of PropAgent SG that enables Singapore property agents to respond faster and more accurately to WhatsApp messages by providing AI-generated reply suggestions within the existing chat thread UI. The feature analyzes conversation context to suggest contextually appropriate replies, automatically checks the agent's Google Calendar availability when scheduling is discussed, inserts relevant property listing details into replies, and handles follow-up questions about previously shared listing information. The feature integrates with the existing WhatsApp messaging system (360dialog), Google Calendar OAuth integration, and listings management module.

## Glossary

- **Suggestion_Engine**: The server-side module responsible for analyzing conversation context and generating reply suggestions using an LLM (GPT-4o-mini)
- **Suggestion_Panel**: The UI component displayed within the Chat_Thread that presents AI-generated reply suggestions to the agent
- **Calendar_Availability_Checker**: The subsystem that queries the agent's connected Google Calendar to determine free/busy time slots for scheduling-related suggestions
- **Listing_Context_Provider**: The subsystem that retrieves and formats property listing data for inclusion in reply suggestions
- **Conversation_Context**: The collection of recent messages in a chat thread used as input for generating reply suggestions, including message direction, body, and timestamps
- **Suggestion**: A single AI-generated reply option presented to the agent, containing the reply text and an optional category label
- **Listing_Snippet**: A formatted summary of a property listing containing key details (address, price, property type, floor area, tenure, district) suitable for insertion into a WhatsApp message
- **Follow_Up_Context**: The state tracking which listing information has been shared in a conversation, enabling the Suggestion_Engine to answer follow-up questions about that listing
- **Chat_Thread**: The existing UI component (/messages/[contactId]) that displays the full message history for a specific contact and provides the message composer
- **Time_Slot**: A specific date and time window representing an available period in the agent's Google Calendar

## Requirements

### Requirement 1: Reply Suggestion Generation

**User Story:** As a property agent, I want AI-suggested replies based on the conversation context, so that I can respond quickly to client messages without typing everything from scratch.

#### Acceptance Criteria

1. WHEN the agent opens a chat thread with at least one inbound message, THE Suggestion_Engine SHALL analyze the most recent messages (up to 20) and generate between 2 and 4 reply suggestions.
2. WHEN a new inbound message is received in an open chat thread, THE Suggestion_Engine SHALL clear any previously displayed suggestions and regenerate between 2 and 4 reply suggestions based on the updated conversation context.
3. THE Suggestion_Engine SHALL include the message direction, body, and timestamp relative to the current time (e.g., "2 hours ago") for each message in the conversation context sent to the LLM.
4. THE Suggestion_Engine SHALL instruct the LLM to generate replies in the language of the most recent inbound message, written as a Singapore property agent communicating via WhatsApp, using short sentences without formal salutations or sign-offs.
5. THE Suggestion_Engine SHALL constrain the LLM to produce replies that are under 300 characters each, contain only plain text without markdown or special formatting, and are each semantically distinct from one another.
6. IF the LLM API call fails or times out after 10 seconds, THEN THE Suggestion_Engine SHALL return an empty suggestion list without displaying an error to the agent.
7. WHILE suggestions are being generated, THE Suggestion_Panel SHALL display a loading indicator.
8. IF the LLM returns fewer than 2 valid suggestions, THEN THE Suggestion_Engine SHALL return an empty suggestion list. IF the LLM returns more than 4 suggestions, THEN THE Suggestion_Engine SHALL display only the first 4.

### Requirement 2: Suggestion Display and Selection

**User Story:** As a property agent, I want to see reply suggestions above the message composer and select one to use, so that I can quickly send a relevant response with minimal effort.

#### Acceptance Criteria

1. THE Suggestion_Panel SHALL display reply suggestions as horizontally-wrapping tappable chips positioned above the message composer input in the Chat_Thread, with each chip showing the suggestion text truncated to 80 characters with an ellipsis when exceeded.
2. WHEN the agent taps a suggestion chip, THE Suggestion_Panel SHALL replace any existing text in the message composer input field with the full suggestion text without sending it.
3. WHEN the suggestion text is inserted into the composer, THE Chat_Thread SHALL place the cursor at the end of the inserted text and allow the agent to edit the text before sending.
4. WHEN the agent manually types in the composer, THE Suggestion_Panel SHALL remain visible until the message is sent or the agent taps a dismiss control on the Suggestion_Panel.
5. WHEN the agent sends a message (either from a suggestion or manually typed), THE Suggestion_Panel SHALL clear the current suggestions and hide the panel.
6. THE Suggestion_Panel SHALL provide a refresh button that triggers regeneration of suggestions for the current conversation context.
7. IF the refresh button is tapped while suggestions are already being generated, THEN THE Suggestion_Panel SHALL ignore the tap and continue displaying the loading indicator.
8. WHEN no suggestions are available (empty list or error), THE Suggestion_Panel SHALL be hidden and occupy no vertical space above the composer.
9. THE Suggestion_Panel SHALL provide a dismiss control (close button) that hides the panel and clears the current suggestions until new suggestions are generated by a subsequent inbound message or a refresh action.

### Requirement 3: Calendar Availability Integration

**User Story:** As a property agent, I want reply suggestions to automatically include my available time slots when a client asks about scheduling, so that I can propose viewing times without manually checking my calendar.

#### Acceptance Criteria

1. WHEN the conversation context indicates a scheduling intent (mentions of viewing, appointment, meeting, available, free, schedule, or explicit date/time references such as day names, "today", "tomorrow", "this week", or "next week"), THE Suggestion_Engine SHALL invoke the Calendar_Availability_Checker before generating suggestions.
2. WHEN the Calendar_Availability_Checker is invoked, THE Calendar_Availability_Checker SHALL query the agent's Google Calendar for free/busy information over the next 7 days from the current date, with a response timeout of 5 seconds.
3. THE Calendar_Availability_Checker SHALL identify available Time_Slots during business hours (9:00 to 19:00 SGT, Monday to Sunday) that are at least 60 minutes long.
4. WHEN available time slots are found, THE Suggestion_Engine SHALL incorporate the earliest 3 available time slots (by chronological order) into at least one reply suggestion, formatted as date and time in en-SG locale.
5. IF the agent has not connected Google Calendar, THEN THE Suggestion_Engine SHALL generate scheduling-related suggestions without specific time slots and include a generic prompt (e.g., "When would be a good time for you?").
6. IF the Google Calendar API returns an error or does not respond within 5 seconds, THEN THE Calendar_Availability_Checker SHALL return an empty availability list and THE Suggestion_Engine SHALL generate suggestions without specific time slots.
7. IF the Calendar_Availability_Checker finds zero available time slots within the 7-day query window, THEN THE Suggestion_Engine SHALL generate a reply suggestion indicating no availability in the coming week and prompting the client to suggest alternative dates.

### Requirement 4: Listing Information Insertion

**User Story:** As a property agent, I want to insert property listing details into my replies, so that I can share accurate property information with clients without looking it up manually.

#### Acceptance Criteria

1. THE Suggestion_Panel SHALL provide a "Insert Listing" button that opens a listing search interface.
2. WHEN the agent activates the listing search, THE Listing_Context_Provider SHALL display the agent's listings filtered by status "live", searchable by address, district, or property type, with a minimum search input of 2 characters before filtering is applied.
3. WHEN the agent selects a sale listing, THE Listing_Context_Provider SHALL generate a Listing_Snippet containing: property type, address, district, floor area (sqft), tenure, asking price (formatted as S$ with thousand separators), and PSF.
4. WHEN the agent selects a rental listing, THE Listing_Context_Provider SHALL generate a Listing_Snippet containing: property type, address, district, floor area (sqft), tenure, and asking rental (formatted as S$ with thousand separators followed by "/mo").
5. WHEN a Listing_Snippet is generated and the message composer input field contains existing text, THE Suggestion_Panel SHALL append the formatted snippet after the existing text separated by a line break.
6. WHEN a Listing_Snippet is generated and the message composer input field is empty, THE Suggestion_Panel SHALL insert the formatted snippet into the message composer input field.
7. THE Listing_Snippet SHALL format prices using Singapore dollar notation (S$) with thousand separators.
8. WHEN a listing is inserted into the conversation, THE Listing_Context_Provider SHALL store the listing_id as Follow_Up_Context for the current conversation.
9. THE Listing_Snippet SHALL include the listing description if available, truncated to 200 characters with an ellipsis.
10. IF the listing search yields no matching results, THEN THE Listing_Context_Provider SHALL display an empty state message indicating no live listings match the search criteria.

### Requirement 5: Follow-Up Question Handling

**User Story:** As a property agent, I want the AI to answer follow-up questions about a listing I shared, so that I can provide accurate details without looking up the listing again.

#### Acceptance Criteria

1. WHEN Follow_Up_Context exists for a conversation (a listing was previously inserted), THE Suggestion_Engine SHALL include the listing's address, district, property type, tenure, floor area, asking price or rental, PSF, floor, unit number, completion year, and description in the LLM context when generating suggestions.
2. WHEN the inbound message contains questions about property details (price, size, location, tenure, floor, amenities, or availability) and Follow_Up_Context exists, THE Suggestion_Engine SHALL generate suggestions that include the relevant data values from the Follow_Up_Context listing in the suggestion text.
3. THE Suggestion_Engine SHALL persist Follow_Up_Context per conversation (keyed by contact_id) on the server until a different listing is inserted into the same conversation.
4. WHEN a different listing is inserted into the same conversation, THE Listing_Context_Provider SHALL replace the existing Follow_Up_Context with the new listing data.
5. WHEN the Follow_Up_Context listing data does not contain information to answer a specific question (the relevant field is null or absent), THE Suggestion_Engine SHALL generate a suggestion acknowledging the question and offering to check (e.g., "Let me check on that and get back to you").
6. IF Follow_Up_Context does not exist for the conversation when a property detail question is received, THEN THE Suggestion_Engine SHALL generate suggestions without listing-specific data, treating the message as a general inquiry.
7. IF the listing referenced in Follow_Up_Context has been deleted from the system, THEN THE Suggestion_Engine SHALL clear the Follow_Up_Context for that conversation and generate suggestions without listing-specific data.

### Requirement 6: Suggestion API Endpoint

**User Story:** As a developer, I want a secure API endpoint for generating reply suggestions, so that the feature can be invoked from the client with proper authentication and input validation.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL expose a POST /api/messages/suggestions endpoint that accepts a JSON body with a contact_id field (required) and an optional listing_context_id field.
2. IF the request is received without a valid authenticated session, THEN THE Suggestion_Engine SHALL return HTTP 401 Unauthorized.
3. IF the contact_id field is missing from the request body, THEN THE Suggestion_Engine SHALL return HTTP 400 with an error message indicating that contact_id is required.
4. IF the specified contact_id does not belong to the authenticated agent's tenant, THEN THE Suggestion_Engine SHALL return HTTP 403 Forbidden.
5. THE Suggestion_Engine SHALL fetch up to the most recent 20 messages for the specified contact_id, ordered by sent_at descending, to build the Conversation_Context; IF fewer than 20 messages exist, THEN THE Suggestion_Engine SHALL use all available messages.
6. WHEN the endpoint returns successfully, THE Suggestion_Engine SHALL return HTTP 200 with a JSON body containing a suggestions array of 0 to 4 suggestion objects, each with a "text" field (maximum 300 characters) and an optional "category" field.
7. IF processing exceeds 15 seconds, THEN THE Suggestion_Engine SHALL return HTTP 200 with an empty suggestions array.
8. IF the listing_context_id is provided but does not correspond to a valid listing within the authenticated agent's tenant, THEN THE Suggestion_Engine SHALL ignore the listing_context_id and generate suggestions without listing context.

### Requirement 7: Scheduling Intent Detection

**User Story:** As a property agent, I want the system to automatically detect when a client is asking about scheduling, so that calendar availability is checked without manual intervention.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL classify the most recent inbound message for scheduling intent using case-insensitive keyword matching before generating suggestions.
2. THE Suggestion_Engine SHALL detect scheduling intent when the message contains one or more of the following keywords or phrases (case-insensitive): "viewing", "view", "appointment", "meeting", "available", "availability", "free", "schedule", "reschedule", "what time", "when can", "slot", or any explicit date/time reference (e.g., day names, "tomorrow", "next week").
3. WHEN scheduling intent is detected and the agent has a connected Google Calendar, THE Suggestion_Engine SHALL pass up to 3 available time slots to the LLM as additional context for suggestion generation.
4. WHEN scheduling intent is detected and the agent does not have a connected Google Calendar, THE Suggestion_Engine SHALL generate scheduling-related suggestions without specific time slots.
5. WHEN scheduling intent is detected and the conversation has Follow_Up_Context with a listing, THE Suggestion_Engine SHALL include the listing address in at least one scheduling-related suggestion (e.g., "I can show you the unit at [address] on...").
6. IF scheduling intent is not detected, THEN THE Suggestion_Engine SHALL proceed with standard suggestion generation without invoking the Calendar_Availability_Checker.

### Requirement 8: Suggestion Context Enrichment

**User Story:** As a property agent, I want suggestions to be aware of my lead and contact information, so that replies feel personalized and reference the correct client details.

#### Acceptance Criteria

1. WHEN generating suggestions, THE Suggestion_Engine SHALL include the contact's full name (first name and last name) in the LLM context to enable personalized greetings.
2. IF the contact has more than one active lead (pipeline stage is not Closed Won, Closed Lost, or Nurture), THEN THE Suggestion_Engine SHALL use the lead with the most recent last_activity_at timestamp for context enrichment.
3. WHEN the contact has an associated active lead, THE Suggestion_Engine SHALL include the lead's deal_type, preferred districts, budget minimum and maximum, and property type preferences in the LLM context.
4. IF any buyer requirement fields (preferred districts, budget range, or property type) are not populated on the active lead, THEN THE Suggestion_Engine SHALL omit those fields from the LLM context and generate suggestions without referencing the missing data.
5. THE Suggestion_Engine SHALL instruct the LLM to use the contact's first name in suggestions where the most recent inbound message is the first message in the conversation or follows a gap of 24 hours or more since the last outbound message.
6. WHEN the lead has at least one buyer requirement field populated (budget minimum or maximum, at least one preferred district, or at least one property type) and the inbound message relates to property search or recommendations, THE Suggestion_Engine SHALL generate at least one suggestion that references the populated requirements.
7. IF the contact has no associated active lead, THEN THE Suggestion_Engine SHALL generate suggestions using only the contact name and conversation context without lead-specific data.

### Requirement 9: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want AI suggestions to only reference my own listings and calendar, so that client data remains private to my agency.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL scope all message queries to the authenticated agent's tenant_id when building Conversation_Context.
2. THE Listing_Context_Provider SHALL only return listings belonging to the authenticated agent's tenant_id.
3. THE Calendar_Availability_Checker SHALL only access the Google Calendar of the authenticated agent.
4. THE Suggestion_Engine SHALL enforce Row-Level Security policies ensuring suggestion generation cannot access data from other tenants.
5. IF a listing_context_id provided in the suggestion request does not belong to the authenticated agent's tenant_id, THEN THE Suggestion_Engine SHALL ignore the listing_context_id and generate suggestions without listing context.
6. WHEN generating suggestions with Follow_Up_Context, THE Suggestion_Engine SHALL verify that the referenced listing belongs to the authenticated agent's tenant_id before including listing details in the LLM context.
7. WHEN building Suggestion Context Enrichment (contact name, lead preferences), THE Suggestion_Engine SHALL scope all contact and lead queries to the authenticated agent's tenant_id.

### Requirement 10: LLM Prompt Construction

**User Story:** As a developer, I want a well-structured LLM prompt that produces consistent, high-quality suggestions, so that the AI output is reliable and appropriate for Singapore real estate conversations.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL construct a system prompt that defines the assistant role as a Singapore property agent's reply assistant.
2. THE Suggestion_Engine SHALL include in the system prompt: instructions to use professional WhatsApp tone, Singapore property terminology (HDB, condo, landed, PSF, tenure), and en-SG date/number formatting.
3. THE Suggestion_Engine SHALL structure the user prompt with distinct section headers for: conversation history, contact/lead context, calendar availability (included only when scheduling intent is detected and calendar data is available), and listing context (included only when Follow_Up_Context exists for the conversation).
4. THE Suggestion_Engine SHALL instruct the LLM to return a JSON array of 2 to 4 suggestion objects, each with a "text" field (maximum 300 characters) and a "category" field limited to the defined category enum.
5. THE Suggestion_Engine SHALL define suggestion categories as: "greeting", "scheduling", "listing_info", "follow_up", and "general", and SHALL instruct the LLM to assign only one of these values to each suggestion's "category" field.
6. IF the LLM response cannot be parsed as valid JSON, THEN THE Suggestion_Engine SHALL return an empty suggestions array.
7. THE Suggestion_Engine SHALL set the LLM temperature to 0.7.
8. IF the LLM response is valid JSON but any suggestion object is missing the "text" field or contains an empty "text" value, THEN THE Suggestion_Engine SHALL exclude that malformed suggestion object from the returned suggestions array.

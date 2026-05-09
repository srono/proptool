# Requirements Document

## Introduction

WhatsApp Messaging is the two-way communication feature of PropAgent SG that enables Singapore property agents to send and receive WhatsApp messages with contacts directly from the platform. The feature integrates with the 360dialog WhatsApp Business API for message delivery and reception, supports media attachments, tracks message delivery status, and automatically links conversations to leads. Messages are grouped by contact into conversation threads, providing agents with a unified inbox for all WhatsApp communications. The system handles inbound message processing via webhooks, including automatic contact creation and lead generation for new senders.

## Glossary

- **Messaging_System**: The module responsible for sending, receiving, storing, and displaying WhatsApp messages within PropAgent SG
- **Send_API**: The server-side API endpoint (POST /api/messages/send) that handles outbound message dispatch and persistence
- **Webhook_Handler**: The server-side endpoint (POST /api/webhooks/whatsapp) that receives and processes inbound messages from 360dialog
- **WhatsApp_Client**: The integration client that sends text messages to recipients via the 360dialog WhatsApp Business API
- **Conversation_List**: The UI page (/messages) that displays all conversations grouped by contact with the most recent message preview
- **Chat_Thread**: The UI component (/messages/[contactId]) that displays the full message history for a specific contact and provides the message composer
- **360dialog**: The third-party WhatsApp Business API provider used for sending and receiving WhatsApp messages
- **wa_message_id**: The unique message identifier returned by the 360dialog API, used for deduplication and status tracking
- **RLS**: Row-Level Security — Supabase database policy ensuring agents can only access messages belonging to their tenant
- **Optimistic_Update**: A UI pattern where the sent message is displayed immediately before server confirmation, then updated with the actual status upon response
- **Contact**: A person record in the system identified by phone number, linked to messages and leads
- **Active_Lead**: The most recent lead for a contact that is not in a closed status (closed_won or closed_lost)

## Requirements

### Requirement 1: Outbound Message Sending

**User Story:** As a property agent, I want to send WhatsApp messages to my contacts from within PropAgent SG, so that I can communicate with leads without switching to a separate WhatsApp application.

#### Acceptance Criteria

1. WHEN the agent submits a message with a valid contact_id, body, and tenant_id, THE Send_API SHALL dispatch the message to the contact's phone number via the WhatsApp_Client and persist the message record with direction "outbound" and channel "whatsapp".
2. WHEN the WhatsApp_Client successfully delivers the message, THE Send_API SHALL store the wa_message_id returned by 360dialog and set the message status to "sent".
3. IF the WhatsApp_Client fails to deliver the message, THEN THE Send_API SHALL persist the message record with status "failed" and log the error.
4. WHEN a lead_id is provided with the send request, THE Send_API SHALL associate the message with the specified lead and update the lead's last_activity_at timestamp to the current time.
5. IF the contact_id does not correspond to an existing contact within the agent's tenant, THEN THE Send_API SHALL return a 404 error with the message "Contact not found".
6. IF the request is missing required fields (contact_id, body, or tenant_id), THEN THE Send_API SHALL return a 400 error identifying the missing fields.
7. IF the agent is not authenticated, THEN THE Send_API SHALL return a 401 Unauthorized error.

### Requirement 2: Inbound Message Reception

**User Story:** As a property agent, I want to receive WhatsApp messages from contacts automatically, so that I never miss an enquiry or client response.

#### Acceptance Criteria

1. WHEN the Webhook_Handler receives a message payload from 360dialog, THE Webhook_Handler SHALL extract the sender phone number, message body, media URLs, and wa_message_id from the payload.
2. WHEN an inbound message is received, THE Webhook_Handler SHALL normalize the sender phone number to Singapore format with the +65 country code prefix.
3. WHEN the sender phone matches an existing contact within the resolved tenant, THE Webhook_Handler SHALL associate the message with that contact.
4. IF the sender phone does not match any existing contact, THEN THE Webhook_Handler SHALL create a new contact record with the phone number, the sender's WhatsApp profile name, source set to "whatsapp", and whatsapp_optin set to true.
5. WHEN an active lead exists for the contact, THE Webhook_Handler SHALL associate the inbound message with that lead and update the lead's last_activity_at timestamp.
6. IF no active lead exists for the contact, THEN THE Webhook_Handler SHALL create a new lead with status "new_lead", source "whatsapp", deal_type "sale", and urgency "warm".
7. THE Webhook_Handler SHALL store each inbound message with direction "inbound", channel "whatsapp", status "delivered", and the sent_at timestamp derived from the 360dialog message timestamp.
8. THE Webhook_Handler SHALL store the wa_message_id from 360dialog for deduplication purposes.

### Requirement 3: Phone Number Normalization

**User Story:** As a property agent, I want phone numbers to be consistently formatted, so that contacts are correctly matched regardless of how the number is provided by WhatsApp.

#### Acceptance Criteria

1. WHEN a phone number starts with "65" and has 10 digits total, THE Webhook_Handler SHALL format the number as "+65" followed by the 8-digit local number.
2. WHEN a phone number has exactly 8 digits, THE Webhook_Handler SHALL prepend "+65" to produce the full Singapore number.
3. WHEN a phone number does not match Singapore patterns, THE Webhook_Handler SHALL prepend "+" to the digits if not already present.
4. THE Webhook_Handler SHALL strip all non-digit characters from the raw phone number before applying normalization rules.

### Requirement 4: Tenant Resolution

**User Story:** As a property agent, I want inbound messages to be routed to the correct tenant account, so that messages are associated with the right agency in a multi-tenant environment.

#### Acceptance Criteria

1. WHEN the webhook payload includes a phone_number_id in metadata, THE Webhook_Handler SHALL resolve the tenant by looking up the whatsapp_connections table for a matching phone_number_id.
2. IF no phone_number_id is provided or no matching connection is found, THEN THE Webhook_Handler SHALL fall back to single-tenant mode by selecting the first available tenant.
3. IF no tenant can be resolved, THEN THE Webhook_Handler SHALL skip processing the message without returning an error to 360dialog.

### Requirement 5: Message Data Model

**User Story:** As a property agent, I want messages to capture all relevant metadata, so that I can track conversation history, delivery status, and channel context.

#### Acceptance Criteria

1. THE Messaging_System SHALL store each message with the following fields: id, tenant_id, contact_id, lead_id, wa_number_id, direction, channel, body, media_url, wa_message_id, status, and sent_at.
2. THE Messaging_System SHALL support direction values of "inbound" and "outbound".
3. THE Messaging_System SHALL support channel values of "whatsapp", "sms", "email", and "note".
4. THE Messaging_System SHALL support status values of "sent", "delivered", "read", and "failed".
5. THE Messaging_System SHALL allow lead_id, wa_number_id, media_url, and wa_message_id to be null.

### Requirement 6: Conversation List View

**User Story:** As a property agent, I want to see all my WhatsApp conversations in one list, so that I can quickly identify which contacts need attention.

#### Acceptance Criteria

1. THE Conversation_List SHALL display all conversations grouped by contact, showing one entry per contact with the most recent message as the preview.
2. THE Conversation_List SHALL display for each conversation: the contact name, the last message body (or "Media" if only media_url is present), the timestamp of the last message, and the message direction indicator.
3. THE Conversation_List SHALL order conversations by the most recent message timestamp in descending order.
4. WHEN outbound messages have not been read by the recipient, THE Conversation_List SHALL display a single checkmark (✓) next to the message preview.
5. WHEN outbound messages have been read by the recipient, THE Conversation_List SHALL display a double checkmark (✓✓) next to the message preview.
6. WHEN a contact has inbound messages with status other than "read", THE Conversation_List SHALL display an unread count badge showing the number of unread messages.
7. WHEN no conversations exist, THE Conversation_List SHALL display an empty state indicating that messages from WhatsApp will appear in the list.
8. THE Conversation_List SHALL provide a search input for filtering contacts.

### Requirement 7: Conversation Thread View

**User Story:** As a property agent, I want to view the full message history with a contact in a chat-style interface, so that I can review conversation context before responding.

#### Acceptance Criteria

1. WHEN the agent navigates to a conversation thread, THE Chat_Thread SHALL display all messages for the selected contact ordered chronologically from oldest to newest.
2. THE Chat_Thread SHALL visually distinguish inbound messages (left-aligned, neutral background) from outbound messages (right-aligned, brand-colored background).
3. THE Chat_Thread SHALL display the message timestamp below each message bubble.
4. WHEN an outbound message has status "sent", THE Chat_Thread SHALL display a single checkmark indicator.
5. WHEN an outbound message has status "delivered", THE Chat_Thread SHALL display a double checkmark indicator.
6. WHEN an outbound message has status "read", THE Chat_Thread SHALL display a double checkmark indicator.
7. WHEN an outbound message has status "failed", THE Chat_Thread SHALL display a "Failed" text indicator.
8. THE Chat_Thread SHALL display the contact name, phone number, and lead status in the conversation header.
9. THE Chat_Thread SHALL automatically scroll to the most recent message when the thread is opened or a new message is sent.
10. THE Chat_Thread SHALL provide action buttons for "View lead" and "Book viewing" in the header.

### Requirement 8: Message Composer

**User Story:** As a property agent, I want a simple text input to compose and send messages, so that I can quickly respond to contacts.

#### Acceptance Criteria

1. THE Chat_Thread SHALL provide a text input field with placeholder text "Reply via WhatsApp..." and a Send button.
2. WHEN the agent presses Enter (without Shift), THE Chat_Thread SHALL submit the message.
3. WHEN the agent clicks the Send button, THE Chat_Thread SHALL submit the message.
4. WHILE the message input is empty or contains only whitespace, THE Chat_Thread SHALL disable the Send button.
5. WHILE a message is being sent, THE Chat_Thread SHALL disable the Send button to prevent duplicate submissions.
6. WHEN a message is submitted, THE Chat_Thread SHALL apply an Optimistic_Update by immediately displaying the message in the thread with status "sent" before receiving server confirmation.
7. WHEN the server confirms successful delivery, THE Chat_Thread SHALL replace the optimistic message with the persisted message record.
8. IF the server returns an error, THEN THE Chat_Thread SHALL update the optimistic message status to "failed".
9. AFTER a message is sent or fails, THE Chat_Thread SHALL return focus to the text input field.

### Requirement 9: WhatsApp API Integration

**User Story:** As a property agent, I want reliable message delivery through WhatsApp, so that my messages reach contacts on their preferred communication channel.

#### Acceptance Criteria

1. THE WhatsApp_Client SHALL send text messages to the 360dialog API endpoint (https://waba.360dialog.io/v1/messages) using the configured D360-API-KEY header.
2. THE WhatsApp_Client SHALL format outbound messages with messaging_product "whatsapp", recipient_type "individual", type "text", and the recipient phone number.
3. WHEN the 360dialog API returns a successful response, THE WhatsApp_Client SHALL extract and return the message ID from the response payload.
4. IF the WHATSAPP_360DIALOG_API_KEY environment variable is not configured, THEN THE WhatsApp_Client SHALL throw an error indicating the API key is missing.
5. IF the 360dialog API returns a non-success HTTP status, THEN THE WhatsApp_Client SHALL throw an error including the HTTP status code.

### Requirement 10: Media Message Support

**User Story:** As a property agent, I want to receive media messages (images, documents, videos) from contacts, so that I can view property photos, documents, and other files shared by clients.

#### Acceptance Criteria

1. WHEN an inbound message contains an image attachment, THE Webhook_Handler SHALL extract the image link and store it in the media_url field.
2. WHEN an inbound message contains a document attachment, THE Webhook_Handler SHALL extract the document link and store it in the media_url field.
3. WHEN an inbound message contains a video attachment, THE Webhook_Handler SHALL extract the video link and store it in the media_url field.
4. WHEN an inbound message contains both text (caption) and media, THE Webhook_Handler SHALL store the caption in the body field and the media link in the media_url field.
5. WHEN a message has a media_url but no body text, THE Conversation_List SHALL display "Media" as the message preview.

### Requirement 11: Message Status Tracking

**User Story:** As a property agent, I want to see whether my messages were delivered and read, so that I know if contacts have seen my communications.

#### Acceptance Criteria

1. THE Messaging_System SHALL track message status progression through the states: sent, delivered, read, and failed.
2. WHEN an outbound message is successfully dispatched to 360dialog, THE Messaging_System SHALL set the initial status to "sent".
3. WHEN an inbound message is received and stored, THE Messaging_System SHALL set the status to "delivered".
4. THE Chat_Thread SHALL visually represent each status state with distinct indicators: single checkmark for "sent", double checkmark for "delivered", double checkmark for "read", and "Failed" text for "failed".

### Requirement 12: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want my messages to be private to my agency, so that other tenants cannot access my client conversations.

#### Acceptance Criteria

1. THE Messaging_System SHALL enforce Row-Level Security policies ensuring agents can only query messages belonging to their own tenant_id.
2. WHEN a message is created via the Send_API, THE Messaging_System SHALL associate the message with the authenticated agent's tenant_id.
3. THE Messaging_System SHALL scope all message queries (conversation list, thread view) to the authenticated agent's tenant.
4. THE Webhook_Handler SHALL use an admin client (bypassing RLS) to insert inbound messages, since webhook requests are not authenticated by a user session.

### Requirement 13: Lead Activity Tracking

**User Story:** As a property agent, I want messaging activity to update lead timestamps, so that I can see which leads have recent communication and prioritize follow-ups.

#### Acceptance Criteria

1. WHEN an outbound message is sent with an associated lead_id, THE Send_API SHALL update the lead's last_activity_at field to the current timestamp.
2. WHEN an inbound message is received and linked to an active lead, THE Webhook_Handler SHALL update the lead's last_activity_at field to the current timestamp.
3. WHEN an inbound message triggers creation of a new lead, THE Webhook_Handler SHALL set the new lead's last_activity_at to the current timestamp.

### Requirement 14: Conversation Timestamp Formatting

**User Story:** As a property agent, I want message timestamps displayed in a contextual format, so that I can quickly understand when messages were sent relative to the current time.

#### Acceptance Criteria

1. WHEN a message was sent today, THE Conversation_List SHALL display the time in 24-hour format (HH:MM) using the en-SG locale.
2. WHEN a message was sent yesterday, THE Conversation_List SHALL display "Yesterday".
3. WHEN a message was sent within the last 7 days (but not today or yesterday), THE Conversation_List SHALL display the abbreviated day name (e.g., "Mon", "Tue").
4. WHEN a message was sent more than 7 days ago, THE Conversation_List SHALL display the date in day-month format (e.g., "15 Jan").
5. THE Chat_Thread SHALL display message timestamps in 24-hour format (HH:MM) using the en-SG locale for all messages regardless of date.

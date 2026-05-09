# Requirements Document

## Introduction

Push Notifications is the real-time alerting feature of PropAgent SG — a Singapore Property Agent Operating System. It enables property agents to receive instant browser push notifications when new leads arrive from Facebook/Meta Lead Ads, ensuring agents can respond quickly to prospective buyers and sellers. The system uses the Web Push protocol with VAPID authentication, stores push subscriptions per user in Supabase, and delivers notifications non-blockingly so that upstream webhook processing is never disrupted. Agents can enable or disable push notifications from the Settings page. The feature operates as a Progressive Web App (PWA) with a service worker handling push events and notification click deep-linking.

## Glossary

- **Push_Notification_System**: The PropAgent SG subsystem responsible for managing push subscriptions, delivering web push notifications, and handling notification interactions
- **Service_Worker**: The background script (sw.js) registered in the browser that listens for push events and displays system notifications
- **Push_Subscription**: A record containing the user's push endpoint URL, p256dh key, and auth key, stored in the push_subscriptions database table
- **VAPID**: Voluntary Application Server Identification — a protocol for authenticating push notification senders using a public/private key pair
- **Subscribe_API**: The POST /api/push/subscribe endpoint that stores a push subscription for the authenticated user
- **Unsubscribe_API**: The DELETE /api/push/subscribe endpoint that removes a push subscription for the authenticated user
- **Send_API**: The POST /api/push/send endpoint that delivers a push notification to all subscriptions for a given user
- **Push_Toggle**: The UI component in Settings that allows agents to enable or disable browser push notifications
- **Meta_Webhook_Handler**: The API endpoint that receives Facebook Lead Ad submissions and triggers push notifications to assigned agents
- **PWA_Manifest**: The manifest.json file that defines the installable app experience (name, icons, display mode, theme)
- **Notification_Payload**: The JSON object sent to the push endpoint containing title, body, url, and icon fields
- **Expired_Subscription**: A push subscription that returns HTTP 410 (Gone) or 404 (Not Found) when a notification delivery is attempted
- **Tenant**: An agency or team operating within PropAgent SG; all data is scoped to a tenant for isolation

## Requirements

### Requirement 1: Push Subscription Registration

**User Story:** As a property agent, I want to register my browser for push notifications, so that I can receive real-time alerts about new leads without keeping the app open.

#### Acceptance Criteria

1. WHEN an authenticated user enables push notifications, THE Push_Notification_System SHALL register the service worker at /sw.js and subscribe to the browser PushManager using the VAPID public key
2. WHEN the browser returns a valid push subscription, THE Subscribe_API SHALL store the endpoint, p256dh key, and auth key in the push_subscriptions table associated with the authenticated user
3. WHEN a subscription with the same user_id and endpoint already exists, THE Subscribe_API SHALL upsert the record rather than creating a duplicate
4. IF the subscription data is missing endpoint, p256dh key, or auth key, THEN THE Subscribe_API SHALL return HTTP 400 with an error message describing the missing fields
5. IF the user is not authenticated, THEN THE Subscribe_API SHALL return HTTP 401 with an "Unauthorized" error

### Requirement 2: Push Subscription Removal

**User Story:** As a property agent, I want to unsubscribe from push notifications, so that I can stop receiving alerts when I no longer need them.

#### Acceptance Criteria

1. WHEN an authenticated user disables push notifications, THE Push_Notification_System SHALL unsubscribe the browser PushManager subscription locally
2. WHEN the local unsubscription succeeds, THE Unsubscribe_API SHALL delete the subscription record matching the user_id and endpoint from the push_subscriptions table
3. IF the endpoint field is missing from the unsubscribe request, THEN THE Unsubscribe_API SHALL return HTTP 400 with an error message
4. IF the user is not authenticated, THEN THE Unsubscribe_API SHALL return HTTP 401 with an "Unauthorized" error

### Requirement 3: Push Notification Delivery

**User Story:** As a property agent, I want to receive push notifications on all my subscribed devices, so that I never miss a new lead regardless of which device I am using.

#### Acceptance Criteria

1. WHEN the Send_API receives a valid request with user_id and title, THE Push_Notification_System SHALL fetch all push subscriptions for that user and send the notification payload to each endpoint in parallel
2. THE Push_Notification_System SHALL configure VAPID details (subject, public key, private key) before sending notifications
3. THE Notification_Payload SHALL contain title, body, and url fields serialized as JSON
4. WHEN a push endpoint returns HTTP 410 (Gone) or HTTP 404 (Not Found), THE Push_Notification_System SHALL delete the Expired_Subscription from the push_subscriptions table
5. WHEN a user has no push subscriptions, THE Send_API SHALL return a success response with sent count of zero rather than an error
6. IF the request is missing user_id or title, THEN THE Send_API SHALL return HTTP 400 with an error message describing the required fields
7. THE Send_API SHALL return the count of successfully delivered notifications in the response

### Requirement 4: Service Worker Push Event Handling

**User Story:** As a property agent, I want push notifications to display with relevant content and actions, so that I can quickly decide whether to act on a notification.

#### Acceptance Criteria

1. WHEN the Service_Worker receives a push event with a valid JSON payload, THE Service_Worker SHALL display a system notification with the title, body, and icon from the payload
2. THE Service_Worker SHALL display each notification with two actions: "Open" and "Dismiss"
3. THE Service_Worker SHALL use a default icon (/icon-192.png) when no icon is specified in the payload
4. THE Service_Worker SHALL include a vibration pattern of [100, 50, 100] milliseconds for each notification
5. WHEN the push event data is empty, THE Service_Worker SHALL not display a notification

### Requirement 5: Notification Click Deep-Linking

**User Story:** As a property agent, I want clicking a notification to take me directly to the relevant page, so that I can act on new leads immediately.

#### Acceptance Criteria

1. WHEN the user clicks a notification or the "Open" action, THE Service_Worker SHALL navigate to the URL specified in the notification data
2. WHEN an existing browser window already contains the target URL, THE Service_Worker SHALL focus that window rather than opening a new one
3. WHEN no existing window matches the target URL, THE Service_Worker SHALL open a new browser window navigating to the target URL
4. WHEN the user clicks the "Dismiss" action, THE Service_Worker SHALL close the notification without navigation
5. WHEN no URL is specified in the notification data, THE Service_Worker SHALL navigate to the root path "/"

### Requirement 6: Meta Webhook Push Integration

**User Story:** As a property agent, I want to be notified instantly when a new lead arrives from Facebook ads, so that I can respond before the lead goes cold.

#### Acceptance Criteria

1. WHEN the Meta_Webhook_Handler creates a new lead with an assigned agent, THE Meta_Webhook_Handler SHALL send a push notification to the assigned agent
2. THE Meta_Webhook_Handler SHALL send the notification with title "New Lead from Facebook", body containing the contact name and interest description, and url "/leads"
3. IF the push notification delivery fails, THEN THE Meta_Webhook_Handler SHALL log a warning and continue processing the webhook without returning an error
4. WHEN the new lead has no assigned agent, THE Meta_Webhook_Handler SHALL not attempt to send a push notification

### Requirement 7: Push Notification Settings UI

**User Story:** As a property agent, I want a simple toggle in Settings to control push notifications, so that I can enable or disable them without technical knowledge.

#### Acceptance Criteria

1. THE Push_Toggle SHALL display the current subscription state (enabled or disabled) on the Settings page
2. WHEN the user toggles push notifications on, THE Push_Toggle SHALL call the subscribe function and update the displayed state to enabled on success
3. WHEN the user toggles push notifications off, THE Push_Toggle SHALL call the unsubscribe function and update the displayed state to disabled on success
4. IF the browser does not support service workers or the PushManager API, THEN THE Push_Toggle SHALL display an "Unavailable" badge with a message indicating the browser is not supported
5. IF the subscribe or unsubscribe operation fails, THEN THE Push_Toggle SHALL display an error message to the user
6. WHILE the toggle operation is in progress, THE Push_Toggle SHALL disable the toggle button to prevent duplicate actions

### Requirement 8: Browser Permission Handling

**User Story:** As a property agent, I want the system to request notification permission clearly, so that I understand what I am granting access to.

#### Acceptance Criteria

1. WHEN the user enables push notifications, THE Push_Notification_System SHALL request the Notification permission from the browser before subscribing
2. IF the user denies the notification permission, THEN THE Push_Notification_System SHALL return a failure result without subscribing and the Push_Toggle SHALL display guidance to allow notifications in browser settings
3. WHEN the notification permission is already granted, THE Push_Notification_System SHALL proceed directly to subscription without re-prompting

### Requirement 9: PWA Manifest Configuration

**User Story:** As a property agent, I want to install PropAgent SG as a standalone app on my device, so that I can receive push notifications reliably and access the app from my home screen.

#### Acceptance Criteria

1. THE PWA_Manifest SHALL define the application name as "PropAgent SG" and short name as "PropAgent"
2. THE PWA_Manifest SHALL set the display mode to "standalone" for a native app experience
3. THE PWA_Manifest SHALL set the start URL to "/dashboard"
4. THE PWA_Manifest SHALL provide icons at 192x192 and 512x512 pixel sizes
5. THE PWA_Manifest SHALL set the background color and theme color to "#121212"

### Requirement 10: Push Subscription Data Model

**User Story:** As a system administrator, I want push subscriptions stored securely and efficiently, so that notifications can be delivered reliably to the correct users.

#### Acceptance Criteria

1. THE Push_Notification_System SHALL store each push subscription with the following fields: user_id, endpoint, keys_p256dh, and keys_auth
2. THE Push_Notification_System SHALL enforce a unique constraint on the combination of user_id and endpoint to prevent duplicate subscriptions
3. THE Push_Notification_System SHALL support multiple subscriptions per user to enable notifications across multiple devices and browsers
4. THE Push_Notification_System SHALL use the Supabase admin client (service role) for server-side subscription queries to bypass row-level security when sending notifications

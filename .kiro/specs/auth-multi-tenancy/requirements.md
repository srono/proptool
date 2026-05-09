# Requirements Document

## Introduction

Authentication & Multi-Tenancy is the foundational security and data isolation layer of PropAgent SG. It provides user authentication via Supabase Auth (email/password and Google OAuth), route protection through Next.js middleware, session management via cookies, and multi-tenant data isolation using Supabase Row-Level Security (RLS). Each tenant represents a property agent or agency with a subscription plan managed through Stripe. The system ensures that unauthenticated users cannot access protected resources and that each tenant's data is fully isolated from other tenants.

## Glossary

- **Auth_Middleware**: The Next.js middleware component that intercepts requests, validates user sessions via Supabase, and enforces route access rules
- **Auth_System**: The overall authentication subsystem encompassing login, signup, session management, OAuth, and signout functionality
- **Supabase_Client**: The server-side Supabase client created with cookie-based session handling for authenticating requests
- **Tenant**: An organizational entity representing a property agent or agency, containing subscription and configuration data
- **RLS**: Row-Level Security — Supabase database policies that restrict data access to rows belonging to the authenticated user's tenant
- **OAuth_Callback_Handler**: The route handler that exchanges an authorization code for a session after OAuth provider redirect
- **Signout_Handler**: The route handler that terminates the user session and redirects to the login page
- **Dashboard_Layout**: The server component that provides the authenticated application shell with responsive navigation
- **Subscription_Plan**: The tier of service for a tenant — free, pro, or team
- **Subscription_Status**: The current state of a tenant's subscription — active, trialing, past_due, or cancelled
- **CEA_Licence_Number**: The Council for Estate Agencies registration number for a Singapore property agent, in format R followed by 6 digits and 1 letter (e.g., R012345A)
- **Tenant_Settings**: A JSON configuration object containing tenant-specific preferences including data retention, digest timing, inbound email, and currency
- **Public_Path**: A route that does not require authentication to access (/, /login, /signup, /auth/callback, /auth/signout)
- **Protected_Path**: Any route that requires an authenticated session to access

## Requirements

### Requirement 1: Route Protection via Middleware

**User Story:** As a system operator, I want all non-public routes to be protected by authentication checks, so that unauthenticated users cannot access application data.

#### Acceptance Criteria

1. WHEN a request arrives for a Protected_Path, THE Auth_Middleware SHALL validate the user session by calling supabase.auth.getUser().
2. IF an unauthenticated user requests a Protected_Path, THEN THE Auth_Middleware SHALL redirect the user to /login.
3. THE Auth_Middleware SHALL allow unauthenticated access to the following Public_Paths: /, /login, /signup, /auth/callback, and /auth/signout.
4. WHEN an authenticated user requests /login or /signup, THE Auth_Middleware SHALL redirect the user to /dashboard.
5. THE Auth_Middleware SHALL exclude the following path patterns from processing: _next/static, _next/image, favicon.ico, manifest.json, and icons/.
6. THE Auth_Middleware SHALL propagate updated session cookies from Supabase to the response to maintain session freshness.

### Requirement 2: Email and Password Authentication

**User Story:** As a property agent, I want to sign in with my email and password, so that I can securely access my PropAgent account.

#### Acceptance Criteria

1. WHEN the agent submits valid email and password credentials, THE Auth_System SHALL authenticate the user via Supabase signInWithPassword and redirect to /dashboard.
2. IF the agent submits invalid credentials, THEN THE Auth_System SHALL display the error message returned by Supabase without revealing whether the email or password was incorrect.
3. THE Auth_System SHALL require both email and password fields to be non-empty before submission.
4. WHILE the authentication request is in progress, THE Auth_System SHALL disable the submit button and display a "Signing in..." loading state.

### Requirement 3: Google OAuth Authentication

**User Story:** As a property agent, I want to sign in with my Google account, so that I can access PropAgent without managing a separate password.

#### Acceptance Criteria

1. WHEN the agent clicks "Continue with Google", THE Auth_System SHALL initiate a Supabase OAuth flow with provider "google" and redirectTo set to the origin plus /auth/callback.
2. WHEN the OAuth provider redirects to /auth/callback with a valid authorization code, THE OAuth_Callback_Handler SHALL exchange the code for a session using supabase.auth.exchangeCodeForSession.
3. WHEN the code exchange succeeds, THE OAuth_Callback_Handler SHALL redirect the user to the path specified in the "next" query parameter, defaulting to /dashboard.
4. IF the code exchange fails or no code is present, THEN THE OAuth_Callback_Handler SHALL redirect the user to /login with an error query parameter set to "auth_failed".

### Requirement 4: User Registration

**User Story:** As a new property agent, I want to create an account with my professional details, so that I can start using PropAgent with a 14-day free trial.

#### Acceptance Criteria

1. WHEN the agent submits the signup form with valid data, THE Auth_System SHALL create a new user via Supabase signUp with email, password, and user metadata (full_name, phone, cea_licence_number).
2. THE Auth_System SHALL require full_name, email, and password fields to be non-empty for registration.
3. THE Auth_System SHALL enforce a minimum password length of 8 characters.
4. WHEN a CEA licence number is provided, THE Auth_System SHALL validate it matches the pattern R followed by 6 digits and 1 uppercase letter (regex: R\d{6}[A-Z]).
5. IF the CEA licence number format is invalid, THEN THE Auth_System SHALL display the error "Invalid CEA licence format. Expected format: R012345A" and prevent submission.
6. WHEN registration succeeds, THE Auth_System SHALL redirect the user to /dashboard.
7. IF registration fails, THEN THE Auth_System SHALL display the error message returned by Supabase.
8. THE Auth_System SHALL accept phone as an optional field during registration.

### Requirement 5: Session Management

**User Story:** As a property agent, I want my session to persist across page loads, so that I do not need to re-authenticate on every request.

#### Acceptance Criteria

1. THE Supabase_Client SHALL store and retrieve session tokens using HTTP cookies via the Next.js cookies API.
2. THE Auth_Middleware SHALL refresh session cookies on every request by reading and re-setting cookies through the Supabase client.
3. WHEN the Supabase_Client setAll method is called from a Server Component context, THE Supabase_Client SHALL silently ignore the cookie write failure since the middleware handles session refresh.
4. THE Supabase_Client SHALL use the NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables for configuration.

### Requirement 6: Sign Out

**User Story:** As a property agent, I want to sign out of my account, so that my session is terminated and my data is protected on shared devices.

#### Acceptance Criteria

1. WHEN a POST request is made to /auth/signout, THE Signout_Handler SHALL call supabase.auth.signOut() and redirect to /login.
2. WHEN a GET request is made to /auth/signout, THE Signout_Handler SHALL call supabase.auth.signOut() and redirect to /login.
3. THE Signout_Handler SHALL clear the user session completely so that subsequent requests are treated as unauthenticated.

### Requirement 7: Dashboard Layout Authentication Guard

**User Story:** As a system operator, I want the dashboard layout to verify authentication server-side, so that protected UI components are never rendered for unauthenticated users.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL verify the user session by calling supabase.auth.getUser() on the server before rendering.
2. IF no authenticated user is found, THEN THE Dashboard_Layout SHALL redirect to /login using Next.js server-side redirect.
3. WHEN an authenticated user is confirmed, THE Dashboard_Layout SHALL render the Sidebar component (visible on desktop, hidden on mobile), the MobileNav component (visible on mobile, hidden on desktop), and the ToastProvider.
4. THE Dashboard_Layout SHALL provide a responsive layout with the sidebar hidden below the lg breakpoint and the mobile bottom navigation hidden at or above the lg breakpoint.

### Requirement 8: Tenant Data Model

**User Story:** As a system operator, I want each agent or agency to be represented as a tenant with subscription and configuration data, so that the system can enforce plan limits and customize behavior per tenant.

#### Acceptance Criteria

1. THE Tenant SHALL contain the following required fields: id (string), name (string), subscription_plan (free, pro, or team), subscription_status (active, trialing, past_due, or cancelled), settings_json (TenantSettings object), and created_at (string timestamp).
2. THE Tenant SHALL contain the following optional fields: cea_registration_number (string or null), stripe_customer_id (string or null), and stripe_subscription_id (string or null).
3. THE Tenant_Settings SHALL define data_retention_years with a default value of 5.
4. THE Tenant_Settings SHALL define daily_digest_time with a default value of "08:30".
5. THE Tenant_Settings SHALL define email_inbound_address using the pattern "leads+{tenant_id}@cinvea.com".
6. THE Tenant_Settings SHALL define default_currency with a default value of "SGD".

### Requirement 9: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want my data to be completely isolated from other agents, so that my leads, listings, and deals remain private and secure.

#### Acceptance Criteria

1. THE Auth_System SHALL enforce Row-Level Security policies on all database tables to restrict data access to the authenticated user's tenant.
2. WHEN a database query is executed with the Supabase anon key client, THE RLS policies SHALL filter results to only return rows belonging to the authenticated user's tenant.
3. WHEN a database insert is executed, THE RLS policies SHALL associate the new row with the authenticated user's tenant.
4. THE Auth_System SHALL provide a service role admin client for system-level operations (webhooks, background jobs) that bypass RLS when tenant context is not applicable.

### Requirement 10: Stripe Subscription Integration

**User Story:** As a system operator, I want tenant subscriptions managed through Stripe, so that billing is automated and plan access is enforced.

#### Acceptance Criteria

1. THE Tenant SHALL store the stripe_customer_id linking the tenant to a Stripe customer record.
2. THE Tenant SHALL store the stripe_subscription_id linking the tenant to an active Stripe subscription.
3. THE Tenant SHALL track subscription_status with values: active (current subscription), trialing (within trial period), past_due (payment failed), and cancelled (subscription ended).
4. THE Tenant SHALL support subscription_plan values of free (no Stripe subscription required), pro, and team.

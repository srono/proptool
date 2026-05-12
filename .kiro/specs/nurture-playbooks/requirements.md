# Requirements Document

## Introduction

Nurture & Playbooks is a systematic outreach module for PropAgent SG that enables Singapore property agents to nurture past leads and contacts with timely, compliant 1:1 outreach — primarily via WhatsApp. The feature allows agents to define playbooks (predefined sequences of touchpoints) targeting specific segments (e.g., HDB owners approaching MOP), which automatically generate scheduled nurture tasks at the right time relative to a trigger date. Phase 1 focuses on manual agent-driven execution with task generation, while Phase 2 introduces auto-send capabilities. The system honours existing PDPA consent and DNC safeguards throughout.

## Glossary

- **Nurture_System**: The module responsible for managing playbooks, segments, nurture task generation, and the nurture view within PropAgent SG
- **Playbook**: A predefined sequence of touchpoints (steps) targeting a specific contact segment, with timing relative to a trigger date field
- **Segment**: A saved filter definition (JSON conditions) that determines which contacts are eligible for a playbook
- **Nurture_Task**: A scheduled action (WhatsApp message, call, or email) created by a playbook step and assigned to an agent for manual execution
- **Trigger_Field**: A date field on the contact record (e.g., mop_date, purchase_completion_date, tenancy_end_date) that drives the timing of playbook steps
- **Offset_Days**: An integer representing the number of days relative to the trigger field; negative values indicate days before the trigger date, positive values indicate days after
- **Task_Generator**: The background job that evaluates active playbooks, computes eligible contacts, and creates pending nurture tasks within the scheduling horizon
- **Nurture_View**: The UI tab under CRM that displays all nurture contacts, their playbook progress, and provides one-tap action buttons
- **Message_Template**: A predefined WhatsApp or email message with placeholders that can be resolved with contact-specific data
- **MOP_Date**: Minimum Occupation Period date — the date after which an HDB owner may sell their flat on the open market (typically 5 years from key collection)
- **Consent_Badge**: A visual indicator (🟢 valid consent / 🟡 partial consent / 🔴 no consent or withdrawn) showing a contact's PDPA consent status
- **Scheduling_Horizon**: The number of days into the future that the Task_Generator looks ahead when creating nurture tasks (default: 7 days)
- **PDPA**: Personal Data Protection Act — Singapore's data protection legislation governing collection, use, and disclosure of personal data
- **DNC**: Do Not Call Registry — Singapore's registry of phone numbers whose owners have opted out of receiving marketing messages

## Requirements

### Requirement 1: Contact Ownership Fields Extension

**User Story:** As a property agent, I want to record property ownership details for my contacts, so that I can segment them for targeted nurture campaigns based on their owned property type and MOP timeline.

#### Acceptance Criteria

1. THE Nurture_System SHALL extend the contacts table with the following fields: owned_property_type (enum: none, hdb, private, landed, commercial), owned_property_label (text, max 200 characters), owned_property_town (text, max 100 characters), owned_property_flat_type (text, max 50 characters), owned_property_key_collection_date (date, nullable), mop_date (date, nullable), mop_date_manual_override (boolean, default false), and channel_preference (enum: whatsapp, email, phone, none).
2. WHEN owned_property_key_collection_date is set and owned_property_type is "hdb" and mop_date_manual_override is false, THE Nurture_System SHALL compute mop_date as owned_property_key_collection_date plus 5 years.
3. WHEN a contact's owned_property_type is updated to a value other than "hdb", THE Nurture_System SHALL set mop_date to null and set mop_date_manual_override to false.
4. WHEN an agent manually sets or updates the mop_date field, THE Nurture_System SHALL set mop_date_manual_override to true, preserving the agent-supplied value regardless of owned_property_key_collection_date changes.
5. WHEN a contact's owned_property_type is updated to "hdb" and owned_property_key_collection_date is already set and mop_date_manual_override is false, THE Nurture_System SHALL compute mop_date as owned_property_key_collection_date plus 5 years.
6. THE Nurture_System SHALL enforce that owned_property_type defaults to "none" and channel_preference defaults to "none" for new contacts.
7. THE Nurture_System SHALL enforce Row-Level Security on all new contact fields, scoping access to the authenticated agent's tenant_id.

### Requirement 2: Playbook Management

**User Story:** As a property agent, I want to create and manage playbooks that define a sequence of outreach steps for a specific segment, so that I can systematically nurture contacts without manually tracking who to contact and when.

#### Acceptance Criteria

1. THE Nurture_System SHALL allow agents to create a playbook with: name, description, active status, segment_definition_json, trigger_field, and steps_json.
2. THE Nurture_System SHALL validate that segment_definition_json contains valid filter conditions referencing existing contact or lead fields, rejecting unknown field names with an error message indicating the invalid field.
3. THE Nurture_System SHALL validate that trigger_field references a date-type field on the contacts table (mop_date, owned_property_key_collection_date, or a custom date field), rejecting invalid values with an error message indicating accepted field names.
4. THE Nurture_System SHALL validate that steps_json contains at least one step and no more than 50 steps, and each step includes offset_days (integer, range -365 to 365), channel (whatsapp, email, call, or task_only), title (text, max 80 characters), and create_task (boolean).
5. WHEN a playbook is created, THE Nurture_System SHALL store the creating agent's user_id in created_by and set created_at to the current timestamp.
6. THE Nurture_System SHALL allow agents to activate or deactivate a playbook by toggling the active field.
7. WHEN a playbook is deactivated, THE Nurture_System SHALL stop generating new nurture tasks for that playbook but preserve existing pending tasks.
8. THE Nurture_System SHALL enforce Row-Level Security on playbooks, scoping access to the authenticated agent's tenant_id.
9. THE Nurture_System SHALL allow agents to edit an existing playbook's name, description, segment_definition_json, trigger_field, and steps_json.
10. WHEN a playbook's steps_json is updated, THE Nurture_System SHALL not modify existing nurture tasks that were already generated from previous step definitions.
11. THE Nurture_System SHALL prevent deletion of a playbook while associated nurture tasks with status "pending" or "snoozed" exist, displaying an error message indicating the playbook has active tasks.

### Requirement 3: Playbook Step Definition

**User Story:** As a property agent, I want to define individual steps within a playbook with specific timing, channel, and message template, so that each touchpoint is precisely scheduled relative to the contact's trigger date.

#### Acceptance Criteria

1. THE Nurture_System SHALL support playbook steps with the following fields: offset_days (integer), channel (enum: whatsapp, email, call, task_only), template_id (nullable reference to a message template), create_task (boolean), and title (text, maximum 80 characters).
2. THE Nurture_System SHALL allow negative offset_days values to schedule steps before the trigger date, positive values to schedule steps after the trigger date, and zero to schedule steps on the trigger date itself, within a range of -365 to 365.
3. WHEN channel is "whatsapp" or "email", THE Nurture_System SHALL allow associating a template_id with the step for pre-filled message content, but SHALL NOT require template_id (allowing the agent to compose a message manually at execution time).
4. WHEN channel is "call" or "task_only", THE Nurture_System SHALL not require a template_id and SHALL ignore any template_id value if provided.
5. THE Nurture_System SHALL order steps within a playbook by offset_days in ascending order for display purposes, and WHEN multiple steps share the same offset_days value, THE Nurture_System SHALL use step creation order as the secondary sort.
6. THE Nurture_System SHALL allow multiple steps with the same offset_days value within a single playbook, up to a maximum of 50 steps per playbook.
7. IF an agent attempts to save a playbook step with a title exceeding 80 characters or an offset_days value outside the range of -365 to 365, THEN THE Nurture_System SHALL reject the input and display an error message indicating the validation failure.

### Requirement 4: Nurture Task Generation

**User Story:** As a property agent, I want the system to automatically generate nurture tasks based on active playbooks, so that I receive timely reminders to reach out to contacts without manually calculating dates.

#### Acceptance Criteria

1. THE Task_Generator SHALL run on a scheduled basis at a configurable interval (minimum once every 60 minutes) to evaluate all active playbooks within the agent's tenant.
2. WHEN evaluating a playbook, THE Task_Generator SHALL compute eligible contacts by applying the playbook's segment_definition_json filter conditions against the contacts table.
3. THE Task_Generator SHALL exclude contacts where: whatsapp_optin is false and the step channel is "whatsapp", channel_preference is "none", or the contact has a lead with status "closed_won" or "closed_lost" whose data_retention_expiry is earlier than the current date.
4. WHEN computing tasks for an eligible contact and playbook step, THE Task_Generator SHALL compute touch_date as the contact's trigger_field value plus the step's offset_days.
5. IF the contact's trigger_field value is null, THEN THE Task_Generator SHALL skip that contact for the playbook and not generate any tasks for it.
6. WHEN touch_date falls within the Scheduling_Horizon (default 7 days from today) and no existing nurture_task exists for the same contact_id, playbook_id, and step_id combination, THE Task_Generator SHALL create a pending nurture_task.
7. THE Task_Generator SHALL assign the nurture_task to the agent specified in the contact's lead assigned_to field, or to the playbook's created_by agent if no lead assignment exists.
8. THE Task_Generator SHALL set the nurture_task due_at to the computed touch_date.
9. THE Task_Generator SHALL set the nurture_task channel to match the playbook step's channel value.
10. IF the Task_Generator encounters an error processing a specific contact, THEN THE Task_Generator SHALL log the error and continue processing remaining contacts without halting the entire job.
11. THE Task_Generator SHALL create nurture tasks with status "pending".
12. WHEN a contact matches multiple active playbooks, THE Task_Generator SHALL generate tasks independently for each matching playbook.

### Requirement 5: Nurture Task Lifecycle

**User Story:** As a property agent, I want to manage nurture tasks through their lifecycle (pending, done, skipped, snoozed), so that I can track my outreach progress and handle tasks flexibly.

#### Acceptance Criteria

1. THE Nurture_System SHALL support nurture task statuses: pending, done, skipped, and snoozed, with valid transitions limited to: pending → done, pending → skipped, pending → snoozed, and snoozed → pending.
2. WHEN an agent marks a nurture task as "done", THE Nurture_System SHALL set completed_at to the current timestamp and update the status to "done".
3. WHEN an agent marks a nurture task as "skipped", THE Nurture_System SHALL update the status to "skipped" and set completed_at to the current timestamp.
4. WHEN an agent snoozes a nurture task, THE Nurture_System SHALL update the status to "snoozed" and require the agent to specify a new due_at date that is at least 1 day in the future and no more than 90 days from the current date.
5. WHEN a snoozed nurture task's due_at date is reached, THE Nurture_System SHALL automatically transition the task status back to "pending".
6. THE Nurture_System SHALL allow agents to add free-form notes (maximum 2000 characters) to a nurture task to record the outcome of the interaction.
7. THE Nurture_System SHALL store each nurture task with: id, tenant_id, contact_id, playbook_id, step_id, assigned_to, due_at, status, completed_at, channel, notes, and created_at.
8. IF an agent attempts a status transition that is not permitted by the valid transitions defined in criterion 1, THEN THE Nurture_System SHALL reject the action and display an error message indicating the transition is not allowed.
9. THE Nurture_System SHALL enforce Row-Level Security on nurture_tasks, scoping access to the authenticated agent's tenant_id.

### Requirement 6: Nurture View

**User Story:** As a property agent, I want a dedicated nurture view that shows all contacts in active playbooks with their next actions, so that I can efficiently manage my daily nurture outreach from one screen.

#### Acceptance Criteria

1. THE Nurture_View SHALL appear as a tab under the CRM section of the application.
2. THE Nurture_View SHALL display a list of contacts with active nurture tasks, showing columns: contact name, owned property summary (owned_property_type, owned_property_label, owned_property_town), segment tags, next action (step title and due date), last activity date, and Consent_Badge.
3. THE Nurture_View SHALL display the Consent_Badge as 🟢 when the contact has whatsapp_optin set to true and the associated lead's ad_purpose matches the playbook step's channel intent, 🟡 when whatsapp_optin is true but the associated lead has no ad_purpose or the ad_purpose does not match the playbook step's channel intent, and 🔴 when whatsapp_optin is false, consent has been withdrawn, or channel_preference is "none".
4. THE Nurture_View SHALL provide one-tap action buttons per task row: Open WhatsApp thread, Call, View contact, Snooze, and Mark done.
5. WHEN the agent taps "Open WhatsApp thread", THE Nurture_View SHALL navigate to the unified message thread with the contact.
6. WHEN the agent taps "Call", THE Nurture_View SHALL deep-link to the device dialer with the contact's phone number pre-filled.
7. WHEN the agent taps "Snooze", THE Nurture_View SHALL prompt the agent to select a new due date and then update the nurture task status to "snoozed" with the selected date as the new due_at value.
8. WHEN the agent taps "Mark done", THE Nurture_View SHALL update the nurture task status to "done", set completed_at to the current timestamp, and remove the task from the active list.
9. IF the contact's Consent_Badge is 🔴, THEN THE Nurture_View SHALL disable the "Open WhatsApp thread" action button and display a visual indicator that consent is required before WhatsApp outreach.
10. THE Nurture_View SHALL order contacts by next action due_at in ascending order, showing overdue tasks first followed by upcoming tasks.
11. THE Nurture_View SHALL allow filtering by: playbook, status (pending, snoozed), assigned agent, and consent status (🟢, 🟡, 🔴).
12. WHEN no nurture tasks exist, THE Nurture_View SHALL display an empty state explaining how to create a playbook to get started.

### Requirement 7: Nurture Task Detail Panel

**User Story:** As a property agent, I want to see the full context of a nurture contact including upcoming steps and consent details, so that I can make informed decisions about how to approach each outreach.

#### Acceptance Criteria

1. WHEN the agent selects a contact in the Nurture_View, THE Nurture_System SHALL display a detail panel showing: upcoming playbook steps timeline, contact PDPA consent details, and a button to create an ad-hoc nurture task.
2. THE detail panel SHALL display the playbook steps timeline showing completed steps (with completion date), the current pending step (highlighted), and future scheduled steps with their computed due dates. WHEN a contact is enrolled in multiple playbooks, THE detail panel SHALL display a separate timeline section for each playbook.
3. THE detail panel SHALL display the contact's consent status including: whatsapp_optin value, consent_given_at date, consent_source, ad_purpose from the associated lead, and data_retention_expiry.
4. WHEN the agent taps "Create ad-hoc task", THE Nurture_System SHALL allow creating a nurture task not linked to any playbook step, with agent-specified channel, due_at (must be at least today), and title (max 80 characters). The ad-hoc task SHALL be associated with a playbook_id selected by the agent from active playbooks.
5. THE detail panel SHALL display the contact's owned property summary (type, label, town, flat type, MOP date).

### Requirement 8: WhatsApp Channel Execution (Phase 1)

**User Story:** As a property agent, I want nurture tasks to pre-fill WhatsApp message templates with contact-specific data, so that I can quickly personalise and send messages without composing from scratch.

#### Acceptance Criteria

1. WHEN a nurture task has channel "whatsapp" and an associated template_id, THE Nurture_System SHALL resolve template placeholders with contact-specific data (contact name, owned property label, MOP date, agent name) following the placeholder resolution rules defined in Message Template Management.
2. WHEN the agent opens a WhatsApp nurture task that has an associated template_id, THE Nurture_System SHALL navigate to the unified message thread with the resolved template text pre-filled in the composer.
3. WHEN the agent opens a WhatsApp nurture task that has no associated template_id, THE Nurture_System SHALL navigate to the unified message thread with the composer empty and ready for input.
4. THE Nurture_System SHALL allow the agent to edit the pre-filled message before sending.
5. WHEN the agent sends the message, THE Nurture_System SHALL update the nurture task status to "done", set completed_at to the current timestamp, and log an activity entry in the contact's activity timeline recording the playbook name, step title, and channel.
6. IF the template_id associated with a nurture task references a template that no longer exists, THEN THE Nurture_System SHALL navigate to the unified message thread with the composer empty and display an inline notice indicating the template is unavailable.
7. THE Nurture_System SHALL NOT auto-send any messages in Phase 1; all WhatsApp messages require manual agent action to send.

### Requirement 9: Call Channel Execution

**User Story:** As a property agent, I want call-type nurture tasks to provide quick dialer access and outcome logging, so that I can efficiently make nurture calls and record results.

#### Acceptance Criteria

1. WHEN the agent opens a call-type nurture task, THE Nurture_System SHALL deep-link to the device dialer with the contact's phone number pre-filled.
2. WHEN the agent returns to the application after initiating a call, THE Nurture_System SHALL display a prompt to log the call outcome in the nurture task notes field within 3 seconds of the app returning to the foreground.
3. WHEN the agent logs a call outcome and marks the task as done, THE Nurture_System SHALL record an entry in the contact's activity timeline containing: the playbook name, step title, call outcome notes, agent name, and completion timestamp.
4. IF the contact has no phone number on record, THEN THE Nurture_System SHALL disable the call action and display a message indicating that no phone number is available for the contact.

### Requirement 10: PDPA and DNC Safeguards

**User Story:** As a property agent, I want the system to enforce PDPA consent rules and warn me about contacts without appropriate consent, so that I remain compliant with Singapore data protection regulations during nurture outreach.

#### Acceptance Criteria

1. THE Task_Generator SHALL exclude contacts from nurture task generation where whatsapp_optin is false and the playbook step channel is "whatsapp".
2. THE Task_Generator SHALL exclude contacts from nurture task generation where channel_preference is "none".
3. THE Task_Generator SHALL exclude contacts where data_retention_expiry is not null and is earlier than the current date.
4. THE Nurture_View SHALL display the Consent_Badge on every nurture task row, computed in real time from the contact's current field values: 🟢 when whatsapp_optin is true and the contact's lead ad_purpose matches the playbook's target_ad_purpose, 🟡 when whatsapp_optin is true but ad_purpose does not match, and 🔴 when whatsapp_optin is false or channel_preference is "none".
5. WHEN an agent attempts to execute a nurture task for a contact whose lead ad_purpose value does not match the playbook's target_ad_purpose field, THE Nurture_System SHALL display a non-dismissible confirmation dialog indicating the specific consent gap and requiring the agent to explicitly confirm or cancel before proceeding.
6. THE Nurture_System SHALL check the contact's whatsapp_optin, consent_given_at, consent_source, data_retention_expiry, and channel_preference fields at task generation time and again at task execution time, excluding or blocking actions where any field indicates consent is absent or expired.
7. IF a contact's whatsapp_optin is set to false or channel_preference is set to "none" after a nurture task has been generated, THEN THE Nurture_System SHALL display the task with a 🔴 Consent_Badge and disable the WhatsApp and Call action buttons for that task until whatsapp_optin is restored to true and channel_preference is set to a value other than "none".
8. WHEN a nurture task has channel "call" and the contact's channel_preference is "phone" or "none", THE Nurture_System SHALL check the contact's dnc_registered field and, if true, display a 🔴 Consent_Badge and disable the Call action button for that task.

### Requirement 11: Nurture Analytics

**User Story:** As a property agent, I want to see analytics on my nurture efforts including funnel metrics and playbook performance, so that I can measure the effectiveness of my outreach and optimise my playbooks.

#### Acceptance Criteria

1. THE Nurture_System SHALL provide a Nurture Funnel report showing: total contacts in each active playbook, tasks created versus tasks completed, and deals originating from nurtured contacts, for a selected date range defaulting to the last 30 days.
2. THE Nurture_System SHALL provide a Playbook Performance report showing per-playbook metrics: tasks completed count, response rate, deals won (deals with status "completed" attributed to the playbook), and net commission from nurture-originated deals.
3. THE Nurture_System SHALL calculate response rate as the number of contacts who sent an inbound WhatsApp message within 7 days of a nurture task with channel "whatsapp" being marked as "done", divided by the total number of nurture tasks with channel "whatsapp" marked as "done" for that playbook within the selected date range.
4. THE Nurture_System SHALL attribute a deal to a playbook when the deal's contact_id matches a contact who received at least one completed nurture task from that playbook within 180 days before the deal was created.
5. THE Nurture_System SHALL display analytics data scoped to the authenticated agent's tenant_id.
6. WHEN no nurture tasks or deals exist for the selected date range, THE Nurture_System SHALL display an empty state indicating that no analytics data is available for the period.
7. THE Nurture_System SHALL allow the agent to select a date range for analytics reports, with preset options of last 7 days, last 30 days, last 90 days, and a custom date range with a maximum span of 365 days.

### Requirement 12: Segment Definition and Evaluation

**User Story:** As a property agent, I want to define segments using filter conditions on contact and lead fields, so that playbooks automatically target the right contacts without manual list management.

#### Acceptance Criteria

1. THE Nurture_System SHALL store segment definitions as JSON filter conditions in the playbook's segment_definition_json field, using the same filter structure as other list filters in the application (field-level conditions with equality matching for enum/text fields and range operators for date fields).
2. THE Nurture_System SHALL support filter conditions on contact fields including: owned_property_type, owned_property_town, owned_property_flat_type, mop_date (supporting "before", "after", and "between" date operators), channel_preference, and whatsapp_optin.
3. THE Nurture_System SHALL support filter conditions on associated lead fields including: ad_purpose, status, deal_type, and source. WHEN a contact has multiple associated leads, THE Nurture_System SHALL consider the contact eligible if at least one associated lead satisfies all lead-field conditions.
4. WHEN evaluating a segment, THE Task_Generator SHALL apply all filter conditions with AND logic (all conditions must match for a contact to be eligible).
5. IF a filter condition references a field that is null on a contact record, THEN THE Task_Generator SHALL treat that condition as not matched, excluding the contact from the segment.
6. IF segment_definition_json contains an empty conditions array or no conditions, THEN THE Task_Generator SHALL treat all contacts within the tenant as matching the segment.
7. THE Nurture_System SHALL re-evaluate segment membership on each Task_Generator run, so contacts who newly match the segment criteria are included and contacts who no longer match are excluded from future task generation.
8. WHEN a contact no longer matches the segment criteria, THE Nurture_System SHALL not delete existing pending nurture tasks for that contact but SHALL stop generating new tasks.
9. THE Nurture_System SHALL support a maximum of 10 filter conditions per segment definition.

### Requirement 13: Message Template Management

**User Story:** As a property agent, I want to create and manage message templates with placeholders, so that I can standardise my nurture messaging while still personalising each outreach.

#### Acceptance Criteria

1. THE Nurture_System SHALL allow agents to create message templates with a name (maximum 100 characters), channel (whatsapp or email), and body text (maximum 2000 characters) containing placeholders.
2. THE Nurture_System SHALL support the following placeholders in templates: {{contact_name}}, {{owned_property_label}}, {{owned_property_town}}, {{mop_date}}, {{agent_name}}, and {{trigger_date}}, where {{trigger_date}} resolves to the value of the contact's field specified by the associated playbook's trigger_field.
3. WHEN resolving a template for a specific contact, THE Nurture_System SHALL replace each placeholder with the corresponding contact or agent field value.
4. IF a placeholder references a null or empty field, THEN THE Nurture_System SHALL replace the placeholder with an empty string and display an inline visual indicator adjacent to the resolved gap so the agent can identify and fill the missing value manually before sending.
5. THE Nurture_System SHALL enforce Row-Level Security on message templates, scoping access to the authenticated agent's tenant_id.
6. THE Nurture_System SHALL allow agents to edit and delete message templates that are not currently referenced by an active playbook step.
7. WHEN a template is referenced by an active playbook step, THE Nurture_System SHALL allow editing the template but display a warning that changes will affect future nurture tasks using that template.
8. IF a template body contains text matching the placeholder syntax (double curly braces) that is not one of the supported placeholders, THEN THE Nurture_System SHALL reject the save and display an error message indicating the unsupported placeholder name.

### Requirement 14: Nurture Task Data Model

**User Story:** As a property agent, I want nurture tasks to capture all relevant context including playbook origin, step reference, and outcome, so that I have a complete audit trail of nurture activities.

#### Acceptance Criteria

1. THE Nurture_System SHALL store each nurture task with the following fields: id (UUID), tenant_id, contact_id, playbook_id, step_id, assigned_to (user_id), due_at (datetime), status (pending, done, skipped, snoozed), completed_at (nullable datetime), channel (whatsapp, email, call, note), notes (text, nullable, maximum 2000 characters), and created_at (datetime).
2. THE Nurture_System SHALL enforce that contact_id, playbook_id, and assigned_to are required fields on every nurture task.
3. THE Nurture_System SHALL allow step_id to be null for ad-hoc nurture tasks not linked to a playbook step.
4. THE Nurture_System SHALL enforce a unique constraint on the combination of contact_id, playbook_id, and step_id where step_id is not null, to prevent duplicate task generation for the same contact and step while allowing multiple ad-hoc tasks for the same contact and playbook.
5. THE Nurture_System SHALL support the channel values: whatsapp, email, call, and note.
6. THE Nurture_System SHALL enforce Row-Level Security on nurture tasks, scoping all read and write access to the authenticated agent's tenant_id.
7. IF a referenced contact or playbook is deleted, THEN THE Nurture_System SHALL prevent the deletion while associated nurture tasks with status "pending" or "snoozed" exist for that record.

### Requirement 15: Playbook Data Model

**User Story:** As a property agent, I want the playbook data structure to capture all configuration needed for automated task generation, so that the system can reliably schedule outreach without manual intervention.

#### Acceptance Criteria

1. THE Nurture_System SHALL store each playbook with the following fields: id, tenant_id, name (text, maximum 100 characters), description (text, maximum 500 characters), active (boolean), segment_definition_json, trigger_field, steps_json (array of step objects, minimum 1 step, maximum 50 steps), created_by (user_id), created_at, and updated_at.
2. THE Nurture_System SHALL maintain a flattened playbook_steps view for querying, containing: id, playbook_id, offset_days, channel, template_id, create_task, and title.
3. WHEN a playbook's steps_json is created or updated, THE Nurture_System SHALL synchronise the playbook_steps view by replacing all existing view rows for that playbook with rows derived from the current steps_json content.
4. IF synchronisation of the playbook_steps view fails, THEN THE Nurture_System SHALL reject the steps_json change, preserve the previous playbook_steps rows, and return an error message indicating the synchronisation failure.
5. THE Nurture_System SHALL enforce that playbook name is unique within a tenant, rejecting creation or update attempts that would result in a duplicate name with an error message indicating the name conflict.
6. THE Nurture_System SHALL enforce that trigger_field contains a valid date-type field name from the contacts table (mop_date, owned_property_key_collection_date, consent_given_at, data_retention_expiry, or a tenant-defined custom date field), rejecting invalid values with an error message indicating the accepted field names.

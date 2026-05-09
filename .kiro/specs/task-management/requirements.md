# Requirements Document

## Introduction

Task Management is a productivity feature of PropAgent SG — a Singapore Property Agent Operating System. It enables property agents to create, assign, prioritize, and track follow-up tasks linked to leads and deals. Tasks serve as actionable reminders ensuring no client interaction or transaction milestone is missed. The system provides overdue detection surfaced as a KPI on the dashboard, contextual task lists on lead and deal detail pages, and operates within the multi-tenant environment with row-level security ensuring data isolation between agencies.

## Glossary

- **Task_Management_System**: The PropAgent SG subsystem responsible for creating, storing, assigning, prioritizing, and tracking tasks
- **Task**: A time-bound action item assigned to an agent, optionally linked to a lead or deal, with a priority level and completion state
- **Dashboard_KPI_Strip**: The key performance indicator section on the main dashboard page displaying overdue task count alongside other metrics
- **Lead_Detail_View**: The single-lead page that displays associated tasks in the right sidebar
- **Deal_Detail_View**: The single-deal page that displays associated tasks
- **Overdue_Task**: A task where completed_at is null and due_at is earlier than the current timestamp
- **Task_Priority**: The urgency classification of a task, one of: high, medium, or low
- **Tenant**: An agency or team operating within PropAgent SG; all data is scoped to a tenant for isolation
- **RLS**: Row-Level Security — Supabase/PostgreSQL feature enforcing that users can only access data belonging to their tenant
- **Agent**: A property agent user within a tenant who can be assigned tasks

## Requirements

### Requirement 1: Task Data Model

**User Story:** As a property agent, I want tasks to capture all relevant information including assignment, priority, due date, and linkage to leads or deals, so that I can organize my follow-up actions effectively.

#### Acceptance Criteria

1. THE Task_Management_System SHALL store each task with the following required fields: unique identifier, tenant identifier, assigned agent identifier, title, due date-time, priority level, and created-at timestamp
2. THE Task_Management_System SHALL store an optional lead identifier for each task, allowing a task to be linked to a specific lead
3. THE Task_Management_System SHALL store an optional deal identifier for each task, allowing a task to be linked to a specific deal
4. THE Task_Management_System SHALL store a nullable completed-at timestamp for each task, representing when the task was marked as done
5. THE Task_Management_System SHALL support exactly three priority levels: high, medium, and low

### Requirement 2: Task Creation

**User Story:** As a property agent, I want to create tasks linked to my leads or deals, so that I can schedule follow-up actions and track commitments made to clients.

#### Acceptance Criteria

1. WHEN an agent creates a task, THE Task_Management_System SHALL require the following fields: title, due date-time, priority level, and assigned agent
2. WHEN an agent creates a task from a lead context, THE Task_Management_System SHALL automatically associate the task with that lead by storing the lead identifier
3. WHEN an agent creates a task from a deal context, THE Task_Management_System SHALL automatically associate the task with that deal by storing the deal identifier
4. WHEN a task is created without a lead or deal context, THE Task_Management_System SHALL store the task as a standalone task with both lead identifier and deal identifier set to null
5. THE Task_Management_System SHALL set the created-at timestamp to the current time when a task is created

### Requirement 3: Task Assignment

**User Story:** As a property agent, I want to assign tasks to myself or other agents in my team, so that work can be distributed and tracked across the agency.

#### Acceptance Criteria

1. THE Task_Management_System SHALL require every task to have an assigned agent
2. WHEN a task is created, THE Task_Management_System SHALL allow the creating agent to assign the task to any agent within the same tenant
3. THE Task_Management_System SHALL store the assigned agent as a reference to the agent's user identifier

### Requirement 4: Task Completion

**User Story:** As a property agent, I want to mark tasks as complete when I finish them, so that I can track my progress and focus on remaining work.

#### Acceptance Criteria

1. WHEN an agent marks a task as complete, THE Task_Management_System SHALL set the completed-at timestamp to the current time
2. WHEN a task has a non-null completed-at timestamp, THE Task_Management_System SHALL treat the task as completed
3. WHEN a task has a null completed-at timestamp, THE Task_Management_System SHALL treat the task as incomplete

### Requirement 5: Overdue Task Detection

**User Story:** As a property agent, I want the system to automatically identify overdue tasks, so that I can prioritize catching up on missed deadlines.

#### Acceptance Criteria

1. WHEN a task has a null completed-at timestamp and the due date-time is earlier than the current timestamp, THE Task_Management_System SHALL classify the task as overdue
2. WHEN a task has a non-null completed-at timestamp, THE Task_Management_System SHALL classify the task as not overdue regardless of the due date-time
3. THE Task_Management_System SHALL compute the overdue task count by counting all tasks where completed-at is null and due date-time is earlier than the current timestamp within the agent's tenant

### Requirement 6: Dashboard Overdue KPI

**User Story:** As a property agent, I want to see the count of overdue tasks on my dashboard, so that I am immediately aware of missed deadlines when I start my day.

#### Acceptance Criteria

1. THE Dashboard_KPI_Strip SHALL display the total count of overdue tasks for the current tenant
2. THE Dashboard_KPI_Strip SHALL compute overdue tasks as those where completed-at is null and due date-time is earlier than the current timestamp
3. THE Dashboard_KPI_Strip SHALL display the overdue task count alongside other KPIs: active leads, viewings booked, and new leads this week

### Requirement 7: Tasks on Lead Detail View

**User Story:** As a property agent, I want to see all tasks associated with a lead on the lead detail page, so that I can track follow-up actions in the context of that client relationship.

#### Acceptance Criteria

1. THE Lead_Detail_View SHALL display all tasks linked to the current lead in the right sidebar
2. THE Lead_Detail_View SHALL display for each task: title, due date, and completion status
3. THE Lead_Detail_View SHALL visually distinguish completed tasks from incomplete tasks using a check mark icon and strikethrough text styling
4. THE Lead_Detail_View SHALL display incomplete tasks with a circle icon and standard text styling
5. THE Lead_Detail_View SHALL format task due dates using Singapore locale (day and abbreviated month)

### Requirement 8: Tasks on Deal Detail View

**User Story:** As a property agent, I want to see all tasks associated with a deal on the deal detail page, so that I can track transaction-related actions alongside deal milestones.

#### Acceptance Criteria

1. THE Deal_Detail_View SHALL display all tasks linked to the current deal
2. THE Deal_Detail_View SHALL display for each task: title, due date, and completion status
3. THE Deal_Detail_View SHALL visually distinguish completed tasks from incomplete tasks

### Requirement 9: Task Priority Display

**User Story:** As a property agent, I want tasks to show their priority level, so that I can focus on high-priority items first.

#### Acceptance Criteria

1. THE Task_Management_System SHALL associate each task with exactly one priority level: high, medium, or low
2. WHEN a task is created without an explicit priority, THE Task_Management_System SHALL default the priority to medium
3. THE Lead_Detail_View SHALL make the priority level available for each displayed task

### Requirement 10: Multi-Tenancy and Data Isolation

**User Story:** As an agency administrator, I want all task data to be isolated between tenants, so that agents from different agencies cannot access each other's tasks.

#### Acceptance Criteria

1. THE Task_Management_System SHALL associate every task record with a tenant_id
2. THE Task_Management_System SHALL enforce row-level security policies ensuring users can only query tasks belonging to their own tenant
3. WHEN a task is created, THE Task_Management_System SHALL automatically set the tenant_id to the creating agent's tenant
4. THE Dashboard_KPI_Strip SHALL compute overdue task counts scoped to the current user's tenant only

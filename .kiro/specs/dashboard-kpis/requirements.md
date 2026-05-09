# Requirements Document

## Introduction

The Dashboard & KPIs feature is the primary landing page of PropAgent SG, providing Singapore property agents with an at-a-glance operational overview upon login. The dashboard surfaces four key performance indicators (Active Leads, Viewings Booked, Closing Pipeline, Overdue Tasks), a daily AI-driven brief highlighting the highest-leverage action, a visual pipeline funnel showing lead distribution across stages, and a schedule card listing upcoming events. The page is rendered as a Next.js 15 Server Component at /dashboard, uses Supabase for real-time data queries, and adapts from a two-column desktop layout to a single-column mobile layout with a dark theme (bg-onyx).

## Glossary

- **Dashboard_Page**: The server-rendered page at /dashboard that aggregates and displays KPIs, TheBrief, PipelineFunnel, and ScheduleCard components
- **KPI_Strip**: A horizontal strip of four metric cards displaying Active Leads, Viewings Booked, Closing Pipeline, and Overdue Tasks
- **KPI_Card**: An individual metric card within the KPI_Strip showing a label, numeric value, detail text, and sparkline
- **TheBrief**: A daily hero component that surfaces the highest-leverage action for the agent, including talking points and risk factors
- **Pipeline_Funnel**: A vertical bar chart component showing lead distribution across pipeline stages
- **Schedule_Card**: A component listing upcoming events (calls, viewings, deal signings) for the current day
- **Active_Leads**: The count of leads whose status is not closed_won and not closed_lost
- **Viewings_Booked**: The count of viewings with status "scheduled" and scheduled_at on or after the current timestamp
- **Overdue_Tasks**: The count of tasks where completed_at is null and due_at is before the current timestamp
- **New_Leads_This_Week**: The count of leads with created_at within the last 7 days from the current timestamp
- **Pipeline_Stage**: One of: new_lead, contacted, qualified, viewing_booked, viewing_done, negotiating, otp_loi_issued, closed_won, closed_lost, nurture
- **Sparkline**: A small inline SVG line chart rendered within a KPI_Card to show a 7-point trend
- **Event_Tag**: A categorization label for schedule items — one of: lead, viewing, or deal

## Requirements

### Requirement 1: Dashboard Page Header

**User Story:** As a property agent, I want to see today's date and a contextual greeting when I open the dashboard, so that I have immediate temporal orientation and awareness of urgent items.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL display the current date formatted in en-SG locale with weekday, day, and month (e.g., "Monday, 14 July").
2. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL display a greeting message that includes the count of Overdue_Tasks requiring follow-up.
3. THE Dashboard_Page SHALL display a "Stamp duty" quick-link that navigates to /tools/stamp-duty.
4. THE Dashboard_Page SHALL display a "+ New lead" quick-link that navigates to /leads/new.
5. THE Dashboard_Page SHALL render the header with a bottom border separating it from the content below.

### Requirement 2: KPI Strip Display

**User Story:** As a property agent, I want to see my four key performance metrics at a glance, so that I can quickly assess my business health without navigating to separate reports.

#### Acceptance Criteria

1. THE KPI_Strip SHALL display exactly four KPI_Cards in a horizontal row on desktop (4 columns) and a 2x2 grid on mobile (2 columns).
2. THE KPI_Strip SHALL display the following metrics in order: Active Leads, Viewings Booked, Closing Pipeline, and Overdue Tasks.
3. WHEN the KPI_Strip renders, each KPI_Card SHALL display a label, a numeric value, a detail text, and a Sparkline.
4. WHEN the Overdue_Tasks count is displayed, THE KPI_Card SHALL render the numeric value in a warning colour (red) to indicate urgency.
5. WHEN a KPI_Card displays a non-warning metric, THE KPI_Card SHALL render the numeric value in white.

### Requirement 3: Active Leads KPI Calculation

**User Story:** As a property agent, I want to know how many leads are currently active in my pipeline, so that I can gauge my workload and prospecting effectiveness.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL query the leads table and count all leads where status is not "closed_won" and status is not "closed_lost".
2. THE KPI_Card for Active Leads SHALL display the detail text showing the New_Leads_This_Week count with a "+N wk" format.
3. IF the query returns null, THEN THE KPI_Card SHALL display 0 as the Active Leads value.

### Requirement 4: Viewings Booked KPI Calculation

**User Story:** As a property agent, I want to see how many upcoming viewings are scheduled, so that I can plan my time and prepare for client meetings.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL query the viewings table and count all viewings where status equals "scheduled" and scheduled_at is on or after the current timestamp.
2. THE KPI_Card for Viewings Booked SHALL display the detail text "this week".
3. IF the query returns null, THEN THE KPI_Card SHALL display 0 as the Viewings Booked value.

### Requirement 5: Overdue Tasks KPI Calculation

**User Story:** As a property agent, I want to see how many tasks are overdue, so that I can prioritise follow-ups and avoid losing leads due to inaction.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL query the tasks table and count all tasks where completed_at is null and due_at is before the current timestamp.
2. THE KPI_Card for Overdue Tasks SHALL display the detail text "Action needed".
3. IF the query returns null, THEN THE KPI_Card SHALL display 0 as the Overdue Tasks value.

### Requirement 6: New Leads This Week KPI Calculation

**User Story:** As a property agent, I want to know how many new leads arrived in the past 7 days, so that I can track lead generation momentum.

#### Acceptance Criteria

1. WHEN the Dashboard_Page loads, THE Dashboard_Page SHALL query the leads table and count all leads where created_at is within the last 7 days (168 hours) from the current timestamp.
2. THE Dashboard_Page SHALL pass the New_Leads_This_Week value to the KPI_Strip for display within the Active Leads KPI_Card detail text.
3. IF the query returns null, THEN THE Dashboard_Page SHALL use 0 as the New_Leads_This_Week value.

### Requirement 7: Sparkline Visualisation

**User Story:** As a property agent, I want to see a mini trend line next to each KPI, so that I can quickly identify whether metrics are improving or declining.

#### Acceptance Criteria

1. THE Sparkline SHALL render as an SVG element with a width of 80 pixels and a height of 32 pixels.
2. THE Sparkline SHALL accept an array of 7 numeric data points and plot them as a connected polyline.
3. THE Sparkline SHALL scale data points vertically to use 85% of the available height, with a 2-pixel bottom offset.
4. WHEN the KPI_Card is a warning metric, THE Sparkline SHALL render the polyline stroke in red (#FF5A5A).
5. WHEN the KPI_Card is a non-warning metric, THE Sparkline SHALL render the polyline stroke in aqua (#8EFEFF).

### Requirement 8: TheBrief Component

**User Story:** As a property agent, I want a daily AI-driven brief highlighting my highest-leverage action, so that I can focus on the most impactful activity first.

#### Acceptance Criteria

1. THE TheBrief SHALL render as a hero card with a blue gradient background (from brand-deep via brand to #0C5AFF).
2. THE TheBrief SHALL display a header label with the text "THE BRIEF" followed by a time indicator.
3. THE TheBrief SHALL display a main message identifying the highest-leverage lead and the reason for prioritisation.
4. THE TheBrief SHALL display contextual details including property information, budget, and recent comparable transaction data.
5. WHEN rendered on desktop, THE TheBrief SHALL display a three-column layout: main message, "WHAT TO SAY" talking points, and "RISK / WATCHOUT" items.
6. WHEN rendered on mobile, THE TheBrief SHALL display only the main message column and hide the talking points and risk columns.
7. THE TheBrief SHALL provide an "Open thread" button that navigates to /messages.
8. THE TheBrief SHALL provide a "Skip · next lead" button to dismiss the current brief.

### Requirement 9: Pipeline Funnel Visualisation

**User Story:** As a property agent, I want to see a visual funnel of my lead pipeline, so that I can identify bottlenecks and understand where leads are concentrated.

#### Acceptance Criteria

1. THE Pipeline_Funnel SHALL display vertical bars representing each Pipeline_Stage in order: New, Contacted, Qualified, Viewing, Negotiating, OTP, Closed.
2. THE Pipeline_Funnel SHALL display the lead count above each bar.
3. THE Pipeline_Funnel SHALL display the stage label below each bar in uppercase text.
4. THE Pipeline_Funnel SHALL render bars with decreasing heights from left to right to create a funnel visual effect.
5. THE Pipeline_Funnel SHALL highlight the "Viewing" stage bar in aqua (#8EFEFF) and render all other bars in a blue gradient (from #2859F7 to #0945E6).
6. THE Pipeline_Funnel SHALL display a header with the title "Pipeline · this week" and an "Open board" link that navigates to /pipeline.
7. THE Pipeline_Funnel SHALL render within a card container with a fixed bar area height of 140 pixels.

### Requirement 10: Schedule Card

**User Story:** As a property agent, I want to see my upcoming events for today, so that I can prepare for calls, viewings, and signings without checking a separate calendar.

#### Acceptance Criteria

1. THE Schedule_Card SHALL display a list of upcoming events for the current day.
2. THE Schedule_Card SHALL display a header with the title "Schedule" and the total event count.
3. WHEN an event is displayed, THE Schedule_Card SHALL show the event time in HH:MM format, the event label, and an Event_Tag.
4. THE Schedule_Card SHALL render Event_Tags with distinct colour styles: "lead" in aqua, "viewing" in amber, and "deal" in green.
5. THE Schedule_Card SHALL separate events with a horizontal border line, except for the last event in the list.

### Requirement 11: Responsive Layout

**User Story:** As a property agent, I want the dashboard to work well on both desktop and mobile devices, so that I can check my KPIs whether I am at my desk or on-site with clients.

#### Acceptance Criteria

1. WHEN rendered on desktop (viewport width >= 1024px), THE Dashboard_Page SHALL display the Pipeline_Funnel and Schedule_Card in a two-column grid with a 1.3fr to 1fr ratio.
2. WHEN rendered on mobile (viewport width < 1024px), THE Dashboard_Page SHALL stack the Pipeline_Funnel and Schedule_Card in a single column.
3. THE Dashboard_Page SHALL apply padding of 16px on mobile and 28px on desktop.
4. THE Dashboard_Page SHALL maintain a vertical spacing of 20px between major sections (header, TheBrief, KPI_Strip, grid).

### Requirement 12: Server-Side Data Fetching

**User Story:** As a property agent, I want the dashboard to load quickly with pre-fetched data, so that I see my KPIs immediately without waiting for client-side API calls.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL be rendered as a Next.js Server Component that fetches all KPI data on the server before sending HTML to the client.
2. WHEN fetching KPI data, THE Dashboard_Page SHALL execute Supabase queries using count-only mode (head: true, count: "exact") to minimise data transfer.
3. IF any KPI query returns a null count, THEN THE Dashboard_Page SHALL default the value to 0.
4. THE Dashboard_Page SHALL pass computed KPI values as props to the KPI_Strip client component.

### Requirement 13: Visual Theme and Styling

**User Story:** As a property agent, I want a visually cohesive dark-themed dashboard, so that the interface is easy on the eyes during long working sessions and maintains brand consistency.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL use the dark theme with bg-onyx as the page background colour.
2. THE KPI_Card SHALL render with a bg-onyx-card background and a border-onyx-line border with rounded-2xl corners.
3. THE Pipeline_Funnel and Schedule_Card SHALL render with bg-onyx-card backgrounds and border-onyx-line borders with rounded-2xl corners.
4. THE Dashboard_Page SHALL use the project's font-display typeface for headings, labels, and numeric values.
5. THE Dashboard_Page SHALL use white (#FFFFFF) for primary text and gray-2 for secondary/detail text.

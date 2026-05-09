# Requirements Document

## Introduction

This feature adds drag-and-drop functionality to the pipeline Kanban board, allowing agents to move lead cards between pipeline stages by dragging them. The implementation uses @dnd-kit for accessible, performant drag-and-drop with touch support, optimistic UI updates, and visual feedback during drag operations.

## Glossary

- **Pipeline_Board**: The Kanban-style board component that displays leads organized into columns by pipeline stage
- **Lead_Card**: A card component representing a single lead, displaying contact info, urgency, and deal type
- **Stage_Column**: A vertical column on the Pipeline_Board representing one pipeline stage (e.g., "New Lead", "Contacted")
- **Drag_Overlay**: A visual clone of the Lead_Card that follows the cursor during a drag operation
- **Drop_Zone**: The area within a Stage_Column where a Lead_Card can be dropped to change its stage
- **DnD_Context**: The @dnd-kit DndContext provider that wraps the board and manages drag state
- **Optimistic_Update**: Immediately moving the card in the UI before the server confirms the stage change
- **Supabase_Client**: The client-side Supabase SDK instance used for database mutations

## Requirements

### Requirement 1: Draggable Lead Cards

**User Story:** As an agent, I want to drag lead cards on the pipeline board, so that I can quickly move leads between stages without using a dropdown.

#### Acceptance Criteria

1. WHEN an agent presses and holds a Lead_Card for 150ms, THE Pipeline_Board SHALL initiate a drag operation for that card
2. WHILE a drag operation is active, THE Pipeline_Board SHALL display a Drag_Overlay that follows the pointer position
3. WHILE a drag operation is active, THE Pipeline_Board SHALL reduce the opacity of the original Lead_Card to indicate it is being moved
4. WHEN a drag operation is cancelled (e.g., pressing Escape or releasing outside a Drop_Zone), THE Pipeline_Board SHALL return the Lead_Card to its original position with no state change

### Requirement 2: Droppable Stage Columns

**User Story:** As an agent, I want stage columns to accept dropped lead cards, so that I can visually reassign a lead to a new pipeline stage.

#### Acceptance Criteria

1. WHILE a Lead_Card is dragged over a Stage_Column, THE Stage_Column SHALL display visual highlighting to indicate it is a valid drop target
2. WHEN a Lead_Card is dropped onto a Stage_Column different from its current stage, THE Pipeline_Board SHALL update the lead's status to the target stage
3. WHEN a Lead_Card is dropped onto its current Stage_Column, THE Pipeline_Board SHALL take no action and restore the card to its original position

### Requirement 3: Optimistic UI Updates

**User Story:** As an agent, I want the board to update immediately when I drop a card, so that the interface feels responsive without waiting for server confirmation.

#### Acceptance Criteria

1. WHEN a Lead_Card is dropped onto a new Stage_Column, THE Pipeline_Board SHALL immediately move the card to the target column before receiving server confirmation
2. WHEN the Supabase_Client confirms the stage update, THE Pipeline_Board SHALL keep the card in its new position
3. IF the Supabase_Client returns an error during stage update, THEN THE Pipeline_Board SHALL revert the card to its original Stage_Column and display an error notification

### Requirement 4: Server Persistence

**User Story:** As an agent, I want stage changes from drag-and-drop to persist in the database, so that the pipeline state is saved reliably.

#### Acceptance Criteria

1. WHEN a Lead_Card is dropped onto a new Stage_Column, THE Supabase_Client SHALL send an update request setting the lead's status to the target stage key
2. WHEN the stage update succeeds, THE Pipeline_Board SHALL call router.refresh() to revalidate server-side data

### Requirement 5: Visual Feedback During Drag

**User Story:** As an agent, I want clear visual cues during drag operations, so that I can easily see where I am dragging and where I can drop.

#### Acceptance Criteria

1. WHILE a drag operation is active, THE Drag_Overlay SHALL render a styled copy of the Lead_Card with elevated shadow and slight rotation
2. WHILE a Lead_Card is dragged over a valid Stage_Column, THE Drop_Zone SHALL display an accent border and background highlight
3. WHILE a drag operation is active, THE Pipeline_Board SHALL apply a subtle dimming to all non-active Stage_Columns

### Requirement 6: Touch and Mobile Support

**User Story:** As an agent using a tablet or phone, I want to drag leads on the pipeline board with touch gestures, so that I can manage my pipeline on mobile devices.

#### Acceptance Criteria

1. THE DnD_Context SHALL register both pointer and touch sensor inputs for drag detection
2. WHEN a touch user long-presses a Lead_Card for 200ms, THE Pipeline_Board SHALL initiate a drag operation
3. WHILE a touch drag is active, THE Pipeline_Board SHALL prevent page scrolling to avoid conflicts with the drag gesture

### Requirement 7: Keyboard Accessibility

**User Story:** As an agent using keyboard navigation, I want to move leads between stages using keyboard controls, so that the pipeline board is accessible without a pointer device.

#### Acceptance Criteria

1. WHEN a Lead_Card receives keyboard focus and the agent presses Space or Enter, THE Pipeline_Board SHALL activate drag mode for that card
2. WHILE drag mode is active via keyboard, WHEN the agent presses Arrow Left or Arrow Right, THE Pipeline_Board SHALL move the card to the adjacent Stage_Column
3. WHEN the agent presses Space or Enter during keyboard drag mode, THE Pipeline_Board SHALL drop the card in its current position and persist the change
4. WHEN the agent presses Escape during keyboard drag mode, THE Pipeline_Board SHALL cancel the operation and return the card to its original position
5. THE DnD_Context SHALL provide screen reader announcements describing drag start, movement between columns, and drop completion

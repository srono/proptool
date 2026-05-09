# Implementation Plan: Pipeline Kanban Drag and Drop

## Overview

Add drag-and-drop functionality to the pipeline Kanban board using @dnd-kit. The implementation enhances the existing `PipelineBoard` and `LeadCard` components with DnD wrappers, optimistic state management, keyboard accessibility, and screen reader announcements. No new API routes or server actions are needed — stage updates use the existing Supabase client pattern.

## Tasks

- [x] 1. Install dependency and create utility modules
  - [x] 1.1 Install @dnd-kit/core and create keyboard coordinate getter
    - Add `@dnd-kit/core@^6.3.1` to `apps/web/package.json` dependencies
    - Create `apps/web/src/components/pipeline/keyboard-coordinates.ts`
    - Implement `columnKeyboardCoordinates` function that maps ArrowLeft/ArrowRight to adjacent column center coordinates
    - _Requirements: 7.2, 7.4_

  - [x] 1.2 Create screen reader announcements module
    - Create `apps/web/src/components/pipeline/announcements.ts`
    - Implement `createAnnouncements` function returning `Announcements` object with `onDragStart`, `onDragOver`, `onDragEnd`, and `onDragCancel` handlers
    - Announcements must include contact name and stage label(s)
    - _Requirements: 7.5_

- [x] 2. Implement droppable and draggable wrapper components
  - [x] 2.1 Create DroppableColumn component
    - Create `apps/web/src/components/pipeline/droppable-column.tsx`
    - Use `useDroppable({ id: stageKey })` from @dnd-kit/core
    - Accept `isOver` and `isDragging` props for visual feedback
    - Apply accent border and background highlight when `isOver` is true
    - Apply subtle dimming when `isDragging` is true but `isOver` is false
    - Render stage header (color dot, label, count) and children
    - _Requirements: 2.1, 5.2, 5.3_

  - [x] 2.2 Create DraggableLeadCard component
    - Create `apps/web/src/components/pipeline/draggable-lead-card.tsx`
    - Use `useDraggable({ id: lead.id, data: { lead } })` from @dnd-kit/core
    - Apply drag handle attributes (`listeners`, `attributes`) to the card wrapper
    - Reduce opacity to ~50% when `isDragging` is true (card is being dragged)
    - Wrap existing `LeadCard` component
    - _Requirements: 1.1, 1.3_

- [x] 3. Enhance PipelineBoard with DnD context and optimistic state
  - [x] 3.1 Refactor PipelineBoard to use DndContext and local state
    - Add `useState` for `localLeads` (initialized from props, synced via `useEffect`)
    - Add `useState` for `activeId` (currently dragged lead ID)
    - Add `useState` for `isUpdating` (prevents concurrent drops)
    - Configure sensors: `PointerSensor` (delay: 150, tolerance: 5), `TouchSensor` (delay: 200, tolerance: 5), `KeyboardSensor` with `columnKeyboardCoordinates`
    - Wrap board content in `DndContext` with `closestCenter` collision detection
    - Replace static column divs with `DroppableColumn` components
    - Replace `LeadCard` usage with `DraggableLeadCard` components
    - Pass `isOver` and `isDragging` state to columns based on `activeId` and droppable state
    - Wire `createAnnouncements` into DndContext `accessibility` prop
    - _Requirements: 1.1, 2.1, 5.3, 6.1, 6.2, 6.3, 7.1, 7.5_

  - [x] 3.2 Implement drag event handlers and DragOverlay
    - Implement `onDragStart`: set `activeId` to the dragged lead's ID
    - Implement `onDragEnd`: optimistically move lead in `localLeads`, call Supabase update, handle success (router.refresh) and error (revert + toast)
    - Implement `onDragCancel`: clear `activeId`, no state change
    - Render `DragOverlay` with styled `LeadCard` clone (elevated shadow, slight rotation) when `activeId` is non-null
    - Guard against same-column drops (no-op)
    - Guard against concurrent drops via `isUpdating` flag
    - _Requirements: 1.2, 1.4, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1_

- [x] 4. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Property-based and unit tests
  - [x] 5.1 Write property test: Optimistic stage update (Property 1)
    - **Property 1: Optimistic stage update**
    - Generate random leads and random valid target stages (different from current)
    - Assert that after `handleDragEnd`, the lead's status in `localLeads` equals the target stage
    - Test file: `apps/web/src/components/pipeline/__tests__/pipeline-board.property.test.ts`
    - **Validates: Requirements 2.2, 3.1**

  - [x] 5.2 Write property test: No-op preservation (Property 2)
    - **Property 2: No-op preservation**
    - Generate random leads with same-column drops and cancel events
    - Assert that `localLeads` remains identical to its pre-drag state
    - Test file: `apps/web/src/components/pipeline/__tests__/pipeline-board.property.test.ts`
    - **Validates: Requirements 1.4, 2.3**

  - [x] 5.3 Write property test: Error revert (Property 3)
    - **Property 3: Error revert**
    - Generate random leads and transitions with mocked Supabase error
    - Assert that after error, lead's status reverts to original stage
    - Test file: `apps/web/src/components/pipeline/__tests__/pipeline-board.property.test.ts`
    - **Validates: Requirements 3.3**

  - [x] 5.4 Write property test: Keyboard column navigation (Property 4)
    - **Property 4: Keyboard column navigation**
    - Generate random column indices and ArrowLeft/ArrowRight key events
    - Assert ArrowRight returns next column center (or undefined at last), ArrowLeft returns previous column center (or undefined at first)
    - Test file: `apps/web/src/components/pipeline/__tests__/keyboard-coordinates.property.test.ts`
    - **Validates: Requirements 7.2**

  - [x] 5.5 Write property test: Screen reader announcements contain context (Property 5)
    - **Property 5: Screen reader announcements contain context**
    - Generate random lead names and stage keys
    - Assert announcements include contact name and stage label(s) for all event types
    - Test file: `apps/web/src/components/pipeline/__tests__/announcements.property.test.ts`
    - **Validates: Requirements 7.5**

  - [x] 5.6 Write unit tests for DroppableColumn and DraggableLeadCard
    - Test DroppableColumn renders highlight styles when `isOver` is true
    - Test DroppableColumn renders dimming when `isDragging` is true and `isOver` is false
    - Test DraggableLeadCard renders with reduced opacity when `isDragging` is true
    - Test file: `apps/web/src/components/pipeline/__tests__/droppable-column.test.tsx` and `draggable-lead-card.test.tsx`
    - _Requirements: 1.3, 2.1, 5.2, 5.3_

  - [x] 5.7 Write integration tests for persistence and error handling
    - Mock Supabase client, simulate drop, verify `.update()` called with correct stage key and lead ID
    - Mock router, verify `router.refresh()` called after successful update
    - Mock Supabase error, verify `localLeads` reverts and error toast is displayed
    - Test file: `apps/web/src/components/pipeline/__tests__/pipeline-board.test.tsx`
    - _Requirements: 3.2, 3.3, 4.1, 4.2_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `LeadCard` component is reused as-is inside `DraggableLeadCard` and `DragOverlay`
- No new API routes or server actions — uses existing Supabase client pattern from `LeadCard.handleStageChange`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7"] }
  ]
}
```

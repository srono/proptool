import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

/**
 * Custom coordinate getter for KeyboardSensor.
 * Maps ArrowLeft/ArrowRight to move between adjacent stage columns.
 * Returns the center coordinates of the target column's droppable area.
 */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context }
) => {
  if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') {
    return undefined;
  }

  event.preventDefault();

  const { droppableRects, droppableContainers } = context;

  // Get all droppable containers sorted by their x position (left edge)
  const sortedContainers = [...droppableContainers.getEnabled()]
    .map((container) => {
      const rect = droppableRects.get(container.id);
      return { id: container.id, rect };
    })
    .filter(
      (entry): entry is { id: typeof entry.id; rect: NonNullable<typeof entry.rect> } =>
        entry.rect != null
    )
    .sort((a, b) => a.rect.left - b.rect.left);

  if (sortedContainers.length === 0) {
    return undefined;
  }

  // Find the current column index based on which column center is closest to currentCoordinates.x
  let currentIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < sortedContainers.length; i++) {
    const rect = sortedContainers[i].rect;
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(currentCoordinates.x - centerX);
    if (distance < minDistance) {
      minDistance = distance;
      currentIndex = i;
    }
  }

  // Determine target index based on key pressed
  const targetIndex =
    event.code === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;

  // Boundary check: return undefined if moving beyond edges
  if (targetIndex < 0 || targetIndex >= sortedContainers.length) {
    return undefined;
  }

  // Return center coordinates of the target column
  const targetRect = sortedContainers[targetIndex].rect;
  return {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
  };
};

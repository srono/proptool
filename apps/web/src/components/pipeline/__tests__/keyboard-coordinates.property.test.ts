import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { columnKeyboardCoordinates } from '../keyboard-coordinates';

/**
 * Feature: pipeline-dnd, Property 4: Keyboard column navigation
 *
 * Validates: Requirements 7.2
 *
 * For any column position within the visible stages array, pressing ArrowRight
 * SHALL return the center coordinates of the next column (or undefined if at the
 * last column), and pressing ArrowLeft SHALL return the center coordinates of the
 * previous column (or undefined if at the first column).
 */

// Helper to create a mock rect
function makeRect(left: number, top: number, width: number, height: number) {
  return { left, top, width, height };
}

// Helper to create mock droppable containers and rects from column definitions
function buildContext(columns: { id: string; left: number; top: number; width: number; height: number }[]) {
  const droppableRects = new Map<string, { left: number; top: number; width: number; height: number }>();
  const containers: { id: string }[] = [];

  for (const col of columns) {
    droppableRects.set(col.id, makeRect(col.left, col.top, col.width, col.height));
    containers.push({ id: col.id });
  }

  return {
    droppableRects,
    droppableContainers: {
      getEnabled: () => containers,
    },
  };
}

// Helper to create a mock KeyboardEvent
function makeKeyboardEvent(code: string): KeyboardEvent {
  return {
    code,
    preventDefault: () => {},
  } as unknown as KeyboardEvent;
}

// Generator for column count (2-8 columns)
const columnCountArb = fc.integer({ min: 2, max: 8 });

// Generator for a single column width (50-300px)
const columnWidthArb = fc.integer({ min: 50, max: 300 });

// Generator for column height (200-600px)
const columnHeightArb = fc.integer({ min: 200, max: 600 });

// Generator for column top position (0-100px)
const columnTopArb = fc.integer({ min: 0, max: 100 });

// Generator for gap between columns (0-50px)
const columnGapArb = fc.integer({ min: 0, max: 50 });

// Generator for starting left offset (0-200px)
const startLeftArb = fc.integer({ min: 0, max: 200 });

// Generator for a set of columns with random widths and positions
const columnsArb = fc
  .tuple(
    columnCountArb,
    startLeftArb,
    columnTopArb,
    fc.array(columnWidthArb, { minLength: 8, maxLength: 8 }),
    fc.array(columnGapArb, { minLength: 8, maxLength: 8 }),
    columnHeightArb
  )
  .map(([count, startLeft, top, widths, gaps, height]) => {
    const columns: { id: string; left: number; top: number; width: number; height: number }[] = [];
    let currentLeft = startLeft;

    for (let i = 0; i < count; i++) {
      columns.push({
        id: `stage-${i}`,
        left: currentLeft,
        top,
        width: widths[i],
        height,
      });
      currentLeft += widths[i] + gaps[i];
    }

    return columns;
  });

describe('Property 4: Keyboard column navigation', () => {
  it('ArrowRight returns next column center or undefined at last column', () => {
    fc.assert(
      fc.property(
        columnsArb,
        fc.integer({ min: 0, max: 7 }),
        (columns, rawIndex) => {
          const currentIndex = rawIndex % columns.length;
          const currentCol = columns[currentIndex];
          const currentX = currentCol.left + currentCol.width / 2;
          const currentY = currentCol.top + currentCol.height / 2;

          const context = buildContext(columns);
          const event = makeKeyboardEvent('ArrowRight');

          const result = columnKeyboardCoordinates(event, {
            currentCoordinates: { x: currentX, y: currentY },
            context: context as any,
          });

          if (currentIndex === columns.length - 1) {
            // At last column, should return undefined
            expect(result).toBeUndefined();
          } else {
            // Should return center of next column
            const nextCol = columns[currentIndex + 1];
            const expectedX = nextCol.left + nextCol.width / 2;
            const expectedY = nextCol.top + nextCol.height / 2;
            expect(result).toEqual({ x: expectedX, y: expectedY });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ArrowLeft returns previous column center or undefined at first column', () => {
    fc.assert(
      fc.property(
        columnsArb,
        fc.integer({ min: 0, max: 7 }),
        (columns, rawIndex) => {
          const currentIndex = rawIndex % columns.length;
          const currentCol = columns[currentIndex];
          const currentX = currentCol.left + currentCol.width / 2;
          const currentY = currentCol.top + currentCol.height / 2;

          const context = buildContext(columns);
          const event = makeKeyboardEvent('ArrowLeft');

          const result = columnKeyboardCoordinates(event, {
            currentCoordinates: { x: currentX, y: currentY },
            context: context as any,
          });

          if (currentIndex === 0) {
            // At first column, should return undefined
            expect(result).toBeUndefined();
          } else {
            // Should return center of previous column
            const prevCol = columns[currentIndex - 1];
            const expectedX = prevCol.left + prevCol.width / 2;
            const expectedY = prevCol.top + prevCol.height / 2;
            expect(result).toEqual({ x: expectedX, y: expectedY });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-arrow keys return undefined', () => {
    fc.assert(
      fc.property(
        columnsArb,
        fc.integer({ min: 0, max: 7 }),
        fc.constantFrom('Space', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'KeyA', 'Tab'),
        (columns, rawIndex, keyCode) => {
          const currentIndex = rawIndex % columns.length;
          const currentCol = columns[currentIndex];
          const currentX = currentCol.left + currentCol.width / 2;
          const currentY = currentCol.top + currentCol.height / 2;

          const context = buildContext(columns);
          const event = makeKeyboardEvent(keyCode);

          const result = columnKeyboardCoordinates(event, {
            currentCoordinates: { x: currentX, y: currentY },
            context: context as any,
          });

          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

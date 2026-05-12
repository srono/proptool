import { describe, it, expect } from 'vitest';
import { sortSteps } from '../step-ordering';

describe('sortSteps', () => {
  it('sorts steps by offset_days ascending', () => {
    const steps = [
      { offset_days: 30, sort_order: 0 },
      { offset_days: -7, sort_order: 0 },
      { offset_days: 0, sort_order: 0 },
      { offset_days: 14, sort_order: 0 },
    ];

    const sorted = sortSteps(steps);

    expect(sorted.map(s => s.offset_days)).toEqual([-7, 0, 14, 30]);
  });

  it('breaks ties on offset_days by sort_order ascending', () => {
    const steps = [
      { offset_days: 7, sort_order: 2 },
      { offset_days: 7, sort_order: 0 },
      { offset_days: 7, sort_order: 1 },
    ];

    const sorted = sortSteps(steps);

    expect(sorted.map(s => s.sort_order)).toEqual([0, 1, 2]);
  });

  it('handles a mix of different and same offset_days', () => {
    const steps = [
      { offset_days: 14, sort_order: 1 },
      { offset_days: 0, sort_order: 0 },
      { offset_days: 14, sort_order: 0 },
      { offset_days: -7, sort_order: 0 },
    ];

    const sorted = sortSteps(steps);

    expect(sorted).toEqual([
      { offset_days: -7, sort_order: 0 },
      { offset_days: 0, sort_order: 0 },
      { offset_days: 14, sort_order: 0 },
      { offset_days: 14, sort_order: 1 },
    ]);
  });

  it('does not mutate the input array', () => {
    const steps = [
      { offset_days: 30, sort_order: 0 },
      { offset_days: -7, sort_order: 0 },
    ];
    const original = [...steps];

    sortSteps(steps);

    expect(steps).toEqual(original);
  });

  it('returns an empty array when given an empty array', () => {
    expect(sortSteps([])).toEqual([]);
  });

  it('returns a single-element array unchanged', () => {
    const steps = [{ offset_days: 5, sort_order: 0 }];
    expect(sortSteps(steps)).toEqual([{ offset_days: 5, sort_order: 0 }]);
  });

  it('preserves additional properties on step objects', () => {
    const steps = [
      { id: 'b', offset_days: 10, sort_order: 0, title: 'Second' },
      { id: 'a', offset_days: -5, sort_order: 0, title: 'First' },
    ];

    const sorted = sortSteps(steps);

    expect(sorted[0]).toEqual({ id: 'a', offset_days: -5, sort_order: 0, title: 'First' });
    expect(sorted[1]).toEqual({ id: 'b', offset_days: 10, sort_order: 0, title: 'Second' });
  });
});

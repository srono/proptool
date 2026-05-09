'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  stageKey: string;
  label: string;
  count: number;
  colorIndex: number;
  isOver: boolean;
  isDragging: boolean;
  children: React.ReactNode;
}

const stageColors: Record<number, string> = {
  0: 'bg-aqua',
  1: 'bg-aqua',
  2: 'bg-aqua',
  3: 'bg-brand',
  4: 'bg-brand',
  5: 'bg-status-green',
  6: 'bg-status-green',
};

export function DroppableColumn({
  stageKey,
  label,
  count,
  colorIndex,
  isOver: isOverProp,
  isDragging,
  children,
}: DroppableColumnProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({ id: stageKey });
  const isOver = isOverDroppable || isOverProp;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[270px] lg:w-[270px] rounded-xl transition-colors duration-150 ${
        isOver
          ? 'border border-brand bg-brand/10'
          : isDragging
            ? 'opacity-60'
            : ''
      }`}
    >
      {/* Stage header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${stageColors[colorIndex] ?? 'bg-brand'}`}
          />
          <span className="font-display font-bold text-xs tracking-[1.2px] text-white uppercase">
            {label}
          </span>
        </div>
        <span className="text-[11px] text-gray-2 font-semibold">{count}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2.5">{children}</div>
    </div>
  );
}

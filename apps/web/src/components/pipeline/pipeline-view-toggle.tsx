'use client';

import React from 'react';
import { LayoutGrid, LayoutList } from 'lucide-react';

export type PipelineViewMode = 'board' | 'list';

export interface PipelineViewToggleProps {
  viewMode: PipelineViewMode;
  onToggle: (mode: PipelineViewMode) => void;
  disabled?: boolean;
}

export function PipelineViewToggle({ viewMode, onToggle, disabled = false }: PipelineViewToggleProps) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 bg-onyx-card border border-onyx-line rounded-pill p-1 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle('board')}
        disabled={disabled}
        aria-label="Board view"
        aria-pressed={viewMode === 'board'}
        className={`rounded-pill p-1.5 transition-colors ${
          viewMode === 'board'
            ? 'bg-aqua text-onyx'
            : 'text-gray-2 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onToggle('list')}
        disabled={disabled}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
        className={`rounded-pill p-1.5 transition-colors ${
          viewMode === 'list'
            ? 'bg-aqua text-onyx'
            : 'text-gray-2 hover:text-white'
        }`}
      >
        <LayoutList className="w-4 h-4" />
      </button>
    </div>
  );
}

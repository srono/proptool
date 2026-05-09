'use client';

import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import type { ViewMode } from './hooks/use-view-mode';

export interface ViewToggleProps {
  viewMode: ViewMode;
  onToggle: (mode: ViewMode) => void;
  disabled?: boolean;
}

export function ViewToggle({ viewMode, onToggle, disabled = false }: ViewToggleProps) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 bg-onyx-card border border-onyx-line rounded-pill p-1 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
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
      <button
        type="button"
        onClick={() => onToggle('card')}
        disabled={disabled}
        aria-label="Card view"
        aria-pressed={viewMode === 'card'}
        className={`rounded-pill p-1.5 transition-colors ${
          viewMode === 'card'
            ? 'bg-aqua text-onyx'
            : 'text-gray-2 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}

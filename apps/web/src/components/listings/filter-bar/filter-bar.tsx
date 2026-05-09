'use client';

import type { PropertyType, ListingStatus } from '@propagent/shared';
import { SearchInput } from './search-input';
import { DistrictMultiSelect } from './district-multi-select';
import { PropertyTypeDropdown } from './property-type-dropdown';
import { StatusDropdown } from './status-dropdown';

interface FilterState {
  search: string;
  districts: string[];
  propertyType: PropertyType | null;
  status: ListingStatus | null;
}

interface FilterBarProps {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onDistrictsChange: (districts: string[]) => void;
  onPropertyTypeChange: (type: PropertyType | null) => void;
  onStatusChange: (status: ListingStatus | null) => void;
  onClearAll: () => void;
}

function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search.length > 0 ||
    filters.districts.length > 0 ||
    filters.propertyType !== null ||
    filters.status !== null
  );
}

export function FilterBar({
  filters,
  onSearchChange,
  onDistrictsChange,
  onPropertyTypeChange,
  onStatusChange,
  onClearAll,
}: FilterBarProps) {
  const showClear = hasActiveFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput value={filters.search} onChange={onSearchChange} />
      </div>
      <DistrictMultiSelect selected={filters.districts} onChange={onDistrictsChange} />
      <PropertyTypeDropdown value={filters.propertyType} onChange={onPropertyTypeChange} />
      <StatusDropdown value={filters.status} onChange={onStatusChange} />
      {showClear && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-gray-2 hover:text-white transition-colors underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

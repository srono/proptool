'use client';

import { SearchBar } from './search-bar';

export function HeaderBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-onyx-line bg-onyx px-4 py-3 lg:px-8">
      <SearchBar />
    </header>
  );
}

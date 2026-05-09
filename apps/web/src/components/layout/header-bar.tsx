import { SearchBar } from './search-bar';

export function HeaderBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 lg:px-8">
      <SearchBar />
    </header>
  );
}

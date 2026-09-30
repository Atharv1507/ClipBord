function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

// className is for placement only (the navbar decides where the box sits).
function SearchBar({ query, onQueryChange, className = '' }) {
  // Results filter as you type; Enter jumps down to them.
  function handleSubmit(e) {
    e.preventDefault()
    document.getElementById('products')?.scrollIntoView()
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-mute">
        <SearchIcon />
      </span>
      <input
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full rounded-md bg-smoke py-2 pl-9 pr-3 text-sm text-paper placeholder:text-neutral-500 outline-none transition-colors focus:bg-raised"
      />
    </form>
  )
}

export default SearchBar

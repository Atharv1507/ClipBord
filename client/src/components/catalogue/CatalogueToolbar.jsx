import { CATEGORIES, CATEGORY_LABELS } from '../../utils/product'
import { SearchIcon } from './icons'

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${
        active ? 'bg-crimson text-paper' : 'bg-raised text-mute hover:bg-paper/10 hover:text-paper'
      }`}
    >
      {children}
    </button>
  )
}

// The row over the grid: a round search button that opens into a field when focused
// (and stays open while it holds text), then the categories as pills. A pill shows
// just that category and "All" drops the category filter; they mirror the sidebar's
// category checkboxes, so several pills light up when several boxes are ticked.
function CatalogueToolbar({ query, onQueryChange, categories, onSelectCategory }) {
  return (
    <div className="flex items-center gap-3">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative shrink-0">
        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-paper">
          <SearchIcon />
        </span>
        {/* Closed, the field is a 44px circle with only the icon showing; the
            placeholder appears once it opens. */}
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search products"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) onQueryChange('')
          }}
          className="h-11 w-11 cursor-pointer appearance-none rounded-full bg-raised pl-11 text-base text-paper outline-none ring-1 ring-transparent transition-[width,box-shadow] duration-300 placeholder:text-transparent hover:bg-paper/10 focus:w-44 focus:cursor-text focus:bg-raised focus:pr-4 focus:ring-crimson-bright focus:placeholder:text-neutral-500 not-placeholder-shown:w-44 not-placeholder-shown:pr-4 sm:text-sm sm:focus:w-64 sm:not-placeholder-shown:w-64"
        />
      </form>

      <span aria-hidden="true" className="h-7 w-px shrink-0 bg-paper/15" />

      {/* Scrolls sideways on narrow screens; the padding keeps focus rings unclipped. */}
      <div
        role="group"
        aria-label="Categories"
        className="-my-1.5 flex min-w-0 flex-1 gap-2 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Pill active={categories.length === 0} onClick={() => onSelectCategory(null)}>
          All
        </Pill>
        {CATEGORIES.map((category) => (
          <Pill key={category} active={categories.includes(category)} onClick={() => onSelectCategory(category)}>
            {CATEGORY_LABELS[category]}
          </Pill>
        ))}
      </div>
    </div>
  )
}

export default CatalogueToolbar

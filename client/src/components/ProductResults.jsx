import ProductRack from './ProductRack'

export function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--color-crimson-bright)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// Everything a product listing can be showing, around the rack of hang tags: loading,
// failed, an empty catalog, a search still running, a search with no match, or the
// results. `results` comes from useProductSearch.
function ProductResults({ results, query, onClearQuery, placeholders = 4 }) {
  const { status, error, retry, products, visible, searching } = results
  const search = query.trim()

  if (status === 'loading') return <ProductRack placeholders={placeholders} />

  if (status === 'error') {
    return (
      <div role="alert" className="max-w-lg rounded-md bg-raised p-8">
        <p className="text-paper">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-md bg-crimson px-5 py-2.5 text-sm font-bold text-paper transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!search && products.length === 0) return <p className="text-mute">No products yet. Check back soon.</p>

  if (visible.length === 0) {
    // Nothing loaded matches yet, but the catalog search is still running.
    if (searching) {
      return (
        <p className="flex items-center gap-3 text-mute">
          <Spinner />
          Searching the whole catalog for &ldquo;{search}&rdquo;
        </p>
      )
    }
    return (
      <div>
        <p className="text-paper">Nothing matches &ldquo;{search}&rdquo;.</p>
        <button
          type="button"
          onClick={onClearQuery}
          className="mt-4 text-sm text-mute underline decoration-crimson-bright underline-offset-4 hover:text-paper"
        >
          Clear search
        </button>
      </div>
    )
  }

  // The current results stay usable but fade back while newer ones load.
  return (
    <div className={`transition-opacity duration-300 ${searching ? 'opacity-50' : ''}`}>
      <ProductRack products={visible} />
    </div>
  )
}

export default ProductResults

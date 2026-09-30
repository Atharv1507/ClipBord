import { Spinner } from '../ProductResults'
import ProductRack from '../ProductRack'

const textButtonClass = 'mt-4 text-sm text-mute underline decoration-crimson-bright underline-offset-4 hover:text-paper'

// Everything the catalogue grid can be showing: loading, failed, an empty catalog, a
// search or filters with no match, or the hang tags on the rail. `results` comes from useProductSearch.
function CatalogueResults({ results, query, hasFilters, onClearQuery, onClearAll, placeholders = 9 }) {
  const { status, error, retry, products, visible, searching } = results
  const search = query.trim()

  if (status === 'loading') return <ProductRack placeholders={placeholders} />

  if (status === 'error') {
    return (
      <div role="alert" className="max-w-lg rounded-2xl bg-raised p-8">
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

  if (!search && !hasFilters && products.length === 0) {
    return <p className="text-mute">No products yet. Check back soon.</p>
  }

  if (visible.length === 0) {
    // Nothing loaded matches yet, but newer results are on their way.
    if (searching) {
      return (
        <p className="flex items-center gap-3 text-mute">
          <Spinner />
          {search ? <>Searching the whole catalog for &ldquo;{search}&rdquo;</> : 'Loading…'}
        </p>
      )
    }
    if (hasFilters) {
      return (
        <div className="rounded-2xl bg-raised/60 p-8">
          <p className="text-paper">
            No products match these filters{search && <> and &ldquo;{search}&rdquo;</>}.
          </p>
          <button type="button" onClick={onClearAll} className={textButtonClass}>
            Clear filters
          </button>
        </div>
      )
    }
    return (
      <div className="rounded-2xl bg-raised/60 p-8">
        <p className="text-paper">Nothing matches &ldquo;{search}&rdquo;.</p>
        <button type="button" onClick={onClearQuery} className={textButtonClass}>
          Clear search
        </button>
      </div>
    )
  }

  // The current tags stay usable but fade back while newer ones load.
  return (
    <div className={`transition-opacity duration-300 ${searching ? 'opacity-50' : ''}`}>
      <ProductRack products={visible} />
    </div>
  )
}

export default CatalogueResults

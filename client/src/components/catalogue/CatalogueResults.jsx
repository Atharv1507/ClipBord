import ProductGrid from '../ProductGrid'
import { Spinner, panelClass, pillButton, textButton } from '../ProductResults'

// Everything the catalogue grid can be showing: loading, failed, an empty catalog, a
// search or filters with no match, or the products. `results` comes from useProductSearch.
function CatalogueResults({ results, query, hasFilters, onClearQuery, onClearAll, placeholders = 8 }) {
  const { status, error, retry, products, visible, searching } = results
  const search = query.trim()

  if (status === 'loading') return <ProductGrid placeholders={placeholders} />

  if (status === 'error') {
    return (
      <div role="alert" className={panelClass}>
        <p>{error}</p>
        <button type="button" onClick={retry} className={pillButton}>Try again</button>
      </div>
    )
  }

  if (!search && !hasFilters && products.length === 0) {
    return <p className="text-fg-soft">No products yet. Check back soon.</p>
  }

  if (visible.length === 0) {
    if (searching) {
      return (
        <p className="flex items-center gap-3 text-fg-soft">
          <Spinner />
          {search ? <>Searching the whole catalog for “{search}”</> : 'Loading…'}
        </p>
      )
    }
    return (
      <div className={panelClass}>
        <p className="display text-[clamp(32px,4vw,48px)]">Nothing here.</p>
        <p className="mt-3 text-panel-soft">
          {hasFilters
            ? <>No products match these filters{search && <> and “{search}”</>}.</>
            : <>Nothing matches “{search}”. Try tee, hoodie or joggers.</>}
        </p>
        <button type="button" onClick={hasFilters ? onClearAll : onClearQuery} className={textButton}>
          {hasFilters ? 'Clear filters' : 'Clear search'}
        </button>
      </div>
    )
  }

  // The current results stay usable but fade back while newer ones load.
  return (
    <div className={`transition-opacity duration-300 ${searching ? 'opacity-50' : ''}`}>
      <ProductGrid products={visible} />
    </div>
  )
}

export default CatalogueResults

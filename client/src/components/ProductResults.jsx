import ProductGrid from './ProductGrid'

export function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export const panelClass = 'max-w-xl rounded-panel bg-panel p-8 text-panel-fg'
export const pillButton = 'mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent transition hover:brightness-110'
export const textButton = 'mt-4 text-sm underline underline-offset-4'

// Everything a product listing can be showing: loading, failed, an empty catalog, a
// search still running, a search with no match, or the results. `results` comes from
// useProductSearch.
function ProductResults({ results, query = '', onClearQuery, placeholders = 5, feature = false }) {
  const { status, error, retry, products, visible, searching } = results
  const search = query.trim()

  if (status === 'loading') return <ProductGrid placeholders={placeholders} feature={feature} />

  if (status === 'error') {
    return (
      <div role="alert" className={panelClass}>
        <p>{error}</p>
        <button type="button" onClick={retry} className={pillButton}>Try again</button>
      </div>
    )
  }

  if (!search && products.length === 0) return <p className="text-fg-soft">No products yet. Check back soon.</p>

  if (visible.length === 0) {
    if (searching) {
      return (
        <p className="flex items-center gap-3 text-fg-soft">
          <Spinner />
          Searching the whole catalog for “{search}”
        </p>
      )
    }
    return (
      <div className={panelClass}>
        <p>Nothing matches “{search}”.</p>
        <button type="button" onClick={onClearQuery} className={textButton}>Clear search</button>
      </div>
    )
  }

  // The current results stay usable but fade back while newer ones load.
  return (
    <div className={`transition-opacity duration-300 ${searching ? 'opacity-50' : ''}`}>
      <ProductGrid products={visible} feature={feature && !search} />
    </div>
  )
}

export default ProductResults

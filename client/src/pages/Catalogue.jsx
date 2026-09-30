import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Spinner } from '../components/ProductResults'
import CatalogueResults from '../components/catalogue/CatalogueResults'
import CatalogueToolbar from '../components/catalogue/CatalogueToolbar'
import FilterDrawer from '../components/catalogue/FilterDrawer'
import FilterPanel from '../components/catalogue/FilterPanel'
import { CloseIcon, CollapseIcon, SlidersIcon } from '../components/catalogue/icons'
import { useCatalogueFilters } from '../components/catalogue/useCatalogueFilters'
import { useProductSearch } from '../hooks/useProducts'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

const PAGE_SIZE = 12

function Arrow({ flip = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-5 w-5 ${flip ? 'rotate-180' : ''}`}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function CountBadge({ count, className = '' }) {
  return (
    <span aria-hidden="true" className={`grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1.5 text-[11px] font-bold text-paper ${className}`}>
      {count}
    </span>
  )
}

const pageButtonClass =
  'grid h-11 w-11 place-items-center rounded-full text-paper ring-1 ring-paper/25 transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-paper'

const iconButtonClass = 'grid h-9 w-9 place-items-center rounded-full text-mute transition-colors hover:bg-paper/10 hover:text-paper'

// Every product, twelve to a page, newest first, narrowed by the filter sidebar (a
// drawer on smaller screens), the category pills and the search field over the grid.
// The page and filters live in the URL (?page=2&category=Tshirt&maxPrice=999...) so
// Back from a product returns to the same view; any filter change starts again from
// page 1. The search text stays local to the page, as before.
function Catalogue() {
  const [query, setQuery] = useState('')
  const { page, filters, activeCount, setFilters, toggle, setPrice, clearFilters, goToPage, resetPage } = useCatalogueFilters()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sidebarTitleId = useId()
  const drawerTitleId = useId()
  useSmoothScroll()

  // Back to the first page whenever the search changes.
  function handleQueryChange(next) {
    setQuery(next)
    resetPage()
  }

  // A pill shows just its category; the one already showing alone (or "All") shows everything.
  function selectCategory(category) {
    const alone = filters.category.length === 1 && filters.category[0] === category
    setFilters({ category: category && !alone ? [category] : [] })
  }

  function clearEverything() {
    setQuery('')
    clearFilters()
  }

  const results = useProductSearch(query, { page, limit: PAGE_SIZE, filters })
  const { status, searching, total, totalPages, facets } = results
  const countText = `${total} ${total === 1 ? 'piece' : 'pieces'}`

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Collapsing or expanding the sidebar swaps its toggle button for another one;
  // keep keyboard focus on whichever is now showing.
  const collapseRef = useRef(null)
  const expandRef = useRef(null)
  const sidebarToggled = useRef(false)
  function toggleSidebar(collapsed) {
    sidebarToggled.current = true
    setSidebarCollapsed(collapsed)
  }
  useEffect(() => {
    if (!sidebarToggled.current) return
    sidebarToggled.current = false
    ;(sidebarCollapsed ? expandRef : collapseRef).current?.focus()
  }, [sidebarCollapsed])

  useEffect(() => {
    document.title = 'Catalogue · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  // A new page starts back at the top of the list.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])

  const panelProps = {
    filters,
    facets,
    activeCount,
    onToggle: toggle,
    onPrice: setPrice,
    onClear: clearFilters,
  }

  return (
    <div id="top" className="flex min-h-screen flex-col">
      {/* Search lives in the row over the grid, so the navbar leaves its box out. */}
      <Navbar />
      <main className="flex-1 bg-ink" aria-busy={status === 'loading' || searching}>
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="font-display text-5xl tracking-[-0.01em] sm:text-6xl">Catalogue</h1>
              {status === 'ready' && (
                <p className="flex items-center gap-2 text-sm text-mute" aria-live="polite">
                  {searching ? (
                    <>
                      <Spinner />
                      {query.trim() ? 'Searching…' : 'Loading…'}
                    </>
                  ) : (
                    countText
                  )}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="flex h-11 items-center gap-2 rounded-full bg-raised px-4 text-sm font-bold text-paper transition-colors hover:bg-paper/10 lg:hidden"
            >
              <SlidersIcon className="h-[18px] w-[18px]" />
              Filters
              {activeCount > 0 && (
                <>
                  <CountBadge count={activeCount} />
                  <span className="sr-only">, {activeCount} active</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-8 flex gap-8">
            {/* Desktop sidebar: sticks under the navbar and scrolls on its own if tall. */}
            <aside aria-labelledby={sidebarCollapsed ? undefined : sidebarTitleId} aria-label={sidebarCollapsed ? 'Filters' : undefined} className={`hidden shrink-0 lg:block ${sidebarCollapsed ? 'w-14' : 'w-[280px]'}`}>
              <div
                data-lenis-prevent
                className="sticky top-[calc(var(--nav-h,4.5rem)+1.5rem)] max-h-[calc(100dvh-var(--nav-h,4.5rem)-3rem)] overflow-y-auto overscroll-contain rounded-2xl bg-raised"
              >
                {sidebarCollapsed ? (
                  <button
                    ref={expandRef}
                    type="button"
                    onClick={() => toggleSidebar(false)}
                    aria-expanded="false"
                    aria-label={activeCount > 0 ? `Show filters, ${activeCount} active` : 'Show filters'}
                    className="relative grid h-14 w-14 place-items-center rounded-2xl text-paper transition-colors hover:text-crimson-bright"
                  >
                    <SlidersIcon />
                    {activeCount > 0 && <CountBadge count={activeCount} className="absolute right-1.5 top-1.5" />}
                  </button>
                ) : (
                  <FilterPanel
                    {...panelProps}
                    titleId={sidebarTitleId}
                    headerAction={
                      <button
                        ref={collapseRef}
                        type="button"
                        onClick={() => toggleSidebar(true)}
                        aria-expanded="true"
                        aria-label="Hide filters"
                        className={iconButtonClass}
                      >
                        <CollapseIcon />
                      </button>
                    }
                  />
                )}
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <CatalogueToolbar
                query={query}
                onQueryChange={handleQueryChange}
                categories={filters.category}
                onSelectCategory={selectCategory}
              />

              <div className="mt-8">
                <CatalogueResults
                  results={results}
                  query={query}
                  hasFilters={activeCount > 0}
                  onClearQuery={() => handleQueryChange('')}
                  onClearAll={clearEverything}
                />
              </div>

              {status === 'ready' && totalPages > 1 && (
                <nav aria-label="Pages" className="mt-16 flex items-center justify-center gap-4">
                  <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={pageButtonClass}>
                    <Arrow />
                  </button>
                  <p className="min-w-28 text-center text-sm tabular-nums text-mute">
                    Page <span className="font-bold text-paper">{page}</span> of {totalPages}
                  </p>
                  <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={pageButtonClass}>
                    <Arrow flip />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        labelledBy={drawerTitleId}
        footer={
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-crimson text-sm font-bold text-paper transition hover:brightness-110"
          >
            {status === 'ready' && searching ? <Spinner /> : null}
            {status === 'ready' ? `Show ${countText}` : 'Show results'}
          </button>
        }
      >
        <FilterPanel
          {...panelProps}
          titleId={drawerTitleId}
          headerAction={
            <button type="button" onClick={closeDrawer} aria-label="Close filters" className={iconButtonClass}>
              <CloseIcon />
            </button>
          }
        />
      </FilterDrawer>
    </div>
  )
}

export default Catalogue

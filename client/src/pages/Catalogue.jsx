import { useCallback, useEffect, useId, useLayoutEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CategoryTiles from '../components/CategoryTiles'
import { Icon } from '../components/Icons'
import { Spinner } from '../components/ProductResults'
import CatalogueResults from '../components/catalogue/CatalogueResults'
import FilterDrawer from '../components/catalogue/FilterDrawer'
import FilterPanel from '../components/catalogue/FilterPanel'
import { useCatalogueFilters } from '../components/catalogue/useCatalogueFilters'
import { useProductSearch } from '../hooks/useProducts'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { CATEGORIES, CATEGORY_LABELS, plural } from '../utils/product'

const PAGE_SIZE = 12
const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'
const pill = 'inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-[18px] text-sm font-medium transition-colors'
const pageButton = 'grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-line-strong transition-colors hover:border-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line-strong'

// The shop: one category (/catalogue?category=Tshirt) or everything, twelve to a page,
// newest first. The category pills, price filters (in the drawer) and page live in the
// URL so Back from a product returns to the same view. ?q= opens it with a search,
// which is how the navbar search hands over.
function Catalogue() {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  // What's typed in the search box. A new ?q from the navbar search replaces it
  // (adjusted during render, not in an effect, so there's no flash of the old text).
  const [typed, setTyped] = useState({ from: urlQuery, text: urlQuery })
  if (typed.from !== urlQuery) setTyped({ from: urlQuery, text: urlQuery })
  const query = typed.from === urlQuery ? typed.text : urlQuery
  const { page, filters, activeCount, setFilters, toggle, setPrice, clearFilters, goToPage, resetPage } = useCatalogueFilters()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerTitleId = useId()
  useSmoothScroll()

  // Typing takes over from ?q: it's dropped from the URL so Back and refresh don't bring it back.
  function handleQueryChange(next) {
    setTyped({ from: '', text: next })
    if (urlQuery) {
      setParams((prev) => {
        const p = new URLSearchParams(prev)
        p.delete('q')
        return p
      }, { replace: true })
    }
    resetPage()
  }

  // A pill shows just its category; "All" drops the category filter.
  function selectCategory(category) {
    setFilters({ category: category ? [category] : [] })
  }

  function clearEverything() {
    handleQueryChange('')
    clearFilters()
  }

  const results = useProductSearch(query, { page, limit: PAGE_SIZE, filters })
  const { status, searching, total, totalPages, facets } = results
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const single = filters.category.length === 1 ? filters.category[0] : null
  const search = query.trim()
  const title = single ? CATEGORY_LABELS[single] : search ? `“${search}”` : 'Shop all'

  useEffect(() => {
    document.title = `${single ? CATEGORY_LABELS[single] : 'Shop'} · Clipbord`
    return () => {
      document.title = 'Clipbord'
    }
  }, [single])

  // A new page starts back at the top of the list.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1" aria-busy={status === 'loading' || searching}>
        <header className={`${gutter} pb-7 pt-[clamp(36px,5vw,72px)]`}>
          <p className="flex gap-2 text-[13px] text-fg-soft">
            <Link to="/home" className="hover:text-fg hover:underline hover:underline-offset-[3px]">Shop</Link>
            <span aria-hidden="true">/</span>
            <span>{single ? CATEGORY_LABELS[single] : 'All'}</span>
          </p>
          <h1 className="display mt-3.5 break-words text-[clamp(64px,13vw,220px)]">
            {title}
            {status === 'ready' && (
              <sup className="relative top-[.6em] ml-[.3em] align-top font-sans text-[clamp(14px,1.3vw,18px)] font-medium tracking-normal text-fg-soft" aria-live="polite">
                {searching ? <Spinner /> : plural(total, 'piece')}
              </sup>
            )}
          </h1>

          <div className="mt-[clamp(24px,3vw,40px)] flex flex-wrap items-center justify-between gap-3.5">
            <div role="group" aria-label="Categories" className="-m-1 flex min-w-0 gap-1.5 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => selectCategory(null)} aria-pressed={filters.category.length === 0} className={`${pill} ${filters.category.length === 0 ? 'border-fg bg-fg text-canvas' : 'border-line-strong hover:border-fg'}`}>
                All
              </button>
              {CATEGORIES.map((c) => {
                const on = filters.category.includes(c)
                return (
                  <button key={c} type="button" onClick={() => selectCategory(on && single ? null : c)} aria-pressed={on} className={`${pill} ${on ? 'border-fg bg-fg text-canvas' : 'border-line-strong hover:border-fg'}`}>
                    {CATEGORY_LABELS[c]}
                  </button>
                )
              })}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <form role="search" onSubmit={(e) => e.preventDefault()} className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-fg-soft" />
                <input
                  type="search"
                  aria-label="Search products"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && query) handleQueryChange('')
                  }}
                  className="h-10 w-full rounded-full border-[1.5px] border-line-strong bg-transparent pl-11 pr-4 text-base outline-none placeholder:text-fg-soft focus:border-fg sm:text-sm"
                />
              </form>
              <button type="button" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog" aria-expanded={drawerOpen} className={`${pill} border-line-strong hover:border-fg`}>
                <Icon name="sliders" className="h-[18px] w-[18px]" />
                Filters
                {activeCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[12px] font-semibold text-on-accent">
                    {activeCount}<span className="sr-only"> active</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className={gutter}>
          <CatalogueResults
            results={results}
            query={query}
            hasFilters={activeCount > 0}
            onClearQuery={() => handleQueryChange('')}
            onClearAll={clearEverything}
          />

          {status === 'ready' && totalPages > 1 && (
            <nav aria-label="Pages" className="mt-16 flex items-center justify-center gap-4">
              <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={pageButton}>
                <Icon name="caretLeft" />
              </button>
              <p className="min-w-28 text-center text-sm tabular-nums text-fg-soft">
                Page <span className="font-semibold text-fg">{page}</span> of {totalPages}
              </p>
              <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={pageButton}>
                <Icon name="caretLeft" className="h-5 w-5 rotate-180" />
              </button>
            </nav>
          )}
        </div>

        <section aria-labelledby="more-title" className="pt-[clamp(96px,10vw,150px)]">
          <h2 id="more-title" className={`${gutter} pb-[22px] text-[15px] font-semibold`}>{single ? 'More to shop' : 'Shop by category'}</h2>
          <CategoryTiles exclude={single} />
        </section>
      </main>
      <Footer />

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        labelledBy={drawerTitleId}
        footer={
          <button type="button" onClick={closeDrawer} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent transition hover:brightness-110">
            {status === 'ready' && searching ? <Spinner /> : null}
            {status === 'ready' ? `Show ${plural(total, 'piece')}` : 'Show results'}
          </button>
        }
      >
        <FilterPanel
          filters={filters}
          facets={facets}
          activeCount={activeCount}
          onToggle={toggle}
          onPrice={setPrice}
          onClear={clearFilters}
          titleId={drawerTitleId}
          headerAction={
            <button type="button" onClick={closeDrawer} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full hover:bg-drawer-line">
              <Icon name="x" />
            </button>
          }
        />
      </FilterDrawer>
    </div>
  )
}

export default Catalogue

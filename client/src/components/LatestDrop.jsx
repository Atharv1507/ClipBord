import { Link } from 'react-router-dom'
import { useProductSearch } from '../hooks/useProducts'
import ProductResults, { Spinner } from './ProductResults'

// How many of the latest products hang on the home page rail.
const LIMIT = 8

// Home page product section: the latest products as hang tags on the rail, with a link
// through to the full catalogue. The navbar search queries the whole catalog once typing pauses.
function LatestDrop({ query = '', onClearQuery }) {
  const results = useProductSearch(query, { limit: LIMIT })
  const { status, searching, total } = results

  return (
    <section id="products" aria-busy={status === 'loading' || searching} className="flex-1 scroll-mt-20 bg-ink">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <h2 className="font-display text-5xl tracking-[-0.01em] sm:text-6xl">The drop</h2>
          <div className="flex items-baseline gap-5">
            {status === 'ready' && (
              <p className="flex items-center gap-2 text-sm text-mute" aria-live="polite">
                {searching ? (
                  <>
                    <Spinner />
                    Searching…
                  </>
                ) : (
                  `${total} ${total === 1 ? 'piece' : 'pieces'}`
                )}
              </p>
            )}
            <Link
              to="/catalogue"
              className="text-sm font-bold text-paper underline decoration-crimson-bright decoration-2 underline-offset-4 transition-colors hover:text-crimson-bright"
            >
              See the full catalogue
            </Link>
          </div>
        </div>

        <div className="mt-12">
          <ProductResults results={results} query={query} onClearQuery={onClearQuery} />
        </div>
      </div>
    </section>
  )
}

export default LatestDrop

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { EMPTY_FACETS, fetchProducts, productsQuery } from '../store/productsSlice'
import { useDebounce } from './useDebounce'

// A page of products from the store, optionally narrowed by search and by `filters`
// ({ category: [], minPrice, maxPrice }). The store does the fetching and keeps each
// list, so components asking for the same list share it. Search is debounced here, so
// every page using this gets one request per pause in typing instead of one per
// keystroke. `facets` holds the server's per-filter counts.
export function useProducts({ search = '', page = 1, limit = 12, filters } = {}) {
  const dispatch = useDispatch()
  const debouncedSearch = useDebounce(search.trim(), 300)
  const query = productsQuery({ search: debouncedSearch, page, limit, filters })

  // Asks the store for this list; fetchProducts skips the request if it's already
  // loading or was loaded recently.
  useEffect(() => {
    dispatch(fetchProducts(query))
  }, [dispatch, query])

  const entry = useSelector((state) => state.products.lists[query])
  const settled = entry != null && entry.status !== 'loading'

  // The last list that finished loading for this component. While a new search, page or
  // filter is loading, its products stay on screen instead of a blank grid.
  const [lastQuery, setLastQuery] = useState(query)
  if (settled && lastQuery !== query) setLastQuery(query)
  const last = useSelector((state) => state.products.lists[lastQuery])

  // The list on screen: this one once it has an answer (or old products from an
  // earlier load), otherwise the last one that did.
  const shown = settled || entry?.fetchedAt ? entry : last

  let status = 'loading'
  if (shown?.status === 'error') status = 'error'
  else if (shown?.fetchedAt) status = 'ready'

  return {
    products: shown?.products ?? [],
    total: shown?.total ?? 0,
    totalPages: shown?.totalPages ?? 0,
    facets: shown?.facets ?? EMPTY_FACETS,
    // True while the results are behind the input: waiting out the debounce or
    // waiting on the request.
    isFetching: search.trim() !== debouncedSearch || !settled,
    status,
    error: shown?.error ?? '',
    // After an error the list isn't fresh, so this fetches it again.
    retry: () => dispatch(fetchProducts(query)),
  }
}

// useProducts for the listing pages, plus what they show while a search is in flight:
// `visible` narrows the loaded products on every keystroke until the server answers,
// and `searching` is true while newer results are on their way.
export function useProductSearch(query, options) {
  const results = useProducts({ ...options, search: query })
  const search = query.trim().toLowerCase()
  const visible = search
    ? results.products.filter((product) => product.name.toLowerCase().includes(search))
    : results.products
  return { ...results, visible, searching: results.status === 'ready' && results.isFetching }
}

import { useEffect, useState } from 'react'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useDebounce } from './useDebounce'

// What the filters can count before the first response (or from an older server
// that doesn't send facets): no counts known, no price range known.
const EMPTY_FACETS = { category: {}, price: { min: null, max: null } }

function readFacets(facets) {
  return {
    category: facets?.category ?? {},
    price: { min: facets?.price?.min ?? null, max: facets?.price?.max ?? null },
  }
}

// { category: ['Joggers', 'Tshirt'], minPrice: 500 } -> "category=Joggers,Tshirt&minPrice=500".
// Equal filters always give the same string, so a fresh filters object on every
// render doesn't refetch. Empty lists and missing bounds are left out.
function toFilterQuery({ category = [], minPrice, maxPrice } = {}) {
  const parts = []
  if (category.length) parts.push(['category', [...category].sort().join(',')])
  if (Number.isFinite(minPrice)) parts.push(['minPrice', String(minPrice)])
  if (Number.isFinite(maxPrice)) parts.push(['maxPrice', String(maxPrice)])
  return new URLSearchParams(parts).toString()
}

// Fetches a page of products from /products/getAll, optionally narrowed by search and
// by `filters` ({ category: [], minPrice, maxPrice }). Search is debounced
// here, so every page using this gets one request per pause in typing instead of one
// per keystroke. `facets` holds the server's per-filter counts.
export function useProducts({ search = '', page = 1, limit = 12, filters } = {}) {
  const debouncedSearch = useDebounce(search.trim(), 300)
  const filterQuery = toFilterQuery(filters)

  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [facets, setFacets] = useState(EMPTY_FACETS)
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  // Identifies each request; results are current once the settled key matches.
  const requestKey = `${debouncedSearch}|${page}|${limit}|${filterQuery}|${attempt}`
  const [settledKey, setSettledKey] = useState(null)

  useEffect(() => {
    // A newer search, page or filter makes this response stale; drop it if it lands late.
    let ignore = false
    axiosInstance
      .get('/products/getAll', {
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          ...Object.fromEntries(new URLSearchParams(filterQuery)),
        },
      })
      .then((res) => {
        if (ignore) return
        setProducts(res.data.Allproducts ?? [])
        setTotal(res.data.total ?? 0)
        setTotalPages(res.data.totalPages ?? 0)
        setFacets(readFacets(res.data.facets))
        setStatus('ready')
        setSettledKey(requestKey)
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setError(getErrorMessage(err, "Couldn't load products. Check your connection and try again."))
        setStatus('error')
        setSettledKey(requestKey)
      })
    return () => {
      ignore = true
    }
  }, [requestKey, debouncedSearch, page, limit, filterQuery])

  function retry() {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }

  return {
    products,
    total,
    totalPages,
    facets,
    // True while the results are behind the input: waiting out the debounce or
    // waiting on the request. The previous results stay in `products` meanwhile.
    isFetching: search.trim() !== debouncedSearch || settledKey !== requestKey,
    status,
    error,
    retry,
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

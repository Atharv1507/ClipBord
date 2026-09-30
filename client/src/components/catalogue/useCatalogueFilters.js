import { useSearchParams } from 'react-router-dom'
import { CATEGORIES } from '../../utils/product'

// ?category=Joggers,Tshirt -> ['Tshirt', 'Joggers']: known values only, in display order,
// so a hand-edited URL can't send junk to the API.
function readList(params, key, allowed) {
  const values = (params.get(key) ?? '').split(',').map((value) => value.trim())
  return allowed.filter((value) => values.includes(value))
}

// A price bound counts only as a plain, non-negative number.
function readPrice(params, key) {
  const raw = params.get(key)?.trim()
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

// The catalogue's filters and page, kept in the URL
// (?page=2&category=Tshirt,Joggers&minPrice=500&maxPrice=1000) so Back from
// a product returns to the same view and a filtered catalogue can be shared.
export function useCatalogueFilters() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, parseInt(params.get('page')) || 1)
  const filters = {
    category: readList(params, 'category', CATEGORIES),
    minPrice: readPrice(params, 'minPrice'),
    maxPrice: readPrice(params, 'maxPrice'),
  }
  const hasPrice = filters.minPrice !== undefined || filters.maxPrice !== undefined
  // The price range counts as one filter however many bounds it has.
  const activeCount = filters.category.length + (hasPrice ? 1 : 0)

  // Writes the given filters into the URL, leaving the others alone, and goes back to
  // page 1. Filter tweaks replace the history entry so Back leaves the catalogue
  // instead of undoing them one at a time.
  function setFilters(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          const text = Array.isArray(value) ? value.join(',') : (value ?? '')
          if (text === '') next.delete(key)
          else next.set(key, String(text))
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  // Ticks or unticks one value of a list filter ('category').
  function toggle(key, value) {
    const current = filters[key]
    setFilters({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
  }

  function setPrice(minPrice, maxPrice) {
    setFilters({ minPrice, maxPrice })
  }

  function clearFilters() {
    setFilters({ category: [], minPrice: undefined, maxPrice: undefined })
  }

  // Pages are real history entries, so Back steps back through them.
  function goToPage(n) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (n > 1) next.set('page', String(n))
      else next.delete('page')
      return next
    })
  }

  function resetPage() {
    if (page === 1) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  return { page, filters, activeCount, setFilters, toggle, setPrice, clearFilters, goToPage, resetPage }
}

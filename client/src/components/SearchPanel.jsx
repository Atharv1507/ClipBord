import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { CATEGORY_LABELS, formatPrice } from '../utils/product'
import { Icon } from './Icons'

// Drops down under the navbar: results update as you type (the newest pieces before
// you do), Enter opens the full search on the catalogue, Escape or a click outside closes.
function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const { products, status, isFetching } = useProducts({ search: query, limit: 6 })

  useEffect(() => {
    inputRef.current.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => {
      if (!panelRef.current.contains(e.target) && !e.target.closest('[aria-controls="site-search"]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    const term = query.trim()
    navigate(term ? `/catalogue?q=${encodeURIComponent(term)}` : '/catalogue')
    onClose()
  }

  const term = query.trim()
  return (
    <div
      ref={panelRef}
      id="site-search"
      role="search"
      className="fixed inset-x-0 top-[var(--nav-h,68px)] z-[46] border-b border-line bg-canvas px-4 pb-5 pt-4 shadow-[0_24px_40px_-30px_var(--c-shadow)] motion-safe:animate-[pop-in_.4s_var(--ease-spring)] md:px-[clamp(16px,2.2vw,32px)]"
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <label htmlFor="site-search-input" className="sr-only">Search the shop</label>
        <input
          ref={inputRef}
          id="site-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tees, sweatshirts and joggers"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-line-strong bg-transparent px-5 text-base outline-none placeholder:text-fg-soft focus:border-fg"
        />
        <button type="button" onClick={onClose} aria-label="Close search" className="grid h-[42px] w-[42px] place-items-center rounded-full hover:bg-line">
          <Icon name="x" />
        </button>
      </form>

      <div aria-live="polite" className="mt-3 grid max-w-3xl gap-1">
        {status === 'ready' && products.length === 0 && !isFetching && (
          <p className="px-1.5 py-2.5 text-fg-soft">Nothing matches “{term}”. Try tee, hoodie or joggers.</p>
        )}
        {products.map((p) => (
          <Link
            key={p._id}
            to={`/product/${p._id}`}
            onClick={onClose}
            className={`grid grid-cols-[48px_1fr_auto] items-center gap-3.5 rounded-xl p-1.5 transition-colors hover:bg-line focus-visible:bg-line ${isFetching ? 'opacity-60' : ''}`}
          >
            <img src={p.image} alt="" className="h-[60px] w-12 rounded-lg bg-photo object-cover" />
            <span className="text-sm">
              {p.name}
              <small className="block text-[13px] text-fg-soft">{CATEGORY_LABELS[p.category] ?? p.category}</small>
            </span>
            <span className="text-sm tabular-nums">{formatPrice(p.price)}</span>
          </Link>
        ))}
        {term && products.length > 0 && (
          <button type="submit" onClick={handleSubmit} className="mt-1 justify-self-start px-1.5 text-sm underline underline-offset-4">
            See all results for “{term}”
          </button>
        )}
      </div>
    </div>
  )
}

export default SearchPanel

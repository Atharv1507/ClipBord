import { useId, useState } from 'react'
import { CATEGORIES, CATEGORY_LABELS, formatPrice } from '../../utils/product'
import { ArrowRightIcon, CheckIcon, ChevronIcon, SlidersIcon } from './icons'

// Preset price bands in rupees, bounds inclusive (the API filters with >= and <=).
// They don't overlap, so a ₹999 tee sits in exactly one band.
const PRICE_BANDS = [
  { label: `Under ${formatPrice(500)}`, max: 499 },
  { label: `${formatPrice(500)} – ${formatPrice(999)}`, min: 500, max: 999 },
  { label: `${formatPrice(1000)} – ${formatPrice(1999)}`, min: 1000, max: 1999 },
  { label: `${formatPrice(2000)} & above`, min: 2000 },
]

// A titled block of the sidebar that folds away under its heading.
function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true)
  const bodyId = useId()

  return (
    <section className="border-t border-paper/10 px-5 py-4">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center justify-between gap-3 rounded-md py-1 text-left text-paper"
        >
          {title}
          <span className="grid h-7 w-7 place-items-center rounded-full text-mute transition-colors hover:bg-paper/10 hover:text-paper">
            <ChevronIcon up={open} />
          </span>
        </button>
      </h3>
      <div id={bodyId} hidden={!open} className="mt-2">
        {children}
      </div>
    </section>
  )
}

// A real checkbox (visually hidden, still focusable) drawn as a rounded square that
// fills crimson with a check. `count` is the matching products, when the API sends it.
function FilterCheckbox({ label, checked, onChange, count }) {
  const id = useId()
  // Nothing to find here with the other filters as they are; still tickable.
  const empty = count === 0 && !checked

  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-paper/5 ${empty ? 'text-mute' : 'text-paper'}`}
    >
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crimson-bright ${
          checked ? 'bg-crimson text-paper' : 'ring-[1.5px] ring-inset ring-paper/30'
        }`}
      >
        {checked && <CheckIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      {count !== undefined && (
        <>
          <span
            aria-hidden="true"
            className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs tabular-nums ${checked ? 'bg-crimson/25 text-paper' : 'bg-paper/10 text-mute'}`}
          >
            {count}
          </span>
          <span className="sr-only">
            , {count} {count === 1 ? 'piece' : 'pieces'}
          </span>
        </>
      )}
    </label>
  )
}

// '1,200' or '' -> a bound, or undefined when the box is empty or not a price.
function toBound(text) {
  const trimmed = String(text).replace(/,/g, '').trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

const priceInputClass =
  'w-full rounded-lg bg-smoke py-2 pl-6 pr-2 text-base text-paper tabular-nums ring-1 ring-paper/10 outline-none transition-shadow placeholder:text-neutral-600 focus:ring-crimson-bright sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

// Min/Max boxes for a custom range. Typing only edits the boxes; the range applies on
// Enter, the arrow button, or when focus leaves the pair (not when moving Min -> Max).
function PriceInputs({ minPrice, maxPrice, bounds, onApply }) {
  const id = useId()
  const applied = `${minPrice ?? ''}|${maxPrice ?? ''}`
  const [draft, setDraft] = useState({ min: minPrice ?? '', max: maxPrice ?? '', applied })

  // A preset, Clear all or Back changed the range from outside: show it in the boxes.
  if (draft.applied !== applied) {
    setDraft({ min: minPrice ?? '', max: maxPrice ?? '', applied })
  }

  function apply() {
    let min = toBound(draft.min)
    let max = toBound(draft.max)
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
    if (min === minPrice && max === maxPrice) {
      // Nothing new to fetch; just tidy what's in the boxes.
      setDraft({ min: min ?? '', max: max ?? '', applied })
      return
    }
    onApply(min, max)
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) apply()
      }}
      className="mt-3 flex items-end gap-2 px-2"
    >
      {[
        ['min', 'Min', bounds.min !== null ? Math.floor(bounds.min) : 0],
        ['max', 'Max', bounds.max !== null ? Math.ceil(bounds.max) : 'Any'],
      ].map(([key, label, placeholder]) => (
        <div key={key} className="min-w-0 flex-1">
          <label htmlFor={`${id}-${key}`} className="mb-1 block text-xs text-mute">
            {label}
          </label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-mute">
              ₹
            </span>
            <input
              id={`${id}-${key}`}
              type="number"
              inputMode="numeric"
              min="0"
              placeholder={String(placeholder)}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              className={priceInputClass}
            />
          </div>
        </div>
      ))}
      <button
        type="submit"
        aria-label="Apply price range"
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-paper/10 text-paper transition-colors hover:bg-crimson"
      >
        <ArrowRightIcon />
      </button>
    </form>
  )
}

// The filter sidebar's contents, shared by the desktop sidebar and the mobile drawer.
// `filters` and the handlers come from useCatalogueFilters, `facets` from useProducts.
// `headerAction` is the button at the end of the header row (collapse or close).
function FilterPanel({ filters, facets, activeCount, onToggle, onPrice, onClear, headerAction, titleId }) {
  const bandActive = (band) => band.min === filters.minPrice && band.max === filters.maxPrice

  return (
    <div>
      <div className="flex items-center gap-2.5 px-5 py-4">
        <SlidersIcon />
        <h2 id={titleId} className="">
          Filter
        </h2>
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1.5 text-[12px] text-paper">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2 py-1 text-sm text-mute underline decoration-crimson-bright underline-offset-4 transition-colors hover:text-paper"
            >
              Clear all
            </button>
          )}
          {headerAction}
        </div>
      </div>

      <FilterSection title="Category">
        <fieldset>
          <legend className="sr-only">Category</legend>
          {CATEGORIES.map((category) => (
            <FilterCheckbox
              key={category}
              label={CATEGORY_LABELS[category]}
              checked={filters.category.includes(category)}
              onChange={() => onToggle('category', category)}
              count={facets.category[category]}
            />
          ))}
        </fieldset>
      </FilterSection>

      <FilterSection title="Price">
        {/* One range at a time (the API takes a single min/max), so ticking a band
            replaces the range and unticking it clears the range. */}
        <fieldset>
          <legend className="sr-only">Price range</legend>
          {PRICE_BANDS.map((band) => (
            <FilterCheckbox
              key={band.label}
              label={band.label}
              checked={bandActive(band)}
              onChange={() => (bandActive(band) ? onPrice(undefined, undefined) : onPrice(band.min, band.max))}
            />
          ))}
        </fieldset>
        <PriceInputs minPrice={filters.minPrice} maxPrice={filters.maxPrice} bounds={facets.price} onApply={onPrice} />
      </FilterSection>
    </div>
  )
}

export default FilterPanel

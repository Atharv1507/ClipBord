import { Icon } from '../components/Icons'
import { orderStatus, secondaryButton, selectClass, smallLabel } from './lib'

// Small shared components for the admin screens.

const TONES = {
  accent: 'bg-accent text-on-accent',
  solid: 'bg-fg text-canvas',
  muted: 'bg-line text-fg-soft',
  outline: 'border border-line-strong text-fg-soft',
  warn: 'border-[1.5px] border-accent-fg text-accent-fg',
}

export function Badge({ tone = 'muted', children }) {
  return <span className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${TONES[tone]}`}>{children}</span>
}

export function OrderBadge({ order }) {
  const { label, tone } = orderStatus(order)
  return <Badge tone={tone}>{label}</Badge>
}

export function PageHeader({ title, children, eyebrow }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm text-fg-soft">{eyebrow}</div>}
        <h1 className="display break-words text-[clamp(34px,5vw,64px)]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  )
}

export function ErrorPanel({ message, onRetry }) {
  return (
    <div role="alert" className="max-w-xl rounded-panel bg-panel p-6 text-panel-fg">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-on-accent">
          Try again
        </button>
      )}
    </div>
  )
}

export function SkeletonRows({ rows = 5, height = 'h-16' }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`${height} rounded-inner bg-photo motion-safe:animate-pulse`} />)}
    </div>
  )
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3 text-sm">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={secondaryButton}>
        <Icon name="caretLeft" className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
      </button>
      <span className="text-fg-soft tabular-nums">Page {page} of {totalPages}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={secondaryButton}>
        <span className="hidden sm:inline">Next</span> <Icon name="caretLeft" className="h-4 w-4 rotate-180" />
      </button>
    </nav>
  )
}

// A select with the site's caret, since appearance-none hides the native one.
export function Select({ id, label, value, onChange, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className={smallLabel}>{label}</label>}
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          {children}
        </select>
        <Icon name="caret" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-soft" />
      </div>
    </div>
  )
}


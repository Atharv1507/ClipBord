// Small stroke icons for the catalogue. All decorative: the controls around them
// carry the accessible names.

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

export function SlidersIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...stroke} strokeWidth="1.8" className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  )
}

// Points down; `up` flips it (open sections).
export function ChevronIcon({ up = false, className = 'h-4 w-4' }) {
  return (
    <svg {...stroke} strokeWidth="2" className={`${className} transition-transform duration-200 ${up ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// A chevron pointing left at a bar: tucks the sidebar away (`flip` to bring it back).
export function CollapseIcon({ flip = false, className = 'h-5 w-5' }) {
  return (
    <svg {...stroke} strokeWidth="1.8" className={`${className} ${flip ? 'rotate-180' : ''}`}>
      <path d="M5 5v14" />
      <path d="m15 7-5 5 5 5" />
    </svg>
  )
}

export function SearchIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg {...stroke} strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg {...stroke} strokeWidth="3" className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...stroke} strokeWidth="2" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...stroke} strokeWidth="2" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

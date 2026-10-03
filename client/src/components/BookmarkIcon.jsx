// The wishlist bookmark. Callers set the size and the fill through className,
// e.g. fill-none for the outline and fill-crimson-bright once it's saved.
function BookmarkIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`stroke-current ${className}`}>
      <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16l-6.5 4.5V5A1.5 1.5 0 0 1 7 3.5z" />
    </svg>
  )
}

export default BookmarkIcon

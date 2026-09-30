import { useEffect, useRef } from 'react'

// The filters on phones and tablets: a panel sliding in from the left over the page.
// A native modal <dialog> handles focus trapping, Escape and hiding the page from
// screen readers; clicking the dimmed backdrop also closes it. `footer` stays pinned
// under the scrolling filters.
function FilterDrawer({ open, onClose, labelledBy, children, footer }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Keep the page behind still while the drawer is up.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open])

  // Widening the window to desktop brings the sidebar back, so the drawer can go.
  useEffect(() => {
    if (!open) return
    const desktop = window.matchMedia('(min-width: 64rem)')
    const handleChange = (e) => {
      if (e.matches) onClose()
    }
    desktop.addEventListener('change', handleChange)
    return () => desktop.removeEventListener('change', handleChange)
  }, [open, onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        // Only the backdrop is the dialog itself; the panel fills it edge to edge.
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(22rem,calc(100vw-3rem))] max-w-none overflow-hidden rounded-r-2xl border-0 bg-raised p-0 text-paper backdrop:bg-ink/70 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:-translate-x-full"
    >
      <div className="flex h-full flex-col">
        {/* data-lenis-prevent: let this list scroll natively under the smooth-scroll hook. */}
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && <div className="border-t border-paper/10 p-4">{footer}</div>}
      </div>
    </dialog>
  )
}

export default FilterDrawer

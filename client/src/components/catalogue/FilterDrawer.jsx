import { useEffect, useRef } from 'react'

// The filters: a panel sliding in from the left over the page.
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        // Only the backdrop is the dialog itself; the panel fills it edge to edge.
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(22rem,calc(100vw-3rem))] max-w-none overflow-hidden rounded-r-panel border-0 bg-drawer p-0 text-drawer-fg backdrop:bg-scrim motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:-translate-x-full"
    >
      <div className="flex h-full flex-col">
        {/* data-lenis-prevent: let this list scroll natively under the smooth-scroll hook. */}
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && <div className="border-t border-drawer-line p-4">{footer}</div>}
      </div>
    </dialog>
  )
}

export default FilterDrawer

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Asks a logged-out visitor to log in before doing something that needs an account,
// like adding to the cart. A native modal <dialog> handles focus trapping, Escape and
// hiding the page from screen readers; clicking the dimmed backdrop also closes it.
function LoginModal({ open, onClose, title = 'Log in to continue', children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Keep the page behind still while the modal is up.
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
      aria-labelledby="login-modal-title"
      onClose={onClose}
      onClick={(e) => {
        // Only the backdrop is the dialog itself; the content sits in the inner div.
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-sm rounded-md border-0 bg-raised p-0 text-paper backdrop:bg-ink/70 motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0"
    >
      <div className="p-8">
        <h2 id="login-modal-title" className="tracking-display text-3xl leading-tight">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-mute">{children}</div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/login"
            className="rounded-md bg-crimson px-5 py-3 text-center text-paper transition hover:brightness-110"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-md bg-smoke px-5 py-3 text-center text-paper transition-colors hover:bg-ink"
          >
            Create an account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-sm text-mute transition-colors hover:text-paper"
          >
            Not now
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default LoginModal

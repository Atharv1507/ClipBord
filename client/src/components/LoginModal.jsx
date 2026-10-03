import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icons'

// Asks a logged-out visitor to log in before doing something that needs an account,
// like bookmarking or adding to the bag. A native modal <dialog> handles focus trapping,
// Escape and hiding the page from screen readers; clicking the dimmed backdrop closes it.
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
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-[440px] rounded-[28px] border-0 bg-drawer/70 p-2 text-drawer-fg shadow-[0_0_0_1px_var(--c-drawer-line),0_40px_80px_-30px_var(--c-shadow)] backdrop:bg-scrim motion-safe:animate-[rise-in_.5s_var(--ease-spring)]"
    >
      <div className="rounded-[22px] bg-drawer px-6 pb-6 pt-7">
        <div className="flex items-start justify-between gap-3">
          <h2 id="login-modal-title" className="display text-[clamp(36px,6vw,48px)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-drawer-line">
            <Icon name="x" />
          </button>
        </div>
        <div className="mt-3 text-sm text-drawer-soft">{children}</div>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link to="/login" className="flex h-[52px] items-center justify-between rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent">
            Log in
            <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
          </Link>
          <Link to="/signup" className="flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-drawer-line font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </dialog>
  )
}

export default LoginModal

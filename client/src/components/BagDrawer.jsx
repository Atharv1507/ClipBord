import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { stockWarning, useBag } from '../context/bag'
import { formatPrice } from '../utils/product'
import { Icon } from './Icons'

// The bag, sliding in from the right over any page. A native modal <dialog> handles
// focus trapping, Escape and hiding the page from screen readers; clicking the dimmed
// backdrop also closes it. Checkout waits on the orders API, so it stays disabled.
function BagDrawer() {
  const { user } = useAuth()
  const { cart, status, error, retry, busyId, open, closeBag, increase, decrease, remove } = useBag()
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Keep the page behind still while the bag is open.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [open])

  const count = cart.count
  const hasStockIssue = cart.items.some((item) => stockWarning(item))

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="bag-title"
      onClose={closeBag}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeBag()
      }}
      className="fixed inset-y-2 right-2 left-auto m-0 h-[calc(100dvh-1rem)] max-h-none w-[min(440px,calc(100vw-1rem))] max-w-none overflow-hidden rounded-panel border-0 bg-drawer p-0 text-drawer-fg backdrop:bg-scrim motion-safe:transition-[translate,opacity] motion-safe:duration-500 motion-safe:ease-spring motion-safe:starting:translate-x-[calc(100%+1rem)] [&:focus-visible]:outline-none"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-drawer-line pl-6 pr-3">
          <h2 id="bag-title" className="display text-[30px]">
            {count ? `Bag (${count})` : 'Bag'}
          </h2>
          <button type="button" onClick={closeBag} aria-label="Close bag" className="grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-drawer-line">
            <Icon name="x" />
          </button>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          {!user && (
            <div className="py-10">
              <p>Log in to see your bag. It's saved to your account, so it follows you to any device.</p>
              <Link to="/login" onClick={closeBag} className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 font-medium text-on-accent">
                Log in
              </Link>
            </div>
          )}

          {user && status === 'loading' && count === 0 && (
            <div className="flex flex-col gap-4 py-6" aria-hidden="true">
              {[0, 1].map((n) => (
                <div key={n} className="flex gap-4">
                  <div className="h-[105px] w-[84px] rounded-[10px] bg-photo motion-safe:animate-pulse" />
                  <div className="flex flex-1 flex-col gap-2 pt-1">
                    <div className="h-4 w-3/5 rounded bg-photo motion-safe:animate-pulse" />
                    <div className="h-3 w-2/5 rounded bg-photo motion-safe:animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {user && status === 'error' && count === 0 && (
            <div role="alert" className="py-10">
              <p>{error}</p>
              <button type="button" onClick={retry} className="mt-4 text-sm underline underline-offset-4">Try again</button>
            </div>
          )}

          {user && status === 'ready' && count === 0 && (
            <div className="py-10">
              <p>Your bag is empty.</p>
              <Link to="/home#new" onClick={closeBag} className="mt-2 inline-block text-sm underline underline-offset-4">
                Shop the new drop
              </Link>
            </div>
          )}

          {count > 0 && (
            <ul>
              {cart.items.map((item) => {
                const busy = busyId === item._id
                const warning = stockWarning(item)
                return (
                  <li key={item._id} className="grid grid-cols-[84px_1fr] gap-4 border-b border-drawer-line py-[18px]">
                    <Link to={`/product/${item.product._id}`} onClick={closeBag}>
                      <img src={item.product.image} alt="" className="h-[105px] w-[84px] rounded-[10px] bg-photo object-cover" />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex justify-between gap-3 text-sm font-semibold">
                        <Link to={`/product/${item.product._id}`} onClick={closeBag} className="hover:underline hover:underline-offset-4">
                          {item.product.name}
                        </Link>
                        <span className="tabular-nums">{formatPrice(item.lineTotal)}</span>
                      </div>
                      <p className="text-[13px] text-drawer-soft">
                        Size {item.size}, {formatPrice(item.product.price)} each
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div role="group" aria-label={`Quantity of ${item.product.name}, size ${item.size}`} className="inline-flex h-[38px] items-center rounded-full border-[1.5px] border-drawer-line">
                          <button
                            type="button"
                            onClick={() => decrease(item)}
                            disabled={busy}
                            aria-label={item.quantity === 1 ? 'Remove from bag' : 'Decrease quantity'}
                            className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-35"
                          >
                            <Icon name="minus" className="h-3.5 w-3.5" />
                          </button>
                          <output aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</output>
                          <button
                            type="button"
                            onClick={() => increase(item)}
                            disabled={busy || item.quantity >= item.available}
                            aria-label="Increase quantity"
                            className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-35"
                          >
                            <Icon name="plus" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button type="button" onClick={() => remove(item)} disabled={busy} className="text-[13px] text-drawer-soft underline underline-offset-[3px] disabled:opacity-50">
                          Remove
                        </button>
                      </div>
                      {warning && <p className="mt-2 text-[13px] text-accent-fg">{warning}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {count > 0 && error && <p role="alert" className="py-4 text-[13px] text-accent-fg">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-drawer-line px-6 pb-6 pt-[18px]">
          <div className="flex justify-between text-base font-semibold tabular-nums">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="text-[13px] text-drawer-soft">Incl. of all taxes. Shipping at checkout.</p>
          <button
            type="button"
            disabled
            className="mt-4 flex h-[52px] w-full items-center justify-between rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent disabled:opacity-45"
          >
            Checkout
            <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15">
              <Icon name="arrow" className="h-4 w-4" />
            </span>
          </button>
          <p className="mt-2 text-center text-[13px] text-drawer-soft">
            {hasStockIssue ? 'Fix the items marked above to check out.' : 'Checkout is coming soon.'}{' '}
            {count > 0 && (
              <Link to="/cart" onClick={closeBag} className="text-drawer-fg underline underline-offset-[3px]">
                View bag
              </Link>
            )}
          </p>
        </div>
      </div>
    </dialog>
  )
}

export default BagDrawer

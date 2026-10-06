import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { Icon } from '../components/Icons'
import { panelClass, pillButton } from '../components/ProductResults'
import { stockWarning, useBag } from '../context/bag'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { CATEGORY_LABELS, formatPrice, plural } from '../utils/product'

const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'

// The bag as a full page: every line with its quantity, and the summary beside it.
// Shares its state with the bag drawer (BagContext), so both always agree.
function Cart() {
  const { cart, status, error, setError, retry, busyId, increase, decrease, remove } = useBag()
  const navigate = useNavigate()
  useSmoothScroll()

  useEffect(() => {
    document.title = 'Bag · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  const hasStockIssue = cart.items.some((item) => stockWarning(item))
  const isEmpty = status === 'ready' && cart.items.length === 0

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      {cart.items.length > 0 && <Toast message={error} onClose={() => setError('')} />}

      <main className="flex-1" aria-busy={status === 'loading'}>
        <header className={`${gutter} pb-7 pt-[clamp(36px,5vw,72px)]`}>
          <h1 className="display text-[clamp(64px,13vw,220px)]">
            Bag
            {cart.count > 0 && (
              <sup className="relative top-[.6em] ml-[.3em] align-top font-sans text-[clamp(14px,1.3vw,18px)] font-medium tracking-normal text-fg-soft">
                {plural(cart.count, 'item')}
              </sup>
            )}
          </h1>
        </header>

        <div className={gutter}>
          {(status === 'loading' || status === 'idle') && (
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-hidden="true">
              <div className="flex flex-col gap-6">
                {[0, 1].map((n) => (
                  <div key={n} className="flex gap-5">
                    <div className="aspect-[4/5] w-28 shrink-0 rounded-inner bg-photo motion-safe:animate-pulse sm:w-36" />
                    <div className="flex flex-1 flex-col gap-3 pt-1">
                      <div className="h-6 w-3/5 rounded-full bg-photo motion-safe:animate-pulse" />
                      <div className="h-4 w-2/5 rounded-full bg-photo motion-safe:animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-60 rounded-panel bg-photo motion-safe:animate-pulse" />
            </div>
          )}

          {status === 'error' && cart.items.length === 0 && (
            <div role="alert" className={panelClass}>
              <p>{error}</p>
              <button type="button" onClick={retry} className={pillButton}>Try again</button>
            </div>
          )}

          {isEmpty && (
            <div className="rounded-panel bg-panel px-[clamp(20px,4vw,56px)] py-[clamp(48px,8vw,110px)] text-panel-fg">
              <h2 className="display text-[clamp(40px,6vw,84px)]">Your bag is empty.</h2>
              <p className="mt-3.5 max-w-[46ch] text-panel-soft">Pick a size on any piece and add it here.</p>
              <Link to="/home#new" className="mt-7 inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent">
                Shop the new drop
                <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
            </div>
          )}

          {cart.items.length > 0 && (
            <div className="grid items-start gap-10 lg:grid-cols-[1fr_380px]">
              <ul className="border-t border-line">
                {cart.items.map((item) => {
                  const busy = busyId === item._id
                  const warning = stockWarning(item)
                  return (
                    <li key={item._id} className="flex gap-5 border-b border-line py-6">
                      <Link to={`/product/${item.product._id}`} className="aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-inner bg-photo sm:w-36">
                        <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link to={`/product/${item.product._id}`} className="display text-[clamp(24px,2.4vw,34px)] hover:text-accent-fg">
                              {item.product.name}
                            </Link>
                            <p className="mt-1.5 text-sm text-fg-soft">
                              {CATEGORY_LABELS[item.product.category] ?? item.product.category}, size {item.size}, {formatPrice(item.product.price)} each
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums">{formatPrice(item.lineTotal)}</p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-4">
                          <div role="group" aria-label={`Quantity of ${item.product.name}, size ${item.size}`} className="inline-flex h-10 items-center rounded-full border-[1.5px] border-line-strong">
                            <button type="button" onClick={() => decrease(item)} disabled={busy} aria-label={item.quantity === 1 ? 'Remove from bag' : 'Decrease quantity'} className="grid h-10 w-10 place-items-center rounded-full disabled:opacity-35">
                              <Icon name="minus" className="h-3.5 w-3.5" />
                            </button>
                            <output aria-live="polite" className="min-w-6 text-center font-semibold tabular-nums">{item.quantity}</output>
                            <button type="button" onClick={() => increase(item)} disabled={busy || item.quantity >= item.available} aria-label="Increase quantity" className="grid h-10 w-10 place-items-center rounded-full disabled:opacity-35">
                              <Icon name="plus" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button type="button" onClick={() => remove(item)} disabled={busy} className="text-sm text-fg-soft underline underline-offset-4 hover:text-fg disabled:opacity-50">
                            Remove
                          </button>
                        </div>
                        {warning && <p className="mt-3 text-sm text-accent-fg">{warning}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <aside aria-labelledby="summary-title" className="rounded-panel bg-panel p-6 text-panel-fg lg:sticky lg:top-[calc(var(--nav-h,68px)+1.5rem)]">
                <h2 id="summary-title" className="display text-[34px]">Summary</h2>
                <dl className="mt-5 flex flex-col gap-3 text-sm">
                  <div className="flex justify-between"><dt className="text-panel-soft">Items</dt><dd className="tabular-nums">{cart.count}</dd></div>
                  <div className="flex justify-between"><dt className="text-panel-soft">Shipping</dt><dd className="text-panel-soft">At checkout</dd></div>
                  <div className="mt-2 flex items-baseline justify-between border-t border-panel-fg/10 pt-4">
                    <dt className="font-semibold">Subtotal</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{formatPrice(cart.subtotal)}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => navigate('/checkout')} disabled={hasStockIssue} className="mt-6 flex h-[52px] w-full items-center justify-between rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-45">
                  Checkout
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
                </button>
                <p className="mt-3 text-center text-[13px] text-panel-soft">
                  {hasStockIssue ? 'Fix the items marked above to check out.' : 'Payments are secured by Razorpay.'}
                </p>
                <Link to="/catalogue" className="mt-3 block text-center text-sm underline underline-offset-4">Keep shopping</Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Cart

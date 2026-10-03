import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { CATEGORY_LABELS, formatPrice } from '../utils/product'

const EMPTY_CART = { items: [], count: 0, subtotal: 0 }

// The full cart: items with product name, price and stock, plus count and subtotal.
// addToCart and removeFromCart only send back product ids, so this is what the page shows.
function fetchCart() {
  return axiosInstance.get('/cart/getCart').then((res) => res.data.cart)
}

const labelClass = 'eyebrow text-mute'

// Stock can drop after something was added, so warn before checkout.
function stockWarning(item) {
  if (item.available === 0) return `Sold out in ${item.size}. Remove it to check out.`
  if (item.available < item.quantity) {
    return `Only ${item.available} left in ${item.size}. Lower the quantity to check out.`
  }
  return ''
}

function Cart() {
  const [cart, setCart] = useState(EMPTY_CART)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error' | 'loggedOut'
  const [error, setError] = useState('')
  // The item whose buttons are waiting on the server, so they can't be double-clicked.
  const [busyId, setBusyId] = useState(null)
  // Shown in a toast when an update fails, e.g. "Only 2 left in size M".
  const [message, setMessage] = useState('')
  useSmoothScroll()

  useEffect(() => {
    document.title = 'Cart · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  // Bumping this runs the effect below again; the Try again button uses it.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    fetchCart()
      .then((data) => {
        if (ignore) return
        setCart(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        if (err.response?.status === 401) {
          setStatus('loggedOut')
        } else {
          setError(getErrorMessage(err, "Couldn't load your cart. Please try again."))
          setStatus('error')
        }
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  function handleRetry() {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }

  // Runs one change against the server, then loads the cart again so the page shows
  // the new quantities and totals. The item's buttons stay disabled until both finish.
  async function updateItem(item, request) {
    setBusyId(item._id)
    try {
      await request()
      setCart(await fetchCart())
    } catch (err) {
      console.log(err)
      // The login can run out while the page is open.
      if (err.response?.status === 401) setStatus('loggedOut')
      else setMessage(getErrorMessage(err, "Couldn't update your cart. Please try again."))
    } finally {
      setBusyId(null)
    }
  }

  function increase(item) {
    // A 400 "Only 2 left in size M" from the server ends up in the toast.
    updateItem(item, () =>
      axiosInstance.post('/cart/addToCart', { productId: item.product._id, size: item.size, quantity: 1 }),
    )
  }

  function decrease(item) {
    // Takes one away; the server drops the item once it reaches 0.
    updateItem(item, () =>
      axiosInstance.post('/cart/removeFromCart', { productId: item.product._id, size: item.size }),
    )
  }

  function removeItem(item) {
    updateItem(item, () => axiosInstance.post('/cart/removeItem', { itemId: item._id }))
  }

  // TODO 5 (later): checkout needs the orders model and route. Until then the button stays disabled.
  const checkoutReady = false

  const hasStockIssue = cart.items.some((item) => stockWarning(item))
  const isEmpty = status === 'ready' && cart.items.length === 0

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar cartCount={cart.count} />
      <Toast message={message} onClose={() => setMessage('')} />

      <main className="flex-1" aria-busy={status === 'loading'}>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:pt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-5xl tracking-display sm:text-6xl">Your cart</h1>
            {status === 'ready' && !isEmpty && (
              <p className="text-sm text-mute">
                {cart.count} {cart.count === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {status === 'loading' && (
            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]" aria-hidden="true">
              <div className="flex flex-col gap-6">
                {[0, 1].map((n) => (
                  <div key={n} className="flex gap-4 sm:gap-6">
                    <div className="aspect-[4/5] w-24 shrink-0 rounded-md bg-raised motion-safe:animate-pulse sm:w-32" />
                    <div className="flex flex-1 flex-col gap-3 pt-1">
                      <div className="h-6 w-3/5 rounded-md bg-raised motion-safe:animate-pulse" />
                      <div className="h-4 w-2/5 rounded-md bg-raised motion-safe:animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-56 rounded-md bg-raised motion-safe:animate-pulse" />
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="mt-10 max-w-lg rounded-md bg-raised p-8">
              <p className="text-paper">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-6 rounded-md bg-crimson px-5 py-2.5 text-sm text-paper transition hover:brightness-110"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'loggedOut' && (
            <div className="mt-10 max-w-lg">
              <p className="text-lg leading-relaxed text-mute">Log in to see what's in your cart.</p>
              <Link
                to="/login"
                className="mt-8 inline-block rounded-md bg-crimson px-8 py-4 text-paper transition hover:brightness-110"
              >
                Log in
              </Link>
            </div>
          )}

          {isEmpty && (
            <div className="mt-10 max-w-lg">
              <p className="text-lg leading-relaxed text-mute">Nothing in here yet.</p>
              <Link
                to="/catalogue"
                className="mt-8 inline-block rounded-md bg-crimson px-8 py-4 text-paper transition hover:brightness-110"
              >
                Browse the catalogue
              </Link>
            </div>
          )}

          {status === 'ready' && !isEmpty && (
            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
              <ul className="divide-y divide-raised border-y border-raised">
                {cart.items.map((item) => {
                  const busy = busyId === item._id
                  const warning = stockWarning(item)
                  return (
                    <li key={item._id} className="flex gap-4 py-6 sm:gap-6">
                      <Link
                        to={`/product/${item.product._id}`}
                        className="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-md bg-raised sm:w-32"
                      >
                        <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${item.product._id}`}
                              className="tracking-display text-2xl leading-tight text-paper transition-colors hover:text-crimson-bright"
                            >
                              {item.product.name}
                            </Link>
                            <p className="mt-1 text-sm text-mute">
                              {CATEGORY_LABELS[item.product.category] ?? item.product.category} · Size {item.size} ·{' '}
                              {formatPrice(item.product.price)} each
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums text-paper">{formatPrice(item.lineTotal)}</p>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-4">
                          <div
                            role="group"
                            aria-label={`Quantity of ${item.product.name}, size ${item.size}`}
                            className="flex items-center rounded-md bg-smoke"
                          >
                            <button
                              type="button"
                              onClick={() => decrease(item)}
                              disabled={busy}
                              aria-label={item.quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                              className="grid h-10 w-10 place-items-center text-lg text-paper transition-colors hover:text-crimson-bright disabled:cursor-not-allowed disabled:text-neutral-600"
                            >
                              −
                            </button>
                            <output aria-live="polite" className="w-7 text-center tabular-nums text-paper">
                              {item.quantity}
                            </output>
                            <button
                              type="button"
                              onClick={() => increase(item)}
                              disabled={busy || item.quantity >= item.available}
                              aria-label="Increase quantity"
                              className="grid h-10 w-10 place-items-center text-lg text-paper transition-colors hover:text-crimson-bright disabled:cursor-not-allowed disabled:text-neutral-600"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            disabled={busy}
                            className="text-sm text-mute underline-offset-4 transition-colors hover:text-paper hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        {warning && <p className="mt-3 text-sm text-crimson-bright">{warning}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <aside
                aria-labelledby="summary-title"
                className="rounded-md bg-smoke p-6 lg:sticky lg:top-[calc(var(--nav-h,64px)+1.5rem)]"
              >
                <h2 id="summary-title" className={labelClass}>
                  Summary
                </h2>
                <dl className="mt-6 flex flex-col gap-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-mute">Items</dt>
                    <dd className="tabular-nums text-paper">{cart.count}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-mute">Shipping</dt>
                    <dd className="text-mute">At checkout</dd>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-raised pt-4">
                    <dt className=" text-paper">Subtotal</dt>
                    <dd className="text-2xl tabular-nums text-paper">{formatPrice(cart.subtotal)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  disabled={!checkoutReady || hasStockIssue}
                  className="mt-6 h-12 w-full rounded-md bg-crimson text-paper transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                >
                  Checkout
                </button>
                <p className="mt-3 min-h-5 text-center text-xs text-mute">
                  {hasStockIssue ? 'Fix the items marked above to check out.' : !checkoutReady && 'Checkout is coming soon.'}
                </p>
                <Link
                  to="/catalogue"
                  className="mt-4 block text-center text-sm text-mute transition-colors hover:text-paper"
                >
                  Keep shopping
                </Link>
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

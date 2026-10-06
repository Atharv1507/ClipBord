import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Icon } from '../components/Icons'
import { panelClass, pillButton } from '../components/ProductResults'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { formatPrice, plural } from '../utils/product'

const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'

// The tracker's stages, in order. 'pending' never shows here: the list only
// has orders that were paid (or refunded).
const STAGES = [
  { key: 'processing', label: 'Packing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// A short, readable reference from the long Mongo id, e.g. #3F9A1C2B.
const shortId = (id) => `#${id.slice(-8).toUpperCase()}`

// Why the order didn't go through, in the customer's words.
function cancelMessage(order) {
  if (order.paymentStatus !== 'refunded') return 'This order was cancelled.'
  if (order.cancelReason === 'admin') {
    return 'This order was cancelled by the store and fully refunded. It usually reaches your account in 5–7 working days.'
  }
  return 'An item sold out while you were paying, so we refunded the full amount. It usually reaches your account in 5–7 working days.'
}

function statusLabel(order) {
  if (order.paymentStatus === 'refunded') return 'Refunded'
  if (order.fulfillmentStatus === 'cancelled') return 'Cancelled'
  return STAGES.find((s) => s.key === order.fulfillmentStatus)?.label ?? 'Placed'
}

// Three dots joined by a line; everything up to the current stage is filled.
function Tracker({ status }) {
  const current = STAGES.findIndex((s) => s.key === status)
  return (
    <ol className="mt-5 grid grid-cols-3" aria-label="Delivery progress">
      {STAGES.map((stage, i) => {
        const done = i <= current
        return (
          <li key={stage.key} aria-current={i === current ? 'step' : undefined} className="relative flex flex-col items-start gap-2">
            {i > 0 && <span aria-hidden="true" className={`absolute right-[calc(100%-6px)] top-[5px] h-0.5 w-[calc(100%-12px)] ${done ? 'bg-accent' : 'bg-line-strong'}`} />}
            <span aria-hidden="true" className={`relative h-3 w-3 rounded-full ${done ? 'bg-accent' : 'border-2 border-line-strong bg-canvas'}`} />
            <span className={`text-[13px] ${done ? 'font-semibold' : 'text-fg-soft'}`}>{stage.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function OrderCard({ order }) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const refunded = order.paymentStatus === 'refunded'
  const cancelled = refunded || order.fulfillmentStatus === 'cancelled'
  const address = order.shippingAddress

  return (
    <li className="border-b border-line py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="display text-[clamp(24px,2.4vw,34px)]">Order {shortId(order._id)}</h2>
          <p className="mt-1 text-sm text-fg-soft">
            {dateFormat.format(new Date(order.paidAt ?? order.createdAt))}, {plural(count, 'item')}, {formatPrice(order.amount / 100)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${cancelled ? 'bg-line text-fg-soft' : 'bg-accent text-on-accent'}`}>
          {statusLabel(order)}
        </span>
      </div>

      {cancelled ? (
        <p className="mt-4 max-w-[60ch] text-sm text-fg-soft">{cancelMessage(order)}</p>
      ) : (
        <>
          <Tracker status={order.fulfillmentStatus} />
          {order.courier && order.trackingNumber && (order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered') && (
            <p className="mt-4 text-sm">
              Shipped with <span className="font-semibold">{order.courier}</span>, tracking{' '}
              <span className="font-semibold tabular-nums">{order.trackingNumber}</span>
            </p>
          )}
        </>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {order.items.map((item) => (
          <li key={`${item.product}-${item.size}`} className="flex gap-4">
            <Link to={`/product/${item.product}`} className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-inner bg-photo">
              <img src={item.image} alt="" className="h-full w-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <Link to={`/product/${item.product}`} className="font-semibold hover:text-accent-fg">{item.name}</Link>
              <p className="text-fg-soft">Size {item.size} × {item.quantity}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>

      {address && (
        <p className="mt-5 text-[13px] text-fg-soft">
          Shipping to {address.fullName}, {address.city}, {address.state} {address.pincode}
        </p>
      )}
    </li>
  )
}

// Every order the customer has paid for, newest first, with where each one is.
function Orders() {
  const [state, setState] = useState({ status: 'loading', orders: [], error: '' })
  const [attempt, setAttempt] = useState(0)
  useSmoothScroll()

  useEffect(() => {
    document.title = 'Orders · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get('/orders/my')
      .then(({ data }) => {
        if (!ignore) setState({ status: 'ready', orders: data.orders, error: '' })
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setState({ status: 'error', orders: [], error: getErrorMessage(err, "Couldn't load your orders. Please try again.") })
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const { status, orders, error } = state

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1" aria-busy={status === 'loading'}>
        <header className={`${gutter} pb-7 pt-[clamp(36px,5vw,72px)]`}>
          <h1 className="display text-[clamp(64px,13vw,220px)]">
            Orders
            {orders.length > 0 && (
              <sup className="relative top-[.6em] ml-[.3em] align-top font-sans text-[clamp(14px,1.3vw,18px)] font-medium tracking-normal text-fg-soft">
                {orders.length}
              </sup>
            )}
          </h1>
        </header>

        <div className={`${gutter} pb-[clamp(48px,7vw,96px)]`}>
          {status === 'loading' && (
            <div className="flex max-w-3xl flex-col gap-6" aria-hidden="true">
              {[0, 1].map((n) => <div key={n} className="h-48 rounded-panel bg-photo motion-safe:animate-pulse" />)}
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className={panelClass}>
              <p>{error}</p>
              <button type="button" onClick={retry} className={pillButton}>Try again</button>
            </div>
          )}

          {status === 'ready' && orders.length === 0 && (
            <div className="rounded-panel bg-panel px-[clamp(20px,4vw,56px)] py-[clamp(48px,8vw,110px)] text-panel-fg">
              <h2 className="display text-[clamp(40px,6vw,84px)]">No orders yet.</h2>
              <p className="mt-3.5 max-w-[46ch] text-panel-soft">Once you check out, your orders and where they are show up here.</p>
              <Link to="/home#new" className="mt-7 inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent">
                Shop the new drop
                <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
            </div>
          )}

          {status === 'ready' && orders.length > 0 && (
            <ul className="max-w-3xl border-t border-line">
              {orders.map((order) => <OrderCard key={order._id} order={order} />)}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Orders

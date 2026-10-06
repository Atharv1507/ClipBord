import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { formatPrice } from '../utils/product'
import { card, formatDateTime, formatPaise, inputClass, primaryButton, secondaryButton, shortId, smallLabel } from './lib'
import { ErrorPanel, OrderBadge, PageHeader, SkeletonRows } from './ui'

const CANCEL_REASONS = {
  admin: 'Cancelled from the dashboard',
  out_of_stock: 'Sold out while the customer was paying',
}

// A confirm step for the one action that moves money. Native <dialog>, like the
// bag drawer: focus trap and Escape for free.
function ConfirmCancel({ open, order, busy, onConfirm, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="cancel-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-panel bg-drawer p-6 text-drawer-fg backdrop:bg-scrim"
    >
      <h2 id="cancel-title" className="display text-[32px]">Cancel and refund?</h2>
      <p className="mt-3 text-sm text-drawer-soft">
        {formatPaise(order.amount)} goes back to the customer through Razorpay and the stock returns to the shop. This can't be undone.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>Keep order</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={primaryButton}>
          {busy ? 'Refunding…' : 'Cancel and refund'}
        </button>
      </div>
    </dialog>
  )
}

function Section({ title, children }) {
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 text-sm">
      <dt className="text-fg-soft">{label}</dt>
      <dd className="min-w-0 break-all text-right font-medium">{children}</dd>
    </div>
  )
}

// One order: what was bought, by whom, where it goes, the payment, and the
// actions that move it along (ship, deliver, or cancel with a refund).
function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [load, setLoad] = useState({ status: 'loading', error: '' })
  const [attempt, setAttempt] = useState(0)
  const [ship, setShip] = useState({ courier: '', trackingNumber: '' })
  const [shipErrors, setShipErrors] = useState({})
  const [busy, setBusy] = useState('') // '' | 'ship' | 'deliver' | 'cancel'
  const [message, setMessage] = useState({ text: '', tone: 'ok' })
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get(`/admin/orders/${id}`)
      .then(({ data }) => {
        if (ignore) return
        setOrder(data.order)
        setLoad({ status: 'ready', error: '' })
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setLoad({ status: 'error', error: getErrorMessage(err, "Couldn't load this order.") })
      })
    return () => {
      ignore = true
    }
  }, [id, attempt])

  // Action responses carry the order without the customer filled in, so keep
  // the customer already on screen.
  const applyUpdate = (next) => setOrder((prev) => ({ ...prev, ...next, customer: prev.customer }))

  async function run(kind, request, success) {
    setBusy(kind)
    setMessage({ text: '', tone: 'ok' })
    try {
      const { data } = await request()
      applyUpdate(data.order)
      setMessage({ text: data.message || success, tone: data.refundPending ? 'warn' : 'ok' })
      return true
    } catch (err) {
      console.log(err)
      setMessage({ text: getErrorMessage(err, "Couldn't update the order. Please try again."), tone: 'warn' })
      // The order may have changed under us (409); show what it is now.
      if (err.response?.status === 409) setAttempt((n) => n + 1)
      return false
    } finally {
      setBusy('')
    }
  }

  function markShipped(e) {
    e.preventDefault()
    const courier = ship.courier.trim()
    const trackingNumber = ship.trackingNumber.trim()
    const found = {}
    if (!courier) found.courier = 'Which courier is carrying it?'
    if (!trackingNumber) found.trackingNumber = 'Enter the tracking number'
    setShipErrors(found)
    if (Object.keys(found).length) return
    run('ship', () => axiosInstance.patch(`/admin/orders/${id}/status`, { fulfillmentStatus: 'shipped', courier, trackingNumber }), 'Marked as shipped. The customer can see the tracking number now.')
  }

  const markDelivered = () =>
    run('deliver', () => axiosInstance.patch(`/admin/orders/${id}/status`, { fulfillmentStatus: 'delivered' }), 'Marked as delivered.')

  async function cancel() {
    await run('cancel', () => axiosInstance.post(`/admin/orders/${id}/cancel`), 'Cancelled and refunded. Stock is back in the shop.')
    // Closed either way, so the result message underneath is visible.
    setConfirming(false)
  }

  const back = (
    <Link to="/admin/orders" className="inline-flex items-center gap-2 hover:text-fg">
      <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Orders
    </Link>
  )

  if (load.status === 'error' && !order) return <><PageHeader title="Order" eyebrow={back} /><ErrorPanel message={load.error} onRetry={() => setAttempt((n) => n + 1)} /></>
  if (!order) return <><PageHeader title="Order" eyebrow={back} /><SkeletonRows rows={3} height="h-40" /></>

  const canShip = order.paymentStatus === 'paid' && order.fulfillmentStatus === 'processing'
  const canDeliver = order.paymentStatus === 'paid' && order.fulfillmentStatus === 'shipped'
  const address = order.shippingAddress ?? {}
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)

  const timeline = [
    ['Placed', order.createdAt],
    ['Paid', order.paidAt],
    ['Shipped', order.shippedAt],
    ['Delivered', order.deliveredAt],
    ['Cancelled', order.cancelledAt],
  ].filter(([, at]) => at)

  return (
    <>
      <PageHeader title={`Order ${shortId(order._id)}`} eyebrow={back}>
        <OrderBadge order={order} />
      </PageHeader>

      {message.text && (
        <p role="status" className={`mb-5 rounded-panel px-5 py-3.5 text-sm font-semibold ${message.tone === 'warn' ? 'border-[1.5px] border-accent-fg text-accent-fg' : 'bg-panel text-panel-fg'}`}>
          {message.text}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Section title={`Items (${count})`}>
            <ul className="flex flex-col gap-3">
              {order.items.map((item, i) => (
                <li key={`${item.product ?? i}-${item.size}`} className="flex items-center gap-3">
                  <img src={item.image} alt="" className="h-16 w-[52px] shrink-0 rounded-[10px] bg-photo object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    {item.product ? (
                      <Link to={`/admin/products/${item.product}`} className="font-semibold hover:text-accent-fg">{item.name}</Link>
                    ) : (
                      <p className="font-semibold">{item.name}</p>
                    )}
                    <p className="text-fg-soft">Size {item.size} × {item.quantity} · {formatPrice(item.price)} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold tabular-nums">{formatPaise(order.amount)}</span>
            </div>
          </Section>

          {(canShip || canDeliver) && (
            <Section title={canShip ? 'Ship this order' : 'Delivery'}>
              {canShip ? (
                <form onSubmit={markShipped} noValidate>
                  <fieldset disabled={busy !== ''} className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="courier" className={smallLabel}>Courier</label>
                      <input
                        id="courier"
                        value={ship.courier}
                        maxLength={60}
                        placeholder="e.g. Delhivery"
                        onChange={(e) => setShip((s) => ({ ...s, courier: e.target.value }))}
                        aria-invalid={shipErrors.courier ? true : undefined}
                        aria-describedby={shipErrors.courier ? 'courier-error' : undefined}
                        className={inputClass}
                      />
                      {shipErrors.courier && <p id="courier-error" className="mt-1.5 text-[13px] text-accent-fg">{shipErrors.courier}</p>}
                    </div>
                    <div>
                      <label htmlFor="tracking" className={smallLabel}>Tracking number</label>
                      <input
                        id="tracking"
                        value={ship.trackingNumber}
                        maxLength={60}
                        onChange={(e) => setShip((s) => ({ ...s, trackingNumber: e.target.value }))}
                        aria-invalid={shipErrors.trackingNumber ? true : undefined}
                        aria-describedby={shipErrors.trackingNumber ? 'tracking-error' : undefined}
                        className={inputClass}
                      />
                      {shipErrors.trackingNumber && <p id="tracking-error" className="mt-1.5 text-[13px] text-accent-fg">{shipErrors.trackingNumber}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2.5 sm:col-span-2">
                      <button type="submit" className={primaryButton}>{busy === 'ship' ? 'Saving…' : 'Mark as shipped'}</button>
                      <button type="button" onClick={() => setConfirming(true)} className={secondaryButton}>Cancel and refund</button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-fg-soft">Shipped with {order.courier}, tracking {order.trackingNumber}.</p>
                  <button type="button" onClick={markDelivered} disabled={busy !== ''} className={primaryButton}>
                    {busy === 'deliver' ? 'Saving…' : 'Mark as delivered'}
                  </button>
                </div>
              )}
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Customer">
            <dl>
              <Row label="Name">{order.customer?.fullName ?? '—'}</Row>
              <Row label="Email">{order.customer?.email ? <a href={`mailto:${order.customer.email}`} className="underline underline-offset-4">{order.customer.email}</a> : '—'}</Row>
              <Row label="Phone">{order.customer?.phone ?? '—'}</Row>
            </dl>
          </Section>

          <Section title="Ship to">
            <address className="text-sm not-italic leading-relaxed">
              <span className="font-semibold">{address.fullName}</span><br />
              {address.line1}<br />
              {address.line2 && <>{address.line2}<br /></>}
              {address.city}, {address.state} {address.pincode}<br />
              {address.phone && <span className="text-fg-soft">Phone {address.phone}</span>}
            </address>
          </Section>

          <Section title="Payment">
            <dl>
              <Row label="Amount">{formatPaise(order.amount)}</Row>
              <Row label="Razorpay order">{order.razorpayOrderId ?? '—'}</Row>
              <Row label="Payment">{order.razorpayPaymentId ?? '—'}</Row>
              {order.paymentStatus === 'refunded' && (
                <Row label="Refund">{order.razorpayRefundId ?? <span className="text-accent-fg">Pending, retried automatically</span>}</Row>
              )}
              {order.cancelReason && <Row label="Reason">{CANCEL_REASONS[order.cancelReason] ?? order.cancelReason}</Row>}
            </dl>
          </Section>

          <Section title="Timeline">
            <ol className="flex flex-col gap-2.5">
              {timeline.map(([label, at]) => (
                <li key={label} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-semibold">{label}</span>
                  <span className="text-fg-soft">{formatDateTime(at)}</span>
                </li>
              ))}
              {order.courier && (
                <li className="text-sm text-fg-soft">{order.courier} · {order.trackingNumber}</li>
              )}
            </ol>
          </Section>
        </div>
      </div>

      <ConfirmCancel open={confirming} order={order} busy={busy === 'cancel'} onConfirm={cancel} onClose={() => setConfirming(false)} />
    </>
  )
}

export default OrderDetail

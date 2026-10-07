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

// A confirm step for actions that move money. Native <dialog>, like the bag
// drawer: focus trap and Escape for free.
function ConfirmDialog({ open, title, children, confirmLabel, busyLabel, busy, onConfirm, onClose }) {
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
      aria-labelledby="confirm-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-panel bg-drawer p-6 text-drawer-fg backdrop:bg-scrim"
    >
      <h2 id="confirm-title" className="display text-[32px]">{title}</h2>
      <p className="mt-3 text-sm text-drawer-soft">{children}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>Go back</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={primaryButton}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

// Which items came back after delivery, how many, and whether they go back on
// the shelf (decided each time: a damaged return shouldn't be resold).
// Recording a return never refunds anything; that's the refund form's job.
function ReturnForm({ order, busy, onSubmit }) {
  const [counts, setCounts] = useState({})
  const [restock, setRestock] = useState(false)
  const [note, setNote] = useState('')
  const lines = order.items
    .map((item, index) => ({ item, index, left: item.quantity - (item.returnedQuantity ?? 0) }))
    .filter((line) => line.left > 0)
  const picked = lines
    .map(({ index }) => ({ index, quantity: Number(counts[index] ?? 0) }))
    .filter((line) => line.quantity > 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (picked.length) onSubmit({ items: picked, restock, note: note.trim() || undefined })
      }}
    >
      <fieldset disabled={busy} className="flex flex-col gap-3">
        <legend className="sr-only">Items that came back</legend>
        {lines.map(({ item, index, left }) => (
          <div key={index} className="flex items-center gap-3">
            <img src={item.image} alt="" className="h-12 w-10 shrink-0 rounded-[8px] bg-photo object-cover" />
            <label htmlFor={`return-${index}`} className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{item.name}</span>
              <span className="text-fg-soft"> · size {item.size} · {left} can come back</span>
            </label>
            <select
              id={`return-${index}`}
              value={counts[index] ?? '0'}
              onChange={(e) => setCounts((prev) => ({ ...prev, [index]: e.target.value }))}
              className={`${inputClass} w-20`}
            >
              {Array.from({ length: left + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-[var(--c-accent)]" />
          Put these back in stock
        </label>
        <div>
          <label htmlFor="return-note" className={smallLabel}>Note (optional)</label>
          <input id="return-note" value={note} maxLength={300} placeholder="e.g. Too small, unworn" onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        <div>
          <button type="submit" disabled={!picked.length} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-50`}>
            {busy ? 'Saving…' : 'Mark as returned'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}

// Money back for a delivered order, any amount up to what's left. Pre-filled
// with the value of returned items not yet refunded, but it's the admin's call.
function RefundForm({ order, busy, onRequest }) {
  const leftPaise = order.amount - (order.refundedAmount ?? 0)
  const returnedPaise = order.items.reduce((sum, item) => sum + item.price * 100 * (item.returnedQuantity ?? 0), 0)
  const suggested = Math.min(leftPaise, Math.max(0, returnedPaise - (order.refundedAmount ?? 0)))
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested / 100) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const rupees = Number(amount)
    const paise = Math.round(rupees * 100)
    if (!amount || !Number.isFinite(rupees) || Math.abs(rupees * 100 - paise) > 1e-6 || paise < 100) {
      setError('Enter at least ₹1, up to 2 decimal places')
      return
    }
    if (paise > leftPaise) {
      setError(`Only ${formatPaise(leftPaise)} is left to refund`)
      return
    }
    setError('')
    onRequest({ amount: rupees, note: note.trim() || undefined, paise })
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div>
          <label htmlFor="refund-amount" className={smallLabel}>Amount (₹)</label>
          <input
            id="refund-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            aria-invalid={error ? true : undefined}
            aria-describedby="refund-help"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="refund-note" className={smallLabel}>Note (optional)</label>
          <input id="refund-note" value={note} maxLength={300} placeholder="e.g. Returned tee" onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        <p id="refund-help" className={`text-[13px] sm:col-span-2 ${error ? 'text-accent-fg' : 'text-fg-soft'}`}>
          {error || `Up to ${formatPaise(leftPaise)} can still be refunded.${returnedPaise ? ` Returned items are worth ${formatPaise(returnedPaise)}.` : ''}`}
        </p>
        <div className="sm:col-span-2">
          <button type="submit" className={primaryButton}>Refund…</button>
        </div>
      </fieldset>
    </form>
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
  const [busy, setBusy] = useState('') // '' | 'ship' | 'deliver' | 'cancel' | 'return' | 'refund'
  const [message, setMessage] = useState({ text: '', tone: 'ok' })
  const [confirming, setConfirming] = useState(false)
  // A refund waiting for its confirm step: { amount, note, paise }.
  const [pendingRefund, setPendingRefund] = useState(null)
  // Bumped after a return or refund so those forms start fresh.
  const [formKey, setFormKey] = useState(0)

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

  async function recordReturn(body) {
    const ok = await run('return', () => axiosInstance.post(`/admin/orders/${id}/returns`, body), body.restock ? 'Return recorded and the items are back in stock.' : 'Return recorded. Stock left as it was.')
    if (ok) setFormKey((n) => n + 1)
  }

  async function refund() {
    const { amount, note } = pendingRefund
    const ok = await run('refund', () => axiosInstance.post(`/admin/orders/${id}/refunds`, { amount, note }), `Refunded ${formatPrice(amount)} through Razorpay.`)
    setPendingRefund(null)
    if (ok) setFormKey((n) => n + 1)
  }

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
  const delivered = order.paymentStatus === 'paid' && order.fulfillmentStatus === 'delivered'
  const canReturn = delivered && order.items.some((item) => item.quantity > (item.returnedQuantity ?? 0))
  const canRefund = delivered && order.amount - (order.refundedAmount ?? 0) >= 100
  const address = order.shippingAddress ?? {}
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)

  const timeline = [
    ['Placed', order.createdAt],
    ['Paid', order.paidAt],
    ['Shipped', order.shippedAt],
    ['Delivered', order.deliveredAt],
    ['Cancelled', order.cancelledAt],
    ...(order.returns ?? []).map((r) => [
      `Returned ${r.items.map((i) => `${i.quantity} × ${i.name} (${i.size})`).join(', ')}${r.restocked ? ', restocked' : ''}${r.note ? ` · ${r.note}` : ''}`,
      r.createdAt,
    ]),
    ...(order.refunds ?? []).map((r) => [
      `Refunded ${formatPaise(r.amount)}${r.status === 'pending' ? ' (in progress)' : ''}${r.note ? ` · ${r.note}` : ''}`,
      r.createdAt,
    ]),
  ]
    .filter(([, at]) => at)
    .sort((a, b) => new Date(a[1]) - new Date(b[1]))

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
                    <p className="text-fg-soft">
                      Size {item.size} × {item.quantity} · {formatPrice(item.price)} each
                      {item.returnedQuantity > 0 && <span className="font-semibold text-accent-fg"> · {item.returnedQuantity} returned</span>}
                    </p>
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

          {canReturn && (
            <Section title="Record a return">
              <ReturnForm key={`return-${formKey}`} order={order} busy={busy === 'return'} onSubmit={recordReturn} />
            </Section>
          )}

          {canRefund && (
            <Section title="Refund">
              <RefundForm key={`refund-${formKey}`} order={order} busy={busy === 'refund'} onRequest={setPendingRefund} />
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
              {order.refundedAmount > 0 && <Row label="Refunded after delivery">{formatPaise(order.refundedAmount)}</Row>}
              {order.cancelReason && <Row label="Reason">{CANCEL_REASONS[order.cancelReason] ?? order.cancelReason}</Row>}
            </dl>
          </Section>

          <Section title="Timeline">
            <ol className="flex flex-col gap-2.5">
              {timeline.map(([label, at]) => (
                <li key={`${label}-${at}`} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="min-w-0 font-semibold">{label}</span>
                  <span className="shrink-0 text-fg-soft">{formatDateTime(at)}</span>
                </li>
              ))}
              {order.courier && (
                <li className="text-sm text-fg-soft">{order.courier} · {order.trackingNumber}</li>
              )}
            </ol>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Cancel and refund?"
        confirmLabel="Cancel and refund"
        busyLabel="Refunding…"
        busy={busy === 'cancel'}
        onConfirm={cancel}
        onClose={() => setConfirming(false)}
      >
        {formatPaise(order.amount)} goes back to the customer through Razorpay and the stock returns to the shop. This can't be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={pendingRefund !== null}
        title={`Refund ${pendingRefund ? formatPaise(pendingRefund.paise) : ''}?`}
        confirmLabel="Refund"
        busyLabel="Refunding…"
        busy={busy === 'refund'}
        onConfirm={refund}
        onClose={() => setPendingRefund(null)}
      >
        The money goes back to the customer through Razorpay. Stock isn't changed by a refund. This can't be undone.
      </ConfirmDialog>
    </>
  )
}

export default OrderDetail

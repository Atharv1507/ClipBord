import { Link } from 'react-router-dom'
import { card, formatDate, formatPaise, shortId, useAdminFetch } from './lib'
import { ErrorPanel, OrderBadge, PageHeader, SkeletonRows } from './ui'

const REVENUE = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]

// Each count links to the orders list already filtered to it.
const COUNTS = [
  { key: 'processing', label: 'To pack', to: '/admin/orders?fulfillmentStatus=processing&paymentStatus=paid' },
  { key: 'shipped', label: 'Shipped', to: '/admin/orders?fulfillmentStatus=shipped' },
  { key: 'delivered', label: 'Delivered', to: '/admin/orders?fulfillmentStatus=delivered' },
  { key: 'cancelled', label: 'Cancelled', to: '/admin/orders?fulfillmentStatus=cancelled' },
  { key: 'refunded', label: 'Refunded', to: '/admin/orders?paymentStatus=refunded' },
  { key: 'returned', label: 'Returns', to: '/admin/orders?returnStatus=any' },
]

function StockList({ title, items, empty, describe }) {
  return (
    <section className={card} aria-labelledby={`${title}-title`}>
      <h2 id={`${title}-title`} className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-fg-soft">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {items.map((item) => (
            <li key={`${item._id}-${item.size}`}>
              <Link to={`/admin/products/${item._id}`} className="flex items-center gap-3 rounded-inner py-2 hover:bg-line/60">
                <img src={item.image} alt="" className="h-12 w-10 shrink-0 rounded-[8px] bg-photo object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>
                <span className="shrink-0 text-sm text-fg-soft tabular-nums">{describe(item)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// The dashboard home: money in, what needs doing, what's running out.
function Overview() {
  const { status, data, error, reload } = useAdminFetch('/admin/stats')

  if (status === 'error') return <><PageHeader title="Overview" /><ErrorPanel message={error} onRetry={reload} /></>
  if (!data) return <><PageHeader title="Overview" /><SkeletonRows rows={4} height="h-28" /></>

  const { revenue, counts, refundPending, lowStock, soldOut, recent } = data
  return (
    <>
      <PageHeader title="Overview" />

      {refundPending > 0 && (
        <Link to="/admin/orders?paymentStatus=refunded" role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-panel border-[1.5px] border-accent-fg px-5 py-4 text-accent-fg">
          <span className="font-semibold">
            {refundPending === 1 ? '1 refund is' : `${refundPending} refunds are`} still waiting on Razorpay. The reconcile job retries them automatically.
          </span>
          <span className="shrink-0 text-sm underline underline-offset-4">View</span>
        </Link>
      )}

      <section aria-label="Revenue" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {REVENUE.map((r) => (
          <div key={r.key} className="rounded-panel bg-panel p-5 text-panel-fg">
            <p className="text-sm text-panel-soft">{r.label}</p>
            <p className="mt-2 text-[clamp(22px,2.6vw,32px)] font-semibold tabular-nums">{formatPaise(revenue[r.key])}</p>
          </div>
        ))}
      </section>

      <section aria-label="Orders by status" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COUNTS.map((c) => (
          <Link key={c.key} to={c.to} className="rounded-panel border border-line p-4 transition-colors hover:border-fg">
            <p className="text-sm text-fg-soft">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{counts[c.key] ?? 0}</p>
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={card} aria-labelledby="recent-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-title" className="text-lg font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm underline underline-offset-4">All orders</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-fg-soft">No orders yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col">
              {recent.map((order) => (
                <li key={order._id}>
                  <Link to={`/admin/orders/${order._id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-inner px-2 py-2.5 hover:bg-line/60 sm:grid sm:grid-cols-[100px_minmax(0,1fr)_auto_auto]">
                    <span className="font-semibold tabular-nums">{shortId(order._id)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-fg-soft">{order.customer?.fullName ?? order.shippingAddress?.fullName} · {formatDate(order.paidAt ?? order.createdAt)}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatPaise(order.amount)}</span>
                    <OrderBadge order={order} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <StockList title="Low stock" items={lowStock} empty="Nothing is running low." describe={(i) => `${i.size}: ${i.left} left`} />
          <StockList title="Sold out" items={soldOut} empty="No sizes are sold out." describe={(i) => `${i.size} sold out`} />
        </div>
      </div>
    </>
  )
}

export default Overview

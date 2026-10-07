import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import { plural } from '../utils/product'
import { formatDate, formatPaise, inputClass, shortId, updateParams, useAdminFetch } from './lib'
import { ErrorPanel, OrderBadge, PageHeader, Pagination, Select, SkeletonRows } from './ui'

// Every order that got paid (or refunded), newest first. Abandoned checkouts
// only show when asked for with the payment filter.
function OrdersList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paymentStatus = searchParams.get('paymentStatus') ?? ''
  const fulfillmentStatus = searchParams.get('fulfillmentStatus') ?? ''
  const returnStatus = searchParams.get('returnStatus') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debounced = useDebounce(search.trim(), 300)
  useEffect(() => {
    if (debounced !== (searchParams.get('search') ?? '')) updateParams(searchParams, setSearchParams, { search: debounced })
  }, [debounced, searchParams, setSearchParams])

  const { status, data, error, reload } = useAdminFetch('/admin/orders', {
    paymentStatus, fulfillmentStatus, returnStatus, search: searchParams.get('search') ?? '', page: String(page),
  })
  const orders = data?.orders ?? []
  const filtered = paymentStatus || fulfillmentStatus || returnStatus || searchParams.get('search')

  return (
    <>
      <PageHeader title="Orders">
        {data && <span className="text-sm text-fg-soft tabular-nums">{plural(data.total ?? orders.length, 'order')}</span>}
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_170px]">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input id="order-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order #, phone or name" className={inputClass} />
        </div>
        <Select id="order-payment" value={paymentStatus} onChange={(v) => updateParams(searchParams, setSearchParams, { paymentStatus: v })}>
          <option value="">Paid and refunded</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="created">Unpaid checkouts</option>
          <option value="failed">Failed payments</option>
        </Select>
        <Select id="order-fulfillment" value={fulfillmentStatus} onChange={(v) => updateParams(searchParams, setSearchParams, { fulfillmentStatus: v })}>
          <option value="">Any delivery status</option>
          <option value="processing">To pack</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select id="order-returns" value={returnStatus} onChange={(v) => updateParams(searchParams, setSearchParams, { returnStatus: v })}>
          <option value="">All orders</option>
          <option value="any">With returns</option>
          <option value="partial">Partly returned</option>
          <option value="full">Fully returned</option>
        </Select>
      </div>

      {status === 'error' && <ErrorPanel message={error} onRetry={reload} />}
      {status !== 'error' && !data && <SkeletonRows rows={6} />}

      {data && orders.length === 0 && (
        <p className="rounded-panel border border-dashed border-line-strong p-8 text-center text-fg-soft">
          {filtered ? 'No orders match these filters.' : 'No orders yet.'}
        </p>
      )}

      {data && orders.length > 0 && (
        <ul className={`flex flex-col border-t border-line ${status === 'loading' ? 'opacity-60' : ''}`} aria-busy={status === 'loading'}>
          {orders.map((order) => (
            <li key={order._id}>
              <Link
                to={`/admin/orders/${order._id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-1 py-3.5 hover:bg-line/40 md:grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1fr)_100px_130px]"
              >
                <span className="font-semibold tabular-nums">{shortId(order._id)}</span>
                <span className="justify-self-end md:hidden"><OrderBadge order={order} /></span>
                <span className="col-span-2 min-w-0 truncate text-sm md:col-span-1">
                  <span className="font-semibold">{order.customer?.fullName ?? order.shippingAddress?.fullName}</span>
                  <span className="text-fg-soft"> · {order.shippingAddress?.city}</span>
                </span>
                <span className="min-w-0 truncate text-sm text-fg-soft">
                  {formatDate(order.paidAt ?? order.createdAt)} · {plural(order.itemCount ?? order.items?.length ?? 0, 'item')}
                </span>
                <span className="justify-self-end text-sm font-semibold tabular-nums md:justify-self-auto md:text-right">{formatPaise(order.amount)}</span>
                <span className="hidden justify-self-end md:block"><OrderBadge order={order} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => updateParams(searchParams, setSearchParams, { page: n })} />}
    </>
  )
}

export default OrdersList

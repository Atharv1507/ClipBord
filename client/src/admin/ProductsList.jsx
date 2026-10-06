import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { Icon } from '../components/Icons'
import { axiosInstance } from '../axiosCalls/axios'
import { useDebounce } from '../hooks/useDebounce'
import { getErrorMessage } from '../utils/getErrorMessage'
import { CATEGORIES, CATEGORY_LABELS, SIZES, formatPrice } from '../utils/product'
import { inputClass, primaryButton, quietButton, updateParams, useAdminFetch } from './lib'
import { Badge, ErrorPanel, PageHeader, Pagination, Select, SkeletonRows } from './ui'

// Every product, archived ones included, with stock at a glance.
function ProductsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const category = searchParams.get('category') ?? ''
  const status = searchParams.get('status') ?? 'active'
  const page = Number(searchParams.get('page')) || 1

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debounced = useDebounce(search.trim(), 300)
  const [busyId, setBusyId] = useState(null)
  // A message handed over by the form after creating a product.
  const [toast, setToast] = useState(location.state?.message ?? '')

  useEffect(() => {
    if (location.state?.message) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location, navigate])

  useEffect(() => {
    if (debounced !== (searchParams.get('search') ?? '')) updateParams(searchParams, setSearchParams, { search: debounced })
  }, [debounced, searchParams, setSearchParams])

  const { status: loadStatus, data, error, reload, setData } = useAdminFetch('/admin/products', {
    search: searchParams.get('search') ?? '', category, status, page: String(page),
  })

  // The list changes only once the server confirms, so it never shows a state
  // the database doesn't have.
  async function setArchived(product, archived) {
    setBusyId(product._id)
    try {
      const { data: res } = await axiosInstance.patch(`/admin/products/${product._id}/archive`, { archived })
      const stillFits = status === 'all' || (status === 'archived') === archived
      setData({
        ...data,
        products: stillFits
          ? data.products.map((p) => (p._id === product._id ? res.product : p))
          : data.products.filter((p) => p._id !== product._id),
      })
      setToast(archived ? `${product.name} is hidden from the shop.` : `${product.name} is back in the shop.`)
    } catch (err) {
      console.log(err)
      setToast(getErrorMessage(err, "Couldn't update the product. Please try again."))
    } finally {
      setBusyId(null)
    }
  }

  const products = data?.products ?? []

  return (
    <>
      <PageHeader title="Products">
        <Link to="/admin/products/new" className={primaryButton}>
          <Icon name="plus" className="h-4 w-4" /> New product
        </Link>
      </PageHeader>
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px]">
        <div>
          <label htmlFor="product-search" className="sr-only">Search products</label>
          <input id="product-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className={inputClass} />
        </div>
        <Select id="product-category" value={category} onChange={(v) => updateParams(searchParams, setSearchParams, { category: v })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </Select>
        <Select id="product-status" value={status} onChange={(v) => updateParams(searchParams, setSearchParams, { status: v === 'active' ? '' : v })}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
      </div>

      {loadStatus === 'error' && <ErrorPanel message={error} onRetry={reload} />}
      {loadStatus !== 'error' && !data && <SkeletonRows rows={6} height="h-20" />}

      {data && products.length === 0 && (
        <p className="rounded-panel border border-dashed border-line-strong p-8 text-center text-fg-soft">
          {searchParams.get('search') || category ? 'No products match these filters.' : status === 'archived' ? 'Nothing is archived.' : 'No products yet.'}
        </p>
      )}

      {data && products.length > 0 && (
        <ul className={`flex flex-col border-t border-line ${loadStatus === 'loading' ? 'opacity-60' : ''}`} aria-busy={loadStatus === 'loading'}>
          {products.map((p) => (
            <li key={p._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line py-3.5 md:flex-nowrap">
              <img src={p.image} alt="" className="h-16 w-[52px] shrink-0 rounded-[10px] bg-photo object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/products/${p._id}`} className="truncate font-semibold hover:text-accent-fg">{p.name}</Link>
                  {p.archived && <Badge tone="outline">Archived</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-fg-soft">
                  {CATEGORY_LABELS[p.category] ?? p.category} · {formatPrice(p.price)} · {p.images?.length || 1} {(p.images?.length || 1) === 1 ? 'photo' : 'photos'}
                </p>
              </div>
              <dl className="flex gap-1.5" aria-label="Stock per size">
                {SIZES.map((s) => {
                  const left = p.sizes?.[s] ?? 0
                  return (
                    <div key={s} className={`w-12 rounded-[10px] px-1.5 py-1 text-center ${left === 0 ? 'bg-line text-fg-soft' : left <= 3 ? 'border border-accent-fg text-accent-fg' : 'border border-line'}`}>
                      <dt className="text-[11px] font-semibold">{s}</dt>
                      <dd className="text-sm font-semibold tabular-nums">{left}</dd>
                    </div>
                  )
                })}
              </dl>
              <div className="flex shrink-0 items-center gap-1">
                <Link to={`/admin/products/${p._id}`} className={quietButton}>Edit</Link>
                <button type="button" onClick={() => setArchived(p, !p.archived)} disabled={busyId === p._id} className={quietButton}>
                  {busyId === p._id ? 'Saving…' : p.archived ? 'Restore' : 'Archive'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => updateParams(searchParams, setSearchParams, { page: n })} />}
    </>
  )
}

export default ProductsList

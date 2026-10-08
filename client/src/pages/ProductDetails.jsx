import { useEffect, useLayoutEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductView from '../components/ProductView'
import ProductGrid from '../components/ProductGrid'
import { pillButton } from '../components/ProductResults'
import { useProducts } from '../hooks/useProducts'
import { fetchProduct } from '../store/productsSlice'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { CATEGORY_LABELS, categoryPath } from '../utils/product'

const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'

// Four more pieces under the product: others from its category first, then the newest.
function MoreLikeThis({ product }) {
  const same = useProducts({ limit: 5, filters: { category: [product.category] } })
  const latest = useProducts({ limit: 8 })
  if (same.status !== 'ready' || latest.status !== 'ready') return null
  const seen = new Set([product._id])
  const picks = [...same.products, ...latest.products].filter((p) => !seen.has(p._id) && seen.add(p._id)).slice(0, 4)
  if (!picks.length) return null
  return (
    <section aria-labelledby="more-title" className="pt-[clamp(96px,10vw,150px)]">
      <div className={`flex items-baseline justify-between pb-[22px] ${gutter}`}>
        <h2 id="more-title" className="text-[15px] font-semibold">You might also like</h2>
        <Link to={categoryPath(product.category)} className="text-sm text-fg-soft hover:text-fg hover:underline hover:underline-offset-[3px]">
          All {CATEGORY_LABELS[product.category]?.toLowerCase() ?? 'pieces'}
        </Link>
      </div>
      <div className={gutter}><ProductGrid products={picks} /></div>
    </section>
  )
}

function ProductDetails() {
  const { id } = useParams()
  const dispatch = useDispatch()
  // This product's entry in the store: { status, error, product }, or nothing before the
  // first request. Each id has its own entry, so an old product never shows under a new id.
  const entry = useSelector((state) => state.products.details[id])
  const current = entry?.product ?? null
  const status = entry?.status === 'error' ? 'error' : current ? 'ready' : 'loading'
  const error = entry?.error ?? ''
  useSmoothScroll()

  // Coming from partway down another page would otherwise open this one mid-way down.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

  // fetchProduct skips the request if this product was loaded recently.
  useEffect(() => {
    dispatch(fetchProduct(id))
  }, [dispatch, id])

  useEffect(() => {
    if (!current) return
    document.title = `${current.name} · Clipbord`
    return () => {
      document.title = 'Clipbord'
    }
  }, [current])

  const label = current ? CATEGORY_LABELS[current.category] ?? current.category : null

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1" aria-busy={status === 'loading'}>
        <p className={`flex gap-2 border-b border-line py-[18px] text-[13px] text-fg-soft ${gutter}`}>
          <Link to="/home" className="hover:text-fg hover:underline hover:underline-offset-[3px]">Shop</Link>
          {current && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={categoryPath(current.category)} className="hover:text-fg hover:underline hover:underline-offset-[3px]">{label}</Link>
              <span aria-hidden="true">/</span>
              <span className="truncate">{current.name}</span>
            </>
          )}
        </p>

        {status === 'error' && (
          <div className={`py-16 ${gutter}`}>
            <div role="alert" className="max-w-xl rounded-panel bg-panel p-8 text-panel-fg">
              <p className="display text-[clamp(36px,5vw,56px)]">This piece didn't load.</p>
              <p className="mt-3 text-panel-soft">{error}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => dispatch(fetchProduct(id))} className={pillButton}>Try again</button>
                <Link to="/home#new" className="mt-6 inline-flex h-12 items-center px-2 text-sm underline underline-offset-4">Back to the drop</Link>
              </div>
            </div>
          </div>
        )}

        {status !== 'error' && current && (
          <>
            <ProductView key={current._id} product={current} />
            <MoreLikeThis key={`more-${current._id}`} product={current} />
          </>
        )}

        {status !== 'error' && !current && (
          <div className="grid md:grid-cols-[7fr_5fr]" aria-hidden="true">
            <div className="aspect-[4/5] bg-photo motion-safe:animate-pulse" />
            <div className="flex flex-col gap-4 px-4 pt-8 md:px-[clamp(24px,4.5vw,72px)] md:pt-10">
              <div className="h-4 w-24 rounded-full bg-photo motion-safe:animate-pulse" />
              <div className="h-20 w-4/5 rounded-2xl bg-photo motion-safe:animate-pulse" />
              <div className="h-12 w-full max-w-md rounded-full bg-photo motion-safe:animate-pulse" />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetails

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductGrid from '../components/ProductGrid'
import { Icon } from '../components/Icons'
import { panelClass, pillButton } from '../components/ProductResults'
import { fetchWishlist } from '../store/wishlistSlice'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { plural } from '../utils/product'

const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'

// The bookmarked products. Un-bookmarking one here empties its bookmark but leaves it in
// the grid until the page is opened again, so the grid doesn't jump under the cursor and
// a mis-tap can be undone.
function Wishlist() {
  const dispatch = useDispatch()
  const page = useSelector((state) => state.wishlist.page)
  const ids = useSelector((state) => state.wishlist.ids)
  // When this visit began. Only an answer from after it counts as this visit's list.
  const [openedAt] = useState(() => Date.now())
  useSmoothScroll()

  useEffect(() => {
    document.title = 'Bookmarks · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  useEffect(() => {
    dispatch(fetchWishlist())
  }, [dispatch])

  // This visit's answer has arrived (not one left over from an earlier visit).
  const answered = page.fetchedAt >= openedAt && page.status !== 'loading'
  // Until it does, the list from the last visit stands in, minus anything un-bookmarked
  // since. Un-bookmarking during this visit doesn't touch page.products, so those stay.
  const products = answered ? page.products : page.products.filter((p) => ids.includes(p._id))
  let status = 'loading'
  if (answered) status = page.status
  else if (products.length) status = 'ready'
  const error = page.error

  const isEmpty = answered && status === 'ready' && products.length === 0

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1" aria-busy={status === 'loading'}>
        <header className={`${gutter} pb-7 pt-[clamp(36px,5vw,72px)]`}>
          <p className="flex gap-2 text-[13px] text-fg-soft">
            <Link to="/home" className="hover:text-fg hover:underline hover:underline-offset-[3px]">Shop</Link>
            <span aria-hidden="true">/</span>
            <span>Bookmarks</span>
          </p>
          <h1 className="display mt-3.5 text-[clamp(64px,13vw,220px)]">
            Bookmarks
            {status === 'ready' && (
              <sup className="relative top-[.6em] ml-[.3em] align-top font-sans text-[clamp(14px,1.3vw,18px)] font-medium tracking-normal text-fg-soft">
                {plural(products.length, 'piece')}
              </sup>
            )}
          </h1>
        </header>

        <div className={gutter}>
          {status === 'loading' && <ProductGrid placeholders={4} />}

          {status === 'error' && (
            <div role="alert" className={panelClass}>
              <p>{error}</p>
              <button type="button" onClick={() => dispatch(fetchWishlist())} className={pillButton}>Try again</button>
            </div>
          )}

          {isEmpty && (
            <div className="rounded-panel bg-panel px-[clamp(20px,4vw,56px)] py-[clamp(48px,8vw,110px)] text-panel-fg">
              <h2 className="display text-[clamp(40px,6vw,84px)]">Nothing saved yet.</h2>
              <p className="mt-3.5 max-w-[46ch] text-panel-soft">Tap the bookmark on any piece to keep it here for later.</p>
              <Link to="/home#new" className="group mt-7 inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent">
                Shop the new drop
                <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
            </div>
          )}

          {status === 'ready' && !isEmpty && <ProductGrid products={products} />}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Wishlist

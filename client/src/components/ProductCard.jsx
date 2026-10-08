import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBag } from '../context/bag'
import { useWishlist } from '../hooks/useWishlist'
import { getErrorMessage } from '../utils/getErrorMessage'
import { CATEGORY_LABELS, SIZES, formatPrice } from '../utils/product'
import { Icon } from './Icons'
import LoginModal from './LoginModal'
import Toast from './Toast'

// A size with this many left or fewer puts a "Low stock" chip on the photo.
const LOW_STOCK = 2

// A product as a gallery tile: the photo is the card, with the name, category and price
// on the page below it. The name's link covers the whole card. On devices with a mouse,
// hovering shows the bookmark and slides up a Quick add bar with the sizes. `feature` is
// the big 2×2 card that leads the new drop, with the name in the display face.
function ProductCard({ product, feature = false }) {
  const { _id, name, price, image, category, sizes, archived } = product
  const { saved, toggle } = useWishlist(_id)
  const { user } = useAuth()
  const { add, openBag } = useBag()
  // What the login modal is asking them to log in for: null (closed) | 'bag' | 'bookmark'.
  const [loginFor, setLoginFor] = useState(null)
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')

  // Listings send `sizes`; without them (or for a retired product) the card skips the
  // stock chip and the Quick add bar.
  const canAdd = Boolean(sizes) && !archived
  const soldOut = canAdd && SIZES.every((s) => !sizes[s])
  const lowStock = canAdd && !soldOut && SIZES.some((s) => sizes[s] > 0 && sizes[s] <= LOW_STOCK)

  async function handleBookmark() {
    if (!user) {
      setLoginFor('bookmark')
      return
    }
    try {
      await toggle()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't update your bookmarks. Please try again."))
    }
  }

  async function handleAdd(size) {
    if (!user) {
      setLoginFor('bag')
      return
    }
    setAdding(size)
    try {
      await add(_id, size, 1)
      openBag()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't add this to your bag. Please try again."))
    } finally {
      setAdding('')
    }
  }

  return (
    <article className="group relative flex flex-col">
      {/* The photos are 4:5 and the older catalogue ones print the product name along the
          bottom, so the window shows the top 82%: the whole garment, not the name. */}
      <div className={`relative overflow-hidden rounded-panel bg-photo ${feature ? 'aspect-square lg:aspect-auto lg:min-h-0 lg:flex-1' : 'aspect-[1/1.025]'}`}>
        <img
          src={image}
          alt={name}
          loading="lazy"
          draggable="false"
          className={`absolute inset-x-0 top-0 w-full object-cover transition-transform duration-[1200ms] ease-spring group-hover:scale-[1.035] ${feature ? 'h-full object-[50%_8%] lg:object-top' : 'aspect-[4/5]'}`}
        />

        {(soldOut || lowStock) && (
          <span className="pointer-events-none absolute left-2 top-2 z-[3] rounded-full bg-panel px-2.5 py-1 font-mono text-[11px] font-medium text-accent-fg sm:left-3 sm:top-3">
            {soldOut ? 'Sold out' : 'Low stock'}
          </span>
        )}

        {/* Mouse only: phones open the product page to pick a size. Focus inside also
            reveals it, so keyboard users can reach the sizes. */}
        {canAdd && !soldOut && (
          <div className="absolute inset-x-2 bottom-2 z-[3] flex translate-y-[calc(100%+12px)] items-center justify-between gap-2 rounded-inner bg-panel p-2.5 text-panel-fg shadow-[0_10px_30px_-14px_var(--c-shadow)] transition-transform duration-500 ease-spring group-focus-within:translate-y-0 group-hover:translate-y-0 [@media(hover:none)]:hidden">
            <span className="text-xs font-semibold">{adding ? 'Adding…' : 'Quick add'}</span>
            <div className="flex gap-1">
              {SIZES.map((s) => {
                const out = !sizes[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAdd(s)}
                    disabled={out || Boolean(adding)}
                    aria-label={out ? `${s}, sold out` : `Add ${name} in size ${s} to bag`}
                    className={`h-7 min-w-8 rounded-lg border border-line-strong px-1.5 font-mono text-xs font-medium transition-colors ${
                      out ? 'cursor-not-allowed line-through opacity-35' : 'enabled:hover:border-panel-fg enabled:hover:bg-panel-fg enabled:hover:text-panel'
                    } ${adding === s ? 'border-panel-fg bg-panel-fg text-panel' : ''}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hidden until hover on mouse devices so the grid stays calm; always shown on
          touch, and once saved. */}
      <button
        type="button"
        onClick={handleBookmark}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from bookmarks` : `Bookmark ${name}`}
        className={`absolute right-2 top-2 z-[3] grid h-9 w-9 place-items-center rounded-full bg-panel text-panel-fg shadow-[0_6px_20px_-10px_var(--c-shadow)] transition-[transform,opacity] duration-300 ease-spring hover:scale-105 focus-visible:opacity-100 group-hover:opacity-100 sm:right-3 sm:top-3 sm:h-10 sm:w-10 ${saved ? '' : '[@media(hover:hover)]:opacity-0'}`}
      >
        <Icon name={saved ? 'bookmarkFill' : 'bookmark'} className={`h-[18px] w-[18px] ${saved ? 'text-save' : ''}`} />
      </button>

      <div className="flex flex-col gap-1 px-0.5 pb-1 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <h3 className={feature ? 'display text-[clamp(28px,2.8vw,44px)] leading-[.95]' : 'text-sm font-semibold leading-snug sm:text-[15px]'}>
            {/* The link's ::after stretches over the card, so the whole tile opens the product. */}
            <Link to={`/product/${_id}`} className="after:absolute after:inset-0 after:z-[2] after:rounded-panel focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-fg">
              {name}
            </Link>
          </h3>
          <p className="text-[13px] text-fg-soft">{CATEGORY_LABELS[category] ?? category}</p>
        </div>
        <p className={`whitespace-nowrap font-semibold tabular-nums ${feature ? 'text-lg' : 'text-sm sm:text-[15px]'}`}>{formatPrice(price)}</p>
      </div>

      {loginFor && (
        <LoginModal open onClose={() => setLoginFor(null)} title={loginFor === 'bookmark' ? 'Log in to bookmark' : 'Log in to add to your bag'}>
          Your {loginFor === 'bookmark' ? 'bookmarks are' : 'bag is'} saved to your account, so you'll need to log in or create an account first.
        </LoginModal>
      )}
      {error && createPortal(<Toast message={error} onClose={() => setError('')} />, document.body)}
    </article>
  )
}

export default ProductCard

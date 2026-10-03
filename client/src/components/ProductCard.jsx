import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../hooks/useWishlist'
import { getErrorMessage } from '../utils/getErrorMessage'
import { CATEGORY_LABELS, formatPrice } from '../utils/product'
import { Icon } from './Icons'
import LoginModal from './LoginModal'
import Toast from './Toast'

// A product as a rounded panel: the photo with a bookmark chip in its corner, then the
// name, category and price. The name's link covers the whole card. `feature` is the big
// 2×2 card that leads the new drop, with the name in the display face.
function ProductCard({ product, feature = false }) {
  const { _id, name, price, image, category } = product
  const { saved, toggle } = useWishlist(_id)
  const { user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [error, setError] = useState('')

  async function handleBookmark() {
    if (!user) {
      setShowLogin(true)
      return
    }
    try {
      await toggle()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't update your bookmarks. Please try again."))
    }
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-panel bg-panel text-panel-fg">
      {/* The photos are 4:5 and the older catalogue ones print the product name along the
          bottom, so the window shows the top 82%: the whole garment, not the name. */}
      <div className={`relative overflow-hidden bg-photo ${feature ? 'aspect-[1/1.025] lg:aspect-auto lg:min-h-0 lg:flex-1' : 'aspect-[1/1.025]'}`}>
        <img
          src={image}
          alt={name}
          loading="lazy"
          draggable="false"
          className={`absolute inset-x-0 top-0 w-full object-cover transition-transform duration-[1200ms] ease-spring group-hover:scale-[1.03] ${feature ? 'h-full object-[50%_8%] lg:object-top' : 'aspect-[4/5]'}`}
        />
      </div>

      <button
        type="button"
        onClick={handleBookmark}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from bookmarks` : `Bookmark ${name}`}
        className="absolute right-2 top-2 z-[3] grid h-9 w-9 place-items-center rounded-full bg-panel text-panel-fg shadow-[0_6px_20px_-10px_var(--c-shadow)] transition-transform duration-300 ease-spring hover:scale-105 sm:right-3 sm:top-3 sm:h-10 sm:w-10"
      >
        <Icon name={saved ? 'bookmarkFill' : 'bookmark'} className={`h-[18px] w-[18px] ${saved ? 'text-save' : ''}`} />
      </button>

      <div className="flex flex-col gap-1 px-3 pb-3.5 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4 sm:pb-4 sm:pt-3.5">
        <div>
          <h3 className={feature ? 'display text-[clamp(26px,2.6vw,40px)] leading-[.95]' : 'text-sm font-semibold leading-snug sm:text-[15px]'}>
            {/* The link's ::after stretches over the card, so the whole panel opens the product. */}
            <Link to={`/product/${_id}`} className="after:absolute after:inset-0 after:z-[2] after:rounded-panel focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-fg">
              {name}
            </Link>
          </h3>
          <p className="text-[13px] text-panel-soft">{CATEGORY_LABELS[category] ?? category}</p>
        </div>
        <p className={`whitespace-nowrap font-semibold tabular-nums ${feature ? 'text-lg' : 'text-sm sm:text-[15px]'}`}>{formatPrice(price)}</p>
      </div>

      {showLogin && (
        <LoginModal open onClose={() => setShowLogin(false)} title="Log in to bookmark">
          Bookmarks are saved to your account, so you'll need to log in or create an account first.
        </LoginModal>
      )}
      {error && createPortal(<Toast message={error} onClose={() => setError('')} />, document.body)}
    </article>
  )
}

export default ProductCard

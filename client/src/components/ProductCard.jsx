import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSwing } from '../hooks/useSwing'
import { useWishlist } from '../hooks/useWishlist'
import { getErrorMessage } from '../utils/getErrorMessage'
import { formatPrice } from '../utils/product'
import LoginModal from './LoginModal'
import BookmarkIcon from './BookmarkIcon'
import Monogram from './Monogram'
import Toast from './Toast'
import hoodieFront from '../assets/placeholders/hoodie-front.jpg'
import hoodieBack from '../assets/placeholders/hoodie-back.jpg'
import teeFront from '../assets/placeholders/tee-front.jpg'
import teeBack from '../assets/placeholders/tee-back.jpg'

// Placeholder photos until the real product shots are in: T-shirts get the tee, everything
// else the hoodie. The front shows by default and the back fades in on hover.
const PLACEHOLDERS = {
  Tshirt: { front: teeFront, back: teeBack },
  default: { front: hoodieFront, back: hoodieBack },
}

// The tag's outline: the top corners cut off either side of the eyelet. The crimson layer
// is cut to this shape and the face sits 1.5px inside it, so a crimson foil line traces
// the edge. The face's corners move in a touch so the line keeps its width on the diagonals.
const tagShape = '[clip-path:polygon(22%_0,78%_0,100%_44px,100%_100%,0_100%,0_44px)]'
const faceShape = '[clip-path:polygon(calc(22%_+_0.6px)_0,calc(78%_-_0.6px)_0,100%_44.4px,100%_100%,0_100%,0_44.4px)]'

// The perforation between the cream body and the black stub has a notch at each end, cut
// by a mask on the crimson layer so it bites through the foil too. The seam sits below the
// photo (1.1 × the face width) and the name strip (--cap), so it's worked out from the
// card's width (cqw) and the notches land on it at every size.
const notchMask = 'radial-gradient(circle 7px at 0 var(--seam), #0000 98%, #000), radial-gradient(circle 7px at 100% var(--seam), #0000 98%, #000)'
const notchStyle = {
  '--seam': 'calc(1.5px + (100cqw - 3px) * 1.1 + var(--cap))',
  maskImage: notchMask,
  WebkitMaskImage: notchMask,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
}

// A product as a swing tag edged in crimson foil, hung from the rail by a crimson loop.
// The cream body carries the photo with the style name printed under it; below a notched
// perforation, a slim black stub holds the CB monogram, the price and the bookmark.
// Hovering swings it on its string. The photo and name open the product page, and the
// bookmark saves it to the wishlist.
function ProductCard({ product }) {
  const { _id, name, price, category } = product
  const photo = PLACEHOLDERS[category] ?? PLACEHOLDERS.default
  const { areaRef, swingRef } = useSwing()
  const { saved, toggle } = useWishlist(_id)
  const { user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [error, setError] = useState('')
  const href = `/product/${_id}`

  async function handleBookmarkClick() {
    if (!user) {
      setShowLogin(true)
      return
    }
    try {
      await toggle()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't update your wishlist. Please try again."))
    }
  }

  return (
    <article ref={areaRef} className="group @container relative mx-auto max-w-sm select-none">
      <div ref={swingRef} className="relative origin-top pt-10 will-change-transform">
        {/* The loop over the rail, running down through the eyelet. */}
        <svg viewBox="0 0 20 62" aria-hidden="true" className="absolute left-1/2 top-0 z-10 h-[62px] w-5 -translate-x-1/2 overflow-visible">
          <path d="M8 62 L7.2 7 Q10 -2.2 12.8 7 L12 62" fill="none" stroke="var(--color-crimson)" strokeWidth="1.75" strokeLinecap="round" />
        </svg>

        {/* --cap is the name strip's height: two lines of the name plus a little air. */}
        <div style={notchStyle} className={`rounded-b-2xl bg-crimson p-[1.5px] [--cap:52px] @min-[15rem]:[--cap:64px] ${tagShape}`}>
          <div className={`relative rounded-b-[15px] bg-smoke ${faceShape}`}>
            <div className="relative bg-paper-dim text-ink">
              {/* The eyelet, ringed by a crimson grommet. */}
              <span aria-hidden="true" className="absolute left-1/2 top-3.5 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_3px_var(--color-crimson),0_0_0_5px_var(--color-paper-dim),0_0_0_6px_rgb(179_18_46/0.45)]" />

              {/* The name link carries the product page for keyboards and screen readers. */}
              <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[1/1.1] overflow-hidden">
                {/* The tall photos are cropped to the middle of the garment, where the print is. */}
                <img
                  src={photo.front}
                  alt=""
                  loading="lazy"
                  draggable="false"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <img
                  src={photo.back}
                  alt=""
                  loading="lazy"
                  draggable="false"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
                />
              </Link>

              <div className="h-(--cap) overflow-hidden px-3 pt-0.5 @min-[15rem]:px-4">
                <h3 className="line-clamp-2 tracking-display text-lg leading-[1.12] text-balance @min-[15rem]:text-[22px]">
                  <Link to={href}>{name}</Link>
                </h3>
              </div>

              {/* The perforation, punched along the bottom edge of the cream. */}
              <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-[radial-gradient(circle,var(--color-smoke)_0_1.1px,transparent_1.5px)] bg-size-[7px_2px] bg-position-[0_50%] bg-repeat-x" />
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2.5 text-paper @min-[15rem]:gap-3 @min-[15rem]:px-4 @min-[15rem]:py-3">
              <Monogram label="" className="h-[26px] shrink-0 @min-[15rem]:h-8" />
              <span aria-hidden="true" className="my-0.5 w-px shrink-0 self-stretch bg-paper/15" />
              <div className="min-w-0">
                <p className="text-base leading-tight text-crimson-bright tabular-nums @min-[15rem]:text-xl">{formatPrice(price)}</p>
                {/* No room beside the monogram on phones. */}
                <p className="mt-0.5 hidden text-xs text-mute @min-[15rem]:block">Incl. of all taxes</p>
              </div>
              <button
                type="button"
                onClick={handleBookmarkClick}
                aria-pressed={saved}
                aria-label={`Save ${name} to wishlist`}
                className="group/bookmark ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] text-paper ring-[1.5px] ring-paper/20 ring-inset transition-colors hover:bg-paper/5 @min-[15rem]:size-[42px]"
              >
                <BookmarkIcon className="h-5 w-5 fill-none transition-transform duration-200 group-aria-pressed/bookmark:scale-110 group-aria-pressed/bookmark:fill-crimson-bright group-aria-pressed/bookmark:stroke-crimson-bright" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Only mounted when needed, so a page of cards doesn't hold a dialog each. */}
      {showLogin && (
        <LoginModal open onClose={() => setShowLogin(false)} title="Log in to save to your wishlist">
          Your wishlist is saved to your account, so you'll need to log in or create an account first.
        </LoginModal>
      )}
      {/* The card's swing transform and container query would pin a fixed toast to the card,
          so it renders on <body> instead. */}
      {error && createPortal(<Toast message={error} onClose={() => setError('')} />, document.body)}
    </article>
  )
}

export default ProductCard

import { Link } from 'react-router-dom'
import { useSwing } from '../hooks/useSwing'
import { useWishlist } from '../hooks/useWishlist'
import { CATEGORY_LABELS, formatPrice } from '../utils/product'
import Monogram from './Monogram'

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 fill-none stroke-current transition-transform duration-200 group-aria-pressed/heart:scale-110 group-aria-pressed/heart:fill-crimson-bright group-aria-pressed/heart:stroke-crimson-bright">
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover/view:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

// The tag's outline: the top corners cut off either side of the eyelet. The crimson layer
// is cut to this shape and the black face sits 1.5px inside it, so a crimson foil line
// traces the edge. The face's corners move in a touch so the line keeps its width on the diagonals.
const tagShape = '[clip-path:polygon(22%_0,78%_0,100%_44px,100%_100%,0_100%,0_44px)]'
const faceShape = '[clip-path:polygon(calc(22%_+_0.6px)_0,calc(78%_-_0.6px)_0,100%_44.4px,100%_100%,0_100%,0_44.4px)]'

// A product as a black swing tag edged in crimson foil, hung from the rail by a crimson
// loop: the CB monogram and category, the photo, then the style name and price. Hovering
// swings it on its string. "View" opens the product page and the heart saves it to the wishlist.
function ProductCard({ product }) {
  const { _id, name, price, image, category } = product
  const { areaRef, swingRef } = useSwing()
  const wishlist = useWishlist()
  const saved = wishlist.has(_id)
  const href = `/product/${_id}`

  return (
    <article ref={areaRef} className="group relative mx-auto max-w-sm select-none">
      <div ref={swingRef} className="relative origin-top pt-10 will-change-transform">
        {/* The loop over the rail, running down through the eyelet. */}
        <svg viewBox="0 0 20 62" aria-hidden="true" className="absolute left-1/2 top-0 z-10 h-[62px] w-5 -translate-x-1/2 overflow-visible">
          <path d="M8 62 L7.2 7 Q10 -2.2 12.8 7 L12 62" fill="none" stroke="var(--color-crimson)" strokeWidth="1.75" strokeLinecap="round" />
        </svg>

        <div className={`rounded-b-2xl bg-crimson p-[1.5px] ${tagShape}`}>
          <div className={`relative rounded-b-[15px] bg-smoke px-4 pb-[18px] pt-10 text-paper ${faceShape}`}>
            {/* The eyelet, ringed by a crimson grommet. */}
            <span aria-hidden="true" className="absolute left-1/2 top-3.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_3px_var(--color-crimson),0_0_0_5px_var(--color-smoke),0_0_0_6px_rgb(179_18_46/0.45)]" />

            <div className="flex items-center justify-between gap-3">
              <Monogram className="h-9" />
              {category && (
                <span className="text-[13px] text-mute">{CATEGORY_LABELS[category] ?? category}</span>
              )}
            </div>

            {/* The name and View link carry the product page for keyboards and screen readers. */}
            <Link to={href} tabIndex={-1} aria-hidden="true" className="relative mt-3 block aspect-[1/0.9] overflow-hidden rounded-lg bg-paper-dim">
              {/* The catalog photos (4:5) print the product name along the bottom. This window
                  shows the band from 10% to 82% of the photo: the whole garment, not the name. */}
              <img
                src={image}
                alt=""
                loading="lazy"
                draggable="false"
                className="absolute inset-x-0 -top-[14%] aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </Link>

            <h3 className="mt-[18px] line-clamp-2 min-h-[2lh] font-display text-[26px] leading-[1.12] text-balance">{name}</h3>

            <div className="mt-3.5 border-t border-paper/10 pt-3.5">
              <p className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-crimson-bright tabular-nums">{formatPrice(price)}</p>
              <p className="mt-0.5 text-xs text-mute">Incl. of all taxes</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to={href}
                aria-label={`View ${name}`}
                className="group/view flex flex-1 items-center justify-between rounded-[10px] bg-crimson px-4 py-3 font-semibold text-paper transition hover:brightness-110"
              >
                View
                <ArrowIcon />
              </Link>
              <button
                type="button"
                onClick={() => wishlist.toggle(_id)}
                aria-pressed={saved}
                aria-label={`Save ${name} to wishlist`}
                className="group/heart grid w-12 shrink-0 place-items-center rounded-[10px] text-paper ring-[1.5px] ring-paper/20 ring-inset transition-colors hover:bg-paper/5"
              >
                <HeartIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default ProductCard

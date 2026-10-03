import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { getErrorMessage } from '../utils/getErrorMessage'
import { CATEGORY_LABELS, SIZES, categoryPath, formatPrice } from '../utils/product'
import { useAuth } from '../context/AuthContext'
import { useBag } from '../context/bag'
import { useWishlist } from '../hooks/useWishlist'
import { Icon } from './Icons'
import LoginModal from './LoginModal'

gsap.registerPlugin(useGSAP, SplitText)

// A size with this many left or fewer says how many.
const SHOW_COUNT_BELOW = 5

// The product page body: the photo on the left, the details on the right, sticky beside
// it on wide screens. On arrival the photo wipes up into view, the name rises line by
// line, and the rest drops in after it.
function ProductView({ product }) {
  const rootRef = useRef(null)
  const titleRef = useRef(null)
  const [size, setSize] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'adding'
  const [message, setMessage] = useState('')
  const { user } = useAuth()
  const { add, openBag } = useBag()
  // What the login modal is asking them to log in for: null (closed) | 'bag' | 'bookmark'.
  const [loginFor, setLoginFor] = useState(null)
  const { saved, toggle } = useWishlist(product._id)
  const stock = product.sizes ?? {}
  const soldOut = SIZES.every((s) => !stock[s])
  const label = CATEGORY_LABELS[product.category] ?? product.category

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline()
        tl.fromTo('[data-photo]', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
        tl.from('[data-photo] img', { scale: 1.15, duration: 1.6, ease: 'expo.out' }, 0.2)
        SplitText.create(titleRef.current, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          // Its own tween, not part of tl: SplitText reverts whatever this returns when it re-splits.
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.5 }),
        })
        tl.from('[data-reveal]', { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.65)
      })
    },
    { scope: rootRef },
  )

  // A quick head-shake on the sizes when someone tries to add without picking one.
  const shakeSizes = contextSafe(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo('[data-sizes]', { x: 0 }, { x: 6, duration: 0.06, repeat: 5, yoyo: true, ease: 'sine.inOut', clearProps: 'x' })
  })

  async function handleAdd() {
    if (!user) {
      setLoginFor('bag')
      return
    }
    if (!size) {
      setMessage('Pick a size first.')
      shakeSizes()
      return
    }
    setStatus('adding')
    setMessage('')
    try {
      // A 400 (e.g. not enough stock) throws, and the catch shows the server's message.
      await add(product._id, size, 1)
      openBag()
    } catch (err) {
      console.log(err)
      setMessage(getErrorMessage(err, "Couldn't add this to your bag. Please try again."))
    } finally {
      setStatus('idle')
    }
  }

  async function handleBookmark() {
    if (!user) {
      setLoginFor('bookmark')
      return
    }
    try {
      await toggle()
    } catch (err) {
      console.log(err)
      setMessage(getErrorMessage(err, "Couldn't update your bookmarks. Please try again."))
    }
  }

  const left = size ? stock[size] : 0
  let note = ''
  if (soldOut) note = 'Sold out in every size. Bookmark it to find it again when it restocks.'
  else if (size && left <= SHOW_COUNT_BELOW) note = `Only ${left} left in ${size}.`
  else {
    const out = SIZES.filter((s) => !stock[s])
    if (out.length) note = `${out.join(' and ')} ${out.length === 1 ? 'is' : 'are'} sold out.`
  }

  return (
    <article ref={rootRef} className="grid items-start md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* The top 82% of the 4:5 photo, as on the cards: the older catalogue images print the
          product name along the bottom. */}
      <div data-photo className="relative aspect-[1/1.025] overflow-hidden bg-photo">
        <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover" />
      </div>

      <div className="flex flex-col gap-[22px] px-4 pb-4 pt-7 md:sticky md:top-[var(--nav-h,68px)] md:max-w-[600px] md:px-[clamp(24px,4.5vw,72px)] md:pb-12 md:pt-10">
        <p data-reveal className="text-sm font-semibold text-accent-fg">
          <Link to={categoryPath(product.category)} className="hover:underline hover:underline-offset-[3px]">{label}</Link>
        </p>
        <h1 ref={titleRef} className="display -mt-1.5 text-[clamp(48px,5.4vw,86px)]">{product.name}</h1>
        <p data-reveal className="flex flex-wrap items-baseline gap-3">
          <strong className="text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</strong>
          <span className="text-[13px] text-fg-soft">Incl. of all taxes</span>
        </p>

        <fieldset data-sizes data-reveal disabled={soldOut} className="min-w-0">
          <legend className="mb-3 text-sm font-semibold">Size</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const out = !stock[s]
              const picked = size === s
              return (
                <label
                  key={s}
                  className={`grid h-12 min-w-[66px] place-items-center rounded-full border-[1.5px] px-4 text-[15px] font-semibold transition-[border-color,background-color,color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[6px] has-[:focus-visible]:outline-fg ${
                    out
                      ? 'cursor-not-allowed border-dashed border-line-strong text-fg-soft line-through'
                      : picked
                        ? 'border-fg bg-fg text-canvas shadow-[0_0_0_2px_var(--c-canvas),0_0_0_4px_var(--c-accent)]'
                        : 'cursor-pointer border-line-strong hover:border-fg'
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={picked}
                    disabled={out}
                    onChange={() => {
                      setSize(s)
                      setMessage('')
                    }}
                    className="sr-only"
                  />
                  {s}
                  {out && <span className="sr-only">, sold out</span>}
                </label>
              )
            })}
          </div>
          {note && <p className="mt-2.5 text-[13px] text-fg-soft">{note}</p>}
        </fieldset>

        <div data-reveal className="flex gap-2.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut || status === 'adding'}
            className="group flex h-[58px] flex-1 items-center justify-between rounded-full bg-accent pl-7 pr-2 text-base font-semibold text-on-accent transition-shadow hover:shadow-[0_10px_30px_-12px_var(--c-accent)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {soldOut ? 'Sold out' : status === 'adding' ? 'Adding…' : 'Add to bag'}
            <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-on-accent/15 transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px">
              <Icon name="plus" className="h-4 w-4" />
            </span>
          </button>
          {/* Not disabled when sold out: saving it is how you come back when it restocks. */}
          <button
            type="button"
            onClick={handleBookmark}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from bookmarks` : `Bookmark ${product.name}`}
            className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border-[1.5px] border-line-strong transition-colors hover:border-fg"
          >
            <Icon name={saved ? 'bookmarkFill' : 'bookmark'} className={`h-5 w-5 ${saved ? 'text-accent-fg' : ''}`} />
          </button>
        </div>
        <p role="status" className="-mt-2 min-h-5 text-sm text-accent-fg">{message}</p>

        {product.description && (
          <p data-reveal className="max-w-[50ch] whitespace-pre-line">{product.description}</p>
        )}

        <div data-reveal className="border-t border-line">
          {[
            ['Size and fit', 'Relaxed fit with dropped shoulders. Between sizes? Write to clipbord.in@gmail.com with your usual size and we will help you choose.'],
            ['Shipping', 'We ship across India. Delivery time and charges show at checkout.'],
          ].map(([title, body]) => (
            <details key={title} className="group/d border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {title}
                <Icon name="plus" className="h-4 w-4 transition-transform duration-300 ease-spring group-open/d:rotate-45" />
              </summary>
              <p className="max-w-[54ch] pb-[18px] text-fg-soft">{body}</p>
            </details>
          ))}
        </div>
      </div>

      <LoginModal
        open={loginFor !== null}
        onClose={() => setLoginFor(null)}
        title={loginFor === 'bookmark' ? 'Log in to bookmark' : 'Log in to add to your bag'}
      >
        Your {loginFor === 'bookmark' ? 'bookmarks are' : 'bag is'} saved to your account, so you'll need to log in or create an account first.
      </LoginModal>
    </article>
  )
}

export default ProductView

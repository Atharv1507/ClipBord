import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { CATEGORY_LABELS, SIZES, formatPrice } from '../utils/product'
import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'

gsap.registerPlugin(useGSAP, SplitText)

// Most of one item a single add can put in the cart.
const MAX_QTY = 10
// Sizes with more than this many left just say "In stock".
const SHOW_COUNT_BELOW = 10

const labelClass = 'text-xs font-bold uppercase tracking-[0.2em] text-mute'
// Fills the screen below the sticky navbar (--nav-h is set by Navbar).
const screenH = 'md:h-[calc(100svh_-_var(--nav-h,64px))]'

function stockLabel(left) {
  if (!left) return 'Sold out'
  return left <= SHOW_COUNT_BELOW ? `${left} left` : 'In stock'
}

// The product page body, editorial layout: a big image on the left that stays put
// while the details scroll on the right. On arrival the image wipes up into view,
// the name rises line by line, and the rest drops in after it.
function ProductView({ product, onAdded }) {
  const rootRef = useRef(null)
  const titleRef = useRef(null)
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState('idle') // 'idle' | 'adding' | 'added'
  const [message, setMessage] = useState('')
  const {user}= useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const stock = product.sizes ?? {}
  const soldOut = SIZES.every((s) => !stock[s])
  const maxQty = size ? Math.min(MAX_QTY, stock[size]) : MAX_QTY

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline()
        tl.fromTo(
          '[data-photo]',
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' },
        )
        tl.from('[data-photo] img', { scale: 1.15, duration: 1.6, ease: 'expo.out' }, 0.2)
        SplitText.create(titleRef.current, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          // Its own tween, not part of tl: SplitText reverts whatever this returns when it re-splits.
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.5 }),
        })
        tl.from(
          '[data-reveal]',
          { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power2.out', stagger: 0.06 },
          0.65,
        )
      })
    },
    { scope: rootRef },
  )

  // A quick head-shake on the sizes when someone tries to add without picking one.
  const shakeSizes = contextSafe(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(
      '[data-sizes]',
      { x: 0 },
      { x: 6, duration: 0.06, repeat: 5, yoyo: true, ease: 'sine.inOut', clearProps: 'x' },
    )
  })

  // "Added to cart" shows for a moment, then the button goes back to normal.
  useEffect(() => {
    if (status !== 'added') return
    const timer = setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 2500)
    return () => clearTimeout(timer)
  }, [status])

  function pickSize(s) {
    setSize(s)
    setQuantity((q) => Math.min(q, stock[s], MAX_QTY))
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!size) {
      setMessage('Pick a size first.')
      shakeSizes()
      return
    }
    setStatus('adding')
    setMessage('')
    try {
      if(user){
        // A 400 (e.g. not enough stock) throws, and the catch below shows the server's message.
        await axiosInstance.post('/cart/addToCart',{
          productId:product._id,
          size:size,
          quantity:quantity
        })
        onAdded(quantity)
        setStatus('added')
        setMessage(`Added ${quantity} × ${size} to your cart.`)
      }
      else{
        setShowLogin(true)
        setStatus('idle')
      }
    } catch (err) {
      console.log(err)
      setMessage(getErrorMessage(err, "Couldn't add this to your cart. Please try again."))
      setStatus('idle')
    }
  }

  // Opened from inside the store: back to wherever they were (the drop, or the catalogue
  // page they were on). Opened from a shared link or a fresh tab: nothing to go back to, so home.
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/home')
  }

  let buttonLabel = `Add to cart · ${formatPrice(product.price * quantity)}`
  if (soldOut) buttonLabel = 'Sold out'
  else if (status === 'adding') buttonLabel = 'Adding…'
  else if (status === 'added') buttonLabel = 'Added to cart'

  return (
    <article ref={rootRef} className="grid md:grid-cols-[7fr_5fr] md:items-start">
      <div
        data-photo
        className={`relative aspect-[4/5] overflow-hidden bg-raised md:sticky md:top-[var(--nav-h,64px)] md:aspect-auto ${screenH}`}
      >
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={goBack}
          className="group absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/75 py-2.5 pl-3 pr-4 text-sm font-bold text-paper ring-1 ring-paper/15 backdrop-blur-sm transition-colors hover:bg-paper hover:text-ink sm:left-6 sm:top-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex flex-col justify-between gap-12 px-4 pb-16 pt-8 sm:px-8 md:min-h-[calc(100svh_-_var(--nav-h,64px))] md:px-11 md:py-12">
        <div>
          <div data-reveal className="flex items-baseline justify-between gap-4">
            <p className={labelClass}>{CATEGORY_LABELS[product.category] ?? product.category}</p>
            <p className="text-2xl font-bold tracking-tight text-crimson-bright">{formatPrice(product.price)}</p>
          </div>
          <h1
            ref={titleRef}
            className="mt-4 font-display text-5xl leading-[1.05] tracking-[-0.01em] text-paper lg:text-7xl"
          >
            {product.name}
          </h1>
          {product.description && (
            <p data-reveal className="mt-6 max-w-md whitespace-pre-line leading-relaxed text-mute">
              {product.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset data-sizes data-reveal disabled={soldOut}>
            <legend className={`mb-3 ${labelClass}`}>Size</legend>
            <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-raised bg-raised">
              {SIZES.map((s) => {
                const left = stock[s] ?? 0
                const out = !left
                const picked = size === s
                let tone = 'cursor-pointer bg-ink text-paper hover:bg-smoke'
                if (out) tone = 'cursor-not-allowed bg-ink text-neutral-600'
                else if (picked) tone = 'bg-paper text-ink'
                return (
                  <label
                    key={s}
                    className={`py-3.5 text-center transition-colors has-[:focus-visible]:inset-ring-2 has-[:focus-visible]:inset-ring-crimson-bright ${tone}`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={picked}
                      disabled={out}
                      onChange={() => pickSize(s)}
                      className="sr-only"
                    />
                    <span className={`block text-lg font-bold ${out ? 'line-through' : ''}`}>{s}</span>
                    <span className={`block text-xs ${out ? 'text-neutral-600' : picked ? 'text-ink/60' : 'text-mute'}`}>
                      {stockLabel(left)}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div data-reveal className="mt-4 flex gap-3">
            <div role="group" aria-label="Quantity" className="flex items-center rounded-md bg-smoke">
              <button
                type="button"
                onClick={() => setQuantity((q) => q - 1)}
                disabled={soldOut || quantity <= 1}
                aria-label="Decrease quantity"
                className="grid h-12 w-11 place-items-center text-lg text-paper transition-colors hover:text-crimson-bright disabled:cursor-not-allowed disabled:text-neutral-600"
              >
                −
              </button>
              <output aria-live="polite" className="w-7 text-center font-bold tabular-nums text-paper">
                {quantity}
              </output>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={soldOut || quantity >= maxQty}
                aria-label="Increase quantity"
                className="grid h-12 w-11 place-items-center text-lg text-paper transition-colors hover:text-crimson-bright disabled:cursor-not-allowed disabled:text-neutral-600"
              >
                +
              </button>
            </div>
            <button
              type="submit"
              disabled={soldOut || status === 'adding'}
              className="h-12 flex-1 rounded-md bg-crimson px-5 font-bold text-paper transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
            >
              {buttonLabel}
            </button>
          </div>

          <p role="status" className={`mt-3 min-h-5 text-sm ${status === 'added' ? 'text-paper' : 'text-crimson-bright'}`}>
            {message}
          </p>
        </form>
      </div>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} title="Log in to add to your cart">
        Your cart is saved to your account, so you'll need to log in or create an account first.
      </LoginModal>
    </article>
  )
}

export default ProductView

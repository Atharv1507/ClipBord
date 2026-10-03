import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ProductView from '../components/ProductView'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  // TODO: once the cart API exists, move this into a shared cart context so the
  // badge is right on every page, not just this one.
  const [cartCount, setCartCount] = useState(0)
  useSmoothScroll()

  // Coming from partway down the home page would otherwise open this page mid-way down.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

  // TODO: Load the badge count.
  //   - In a useEffect, GET /cart/getCart and setCartCount(res.data.cart.count).
  //   - A 401 just means nobody is logged in: leave the count at 0.
  //   - Use the same `ignore` pattern as the product request below.

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get(`/products/getproduct/${id}`)
      .then((res) => {
        if (ignore) return
        setProduct(res.data.prod)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setError(getErrorMessage(err, "Couldn't load this product. Check your connection and try again."))
        setStatus('error')
      })
    return () => {
      ignore = true
    }
  }, [id, attempt])

  useEffect(() => {
    if (!product) return
    document.title = `${product.name} · Clipbord`
    return () => {
      document.title = 'Clipbord'
    }
  }, [product])

  function handleRetry() {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }

  // Back/forward between two product pages reuses this page, so hold off showing
  // the old product under the new id.
  const current = product?._id === id ? product : null

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar cartCount={cartCount} />
      <main className="flex-1" aria-busy={status === 'loading'}>
        {status === 'error' && (
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div role="alert" className="max-w-lg rounded-md bg-raised p-8">
              <p className="text-paper">{error}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-md bg-crimson px-5 py-2.5 text-sm font-bold text-paper transition hover:brightness-110"
                >
                  Try again
                </button>
                <Link to="/home" className="rounded-md px-5 py-2.5 text-sm text-mute transition-colors hover:text-paper">
                  Back to the drop
                </Link>
              </div>
            </div>
          </div>
        )}

        {status !== 'error' && current && (
          <ProductView
            key={current._id}
            product={current}
            onAdded={(quantity) => setCartCount((n) => n + quantity)}
          />
        )}

        {status !== 'error' && !current && (
          <div className="grid md:grid-cols-[7fr_5fr]" aria-hidden="true">
            <div className="aspect-[4/5] bg-raised motion-safe:animate-pulse md:aspect-auto md:h-[calc(100svh_-_var(--nav-h,64px))]" />
            <div className="flex flex-col gap-4 px-4 pt-8 sm:px-8 md:px-11 md:pt-24">
              <div className="h-3 w-24 rounded-md bg-raised motion-safe:animate-pulse" />
              <div className="h-14 w-4/5 rounded-md bg-raised motion-safe:animate-pulse" />
              <div className="h-16 w-full max-w-md rounded-md bg-raised motion-safe:animate-pulse" />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProductDetails

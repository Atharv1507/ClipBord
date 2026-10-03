import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductRack from '../components/ProductRack'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

// The saved products as hang tags, same as the catalogue. Un-bookmarking a tag here
// empties its bookmark but leaves it on the rail until the page is opened again, so
// the grid doesn't jump under the cursor and a mis-tap can be undone.
function Wishlist() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error' | 'loggedOut'
  const [error, setError] = useState('')
  useSmoothScroll()

  useEffect(() => {
    document.title = 'Wishlist · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  // Bumping this runs the effect below again; the Try again button uses it.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get('/wishlist/getWishlist')
      .then((res) => {
        if (ignore) return
        setProducts(res.data.products)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        if (err.response?.status === 401) {
          setStatus('loggedOut')
        } else {
          setError(getErrorMessage(err, "Couldn't load your wishlist. Please try again."))
          setStatus('error')
        }
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  function handleRetry() {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }

  const isEmpty = status === 'ready' && products.length === 0

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1" aria-busy={status === 'loading'}>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:pt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-5xl tracking-display sm:text-6xl">Your wishlist</h1>
            {status === 'ready' && !isEmpty && (
              <p className="text-sm text-mute">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>

          {status === 'loading' && (
            <div className="mt-10">
              <ProductRack placeholders={4} />
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="mt-10 max-w-lg rounded-md bg-raised p-8">
              <p className="text-paper">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-6 rounded-md bg-crimson px-5 py-2.5 text-sm text-paper transition hover:brightness-110"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'loggedOut' && (
            <div className="mt-10 max-w-lg">
              <p className="text-lg leading-relaxed text-mute">Log in to see your wishlist.</p>
              <Link
                to="/login"
                className="mt-8 inline-block rounded-md bg-crimson px-8 py-4 text-paper transition hover:brightness-110"
              >
                Log in
              </Link>
            </div>
          )}

          {isEmpty && (
            <div className="mt-10 max-w-lg">
              <p className="text-lg leading-relaxed text-mute">Nothing saved yet. Tap the bookmark on any tag to keep it here.</p>
              <Link
                to="/catalogue"
                className="mt-8 inline-block rounded-md bg-crimson px-8 py-4 text-paper transition hover:brightness-110"
              >
                Browse the catalogue
              </Link>
            </div>
          )}

          {status === 'ready' && !isEmpty && (
            <div className="mt-10">
              <ProductRack products={products} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Wishlist

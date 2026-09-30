import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// Catch-all for any URL that doesn't match a route. Vercel rewrites every path to
// index.html (see vercel.json), so unknown URLs land here instead of Vercel's own 404.
function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
          <p className="text-sm tracking-[0.2em] text-crimson-bright">404</p>
          <h1 className="mt-4 font-display text-5xl tracking-[-0.01em] sm:text-7xl">
            This page isn’t on the list.
          </h1>
          <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-mute">
            The link might be old, or the address has a typo. The good stuff is still where
            you left it.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/home"
              className="rounded-md bg-crimson px-8 py-4 font-bold text-paper transition hover:brightness-110"
            >
              Back to home
            </Link>
            <Link
              to="/catalogue"
              className="rounded-md bg-smoke px-8 py-4 font-bold text-paper transition-colors hover:bg-raised"
            >
              Browse the catalogue
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound

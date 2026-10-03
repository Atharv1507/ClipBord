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
        <div className="w-full px-4 py-24 md:px-[clamp(16px,2.2vw,32px)]">
          <p className="text-sm font-semibold text-accent-fg">404</p>
          <h1 className="display mt-4 max-w-[14ch] text-[clamp(56px,9vw,150px)]">
            This page isn’t on the list.
          </h1>
          <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-fg-soft">
            The link might be old, or the address has a typo. The good stuff is still where
            you left it.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/home"
              className="inline-flex h-[52px] items-center rounded-full bg-accent px-7 font-semibold text-on-accent transition hover:brightness-110"
            >
              Back to home
            </Link>
            <Link
              to="/catalogue"
              className="inline-flex h-[52px] items-center rounded-full border-[1.5px] border-line-strong px-7 font-semibold transition-colors hover:border-fg"
            >
              Shop all
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound

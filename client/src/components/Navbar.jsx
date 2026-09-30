import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import Logo from './Logo'
import SearchBar from './SearchBar'

function getInitials(fullName = '') {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return initials.toUpperCase() || '?'
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <path d="M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </svg>
  )
}

// The cart is visual only until there's a cart API; cartCount just drives the badge.
function Navbar({ query, onQueryChange, cartCount = 0, logoRef }) {
  // undefined while /customer/me is loading, null when nobody is logged in
  const [user, setUser] = useState(undefined)
  const navigate = useNavigate()
  const headerRef = useRef(null)

  // Publish the header's height as --nav-h so full-screen sections can fit below it.
  // It changes when the search box wraps onto its own row on small screens.
  useEffect(() => {
    const header = headerRef.current
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`)
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get('/customer/me')
      .then((res) => {
        if (!ignore) setUser(res.data.userData)
      })
      .catch(() => {
        if (!ignore) setUser(null)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function handleLogout() {
    try {
      await axiosInstance.post('/customer/logout')
      navigate('/login')
    }
    catch (err) {
      console.log('logout failed', err)
    }
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-ink">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link to="/home" className="text-paper transition-colors hover:text-crimson-bright">
          <Logo ref={logoRef} className="h-10" />
        </Link>

        {/* Search drives the product listings, so pages without one leave it out. */}
        {onQueryChange && (
          <SearchBar
            query={query}
            onQueryChange={onQueryChange}
            className="order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1"
          />
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <NavLink
            to="/catalogue"
            className={({ isActive }) =>
              `px-2 py-2 text-sm transition-colors hover:text-paper ${isActive ? 'text-paper' : 'text-mute'}`
            }
          >
            Catalogue
          </NavLink>

          <button
            type="button"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            className="relative grid h-10 w-10 place-items-center text-paper transition-colors hover:text-crimson-bright"
          >
            <CartIcon />
            <span
              aria-hidden="true"
              className="absolute right-0 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[11px] font-bold text-paper"
            >
              {cartCount}
            </span>
          </button>

          {user && (
            <>
              <span
                role="img"
                aria-label={`Logged in as ${user.fullName}`}
                title={user.fullName}
                className="grid h-9 w-9 place-items-center rounded-full bg-raised text-sm font-bold text-paper"
              >
                {getInitials(user.fullName)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2 py-2 text-sm text-mute transition-colors hover:text-paper"
              >
                Log out
              </button>
            </>
          )}

          {user === null && (
            <Link to="/login" className="px-2 py-2 text-sm text-mute transition-colors hover:text-paper">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar

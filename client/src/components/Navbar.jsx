import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import { useAuth } from '../context/AuthContext'
import { useBag } from '../context/bag'
import { useTheme } from '../hooks/useTheme'
import { useWishlistCount } from '../hooks/useWishlist'
import { CATEGORY_LABELS, categoryPath } from '../utils/product'
import { Icon } from './Icons'
import Logo from './Logo'
import SearchPanel from './SearchPanel'

const NAV = [
  { to: '/home#new', label: 'New drop', key: 'new' },
  { to: categoryPath('Tshirt'), label: CATEGORY_LABELS.Tshirt, key: 'Tshirt' },
  { to: categoryPath('Sweat Shirt'), label: CATEGORY_LABELS['Sweat Shirt'], key: 'Sweat Shirt' },
  { to: categoryPath('Joggers'), label: CATEGORY_LABELS.Joggers, key: 'Joggers' },
]

function initials(fullName = '') {
  return fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

const iconButton = 'relative grid h-[42px] w-[42px] place-items-center rounded-full transition-colors hover:bg-line'

function ModeButton() {
  const { dark, toggle } = useTheme()
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className={iconButton}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}

// The profile avatar and its menu: who's logged in, bookmarks, the bag and Log out.
function AccountMenu({ user, onLogout, onOpenChange }) {
  const [open, setOpen] = useState(false)
  // Tell the header, so it can come forward over the home hero while the menu is open.
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])
  const { openBag } = useBag()
  const rootRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...rootRef.current.querySelectorAll('[role="menuitem"]')]
        const i = items.indexOf(document.activeElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus()
        e.preventDefault()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    rootRef.current.querySelector('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex h-[42px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm transition-colors hover:bg-drawer-line'
  const avatar = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold tracking-wide text-on-accent'

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.fullName}`}
        className="flex h-[42px] items-center gap-1 rounded-full p-[3px] transition-colors md:pr-1.5 hover:bg-line aria-expanded:bg-line"
      >
        <span className={avatar}>{initials(user.fullName)}</span>
        <Icon name="caret" className={`hidden h-3.5 w-3.5 transition-transform duration-300 ease-spring md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] origin-top-right rounded-2xl bg-drawer p-1.5 text-drawer-fg shadow-[0_0_0_1px_var(--c-drawer-line),0_24px_48px_-20px_var(--c-shadow)] motion-safe:animate-[pop-in_.35s_var(--ease-spring)]">
          <div className="mb-1.5 flex items-center gap-3 border-b border-drawer-line px-3 pb-3.5 pt-3">
            <span className={avatar}>{initials(user.fullName)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              {user.email && <p className="truncate text-[13px] text-drawer-soft">{user.email}</p>}
            </div>
          </div>
          <Link role="menuitem" to="/wishlist" onClick={() => setOpen(false)} className={item}>
            <Icon name="bookmark" className="h-[18px] w-[18px]" /> Bookmarks
          </Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); openBag() }} className={item}>
            <Icon name="bag" className="h-[18px] w-[18px]" /> Bag
          </button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onLogout() }} className={`${item} text-accent-fg`}>
            <Icon name="logout" className="h-[18px] w-[18px]" /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

// The full-screen menu on phones and tablets: the links big, then search, the mode,
// bookmarks and the account. Native modal <dialog>: focus trap and Escape for free.
function MenuSheet({ open, onClose, onSearch, onLogout, user }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const link = 'block py-1 display text-[clamp(44px,13vw,64px)]'
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Menu"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-canvas p-0 text-fg motion-safe:transition-[clip-path] motion-safe:duration-500 motion-safe:ease-spring motion-safe:starting:[clip-path:inset(0_0_100%_0)] [clip-path:inset(0)]"
    >
      <div className="flex min-h-full flex-col px-4 pb-7">
        <div className="-mx-2 flex h-[var(--nav-h,58px)] items-center justify-between">
          <button type="button" onClick={onClose} aria-label="Close menu" className={iconButton}><Icon name="x" /></button>
          <div className="flex">
            <button type="button" onClick={onSearch} aria-label="Search" className={iconButton}><Icon name="search" /></button>
            <ModeButton />
          </div>
        </div>
        <ul className="mt-4">
          {NAV.map((n) => (
            <li key={n.key}><Link to={n.to} onClick={onClose} className={link}>{n.label}</Link></li>
          ))}
          <li><Link to="/about" onClick={onClose} className={link}>About</Link></li>
        </ul>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-7">
          <Link to="/wishlist" onClick={onClose} className="inline-flex h-[52px] items-center gap-2.5 rounded-full border-[1.5px] border-line-strong px-6 font-semibold">
            <Icon name="bookmark" /> Bookmarks
          </Link>
          {user ? (
            <button type="button" onClick={() => { onClose(); onLogout() }} className="inline-flex h-[52px] items-center gap-2.5 rounded-full border-[1.5px] border-line-strong px-6 font-semibold">
              <Icon name="logout" /> Log out
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="inline-flex h-[52px] items-center rounded-full border-[1.5px] border-line-strong px-6 font-semibold">Log in</Link>
          )}
        </div>
        <p className="mt-4 text-sm text-fg-soft">clipbord.in@gmail.com</p>
      </div>
    </dialog>
  )
}

// The site header: links on the left, the logo in the middle (the hero logo docks into
// it on the home page), search, light/dark, bookmarks, the account and the bag on the right.
function Navbar({ logoRef }) {
  const { user, setUser, loading } = useAuth()
  const { cart, openBag } = useBag()
  const savedCount = useWishlistCount()
  const navigate = useNavigate()
  const location = useLocation()
  const headerRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // On the home page the hero layer (z-45) sits over the header so its logo can fly in;
  // the header comes forward while the account menu hangs down over it.
  const [accountOpen, setAccountOpen] = useState(false)
  // The search stays open only on the page it was opened on: navigating closes it.
  const [searchAt, setSearchAt] = useState(null)
  const searchOpen = searchAt === location.key
  const setSearchOpen = (open) => setSearchAt(open ? location.key : null)

  // Publish the header's height as --nav-h so full-screen sections can fit below it.
  useEffect(() => {
    const header = headerRef.current
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`)
    })
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const params = new URLSearchParams(location.search)
  const here = location.pathname === '/catalogue' ? params.get('category') : null

  async function handleLogout() {
    try {
      await axiosInstance.post('/customer/logout')
      setUser(null)
      navigate('/home')
    } catch (err) {
      console.log('logout failed', err)
    }
  }

  const count = cart.count
  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 ${accountOpen ? 'z-[46]' : 'z-40'} grid h-[58px] grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-canvas px-4 transition-colors duration-500 md:h-[68px] md:px-[clamp(16px,2.2vw,32px)]`}
      >
        <div className="flex items-center">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className={`${iconButton} -ml-2 min-[1060px]:hidden`}>
            <Icon name="list" />
          </button>
          <nav aria-label="Primary" className="hidden min-[1060px]:block">
            <ul className="flex gap-[26px]">
              {NAV.map((n) => (
                <li key={n.key}>
                  <Link
                    to={n.to}
                    aria-current={n.key === here ? 'page' : undefined}
                    className="whitespace-nowrap bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1.5px] bg-[position:0_100%] bg-no-repeat py-1.5 text-sm font-medium transition-[background-size] duration-300 ease-out-soft hover:bg-[length:100%_1.5px] aria-[current=page]:bg-[length:100%_1.5px]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link to="/home" aria-label="Clipbord home" className="text-fg">
          <Logo ref={logoRef} className="h-8 md:h-[38px]" />
        </Link>

        <div className="flex items-center justify-end gap-0.5">
          <button type="button" onClick={() => setSearchOpen(!searchOpen)} aria-expanded={searchOpen} aria-controls="site-search" aria-label="Search" className={`${iconButton} hidden md:grid`}>
            <Icon name="search" />
          </button>
          <span className="hidden md:block"><ModeButton /></span>
          <Link to="/wishlist" aria-label={`Bookmarks, ${savedCount} ${savedCount === 1 ? 'item' : 'items'}`} className={`${iconButton} hidden md:grid`}>
            <Icon name="bookmark" />
            {savedCount > 0 && (
              <span className="absolute right-0 top-1 h-4 min-w-4 rounded-full bg-fg px-1 text-center text-[10px] font-semibold leading-4 text-canvas">{savedCount}</span>
            )}
          </Link>

          {user && <span className="md:ml-1.5"><AccountMenu user={user} onLogout={handleLogout} onOpenChange={setAccountOpen} /></span>}
          {!loading && !user && (
            <Link to="/login" aria-label="Log in" className="grid h-[42px] w-[42px] place-items-center rounded-full transition-colors hover:bg-line md:ml-1.5 md:flex md:w-auto md:items-center md:border-[1.5px] md:border-line-strong md:px-[18px] md:text-sm md:font-semibold md:hover:border-fg md:hover:bg-transparent">
              <Icon name="user" className="h-5 w-5 md:hidden" />
              <span className="hidden md:inline">Log in</span>
            </Link>
          )}

          <button
            type="button"
            onClick={openBag}
            aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}
            className="relative grid h-[42px] w-[42px] place-items-center rounded-full transition-[transform,background-color] duration-300 ease-spring hover:bg-line active:scale-[.97] md:ml-2 md:flex md:w-auto md:items-center md:gap-2.5 md:bg-fg md:pl-4 md:pr-1 md:text-sm md:font-semibold md:text-canvas md:hover:bg-fg"
          >
            {/* Phones: the bag icon with a small badge. From md up: a "Bag" pill with the count. */}
            <Icon name="bag" className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Bag</span>
            <span
              className={`absolute right-0 top-0.5 h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-on-accent md:static md:grid md:h-[30px] md:min-w-[30px] md:px-2 md:text-[13px] ${count > 0 ? 'grid' : 'hidden'}`}
            >
              {count}
            </span>
          </button>
        </div>
      </header>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={() => { setMenuOpen(false); setSearchOpen(true) }}
        onLogout={handleLogout}
        user={user}
      />
    </>
  )
}

export default Navbar

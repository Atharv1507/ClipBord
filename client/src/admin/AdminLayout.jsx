import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Icon } from '../components/Icons'
import { axiosInstance } from '../axiosCalls/axios'
import { useTheme } from '../hooks/useTheme'
import { clearAdminHint } from '../utils/adminHint'

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'sliders', end: true },
  { to: '/admin/products', label: 'Products', icon: 'bag' },
  { to: '/admin/orders', label: 'Orders', icon: 'list' },
]

const navItem = ({ isActive }) =>
  `flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-semibold transition-colors ${
    isActive ? 'bg-fg text-canvas' : 'text-fg-soft hover:bg-line hover:text-fg'
  }`

// The dashboard frame: a sidebar on wide screens, a top bar with tabs on phones.
// Deliberately not the shop's navbar, so it's always clear you're in admin.
function AdminLayout({ email, children }) {
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  async function logout() {
    try {
      await axiosInstance.post('/admin/logout')
    } catch (err) {
      // The session ends on this device either way.
      console.log(err)
    }
    clearAdminHint()
    navigate('/home', { replace: true })
  }

  const themeButton = (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="grid h-10 w-10 place-items-center rounded-full hover:bg-line">
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )

  return (
    <div className="min-h-screen bg-canvas text-fg lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-4 py-5">
          <Link to="/admin" className="flex items-center gap-3 px-2 text-fg">
            <Logo className="h-8" />
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-on-accent">Admin</span>
          </Link>
          <nav aria-label="Admin" className="mt-8 flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navItem}>
                <Icon name={n.icon} className="h-[18px] w-[18px]" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
            {email && <p className="truncate px-4 pb-2 text-[13px] text-fg-soft">{email}</p>}
            <Link to="/home" className="flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-semibold text-fg-soft hover:bg-line hover:text-fg">
              <Icon name="arrow" className="h-[18px] w-[18px] rotate-180" /> View shop
            </Link>
            <button type="button" onClick={logout} className="flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-semibold text-accent-fg hover:bg-line">
              <Icon name="logout" className="h-[18px] w-[18px]" /> Log out
            </button>
            <div className="px-2 pt-1">{themeButton}</div>
          </div>
        </div>
      </aside>

      {/* Phones and tablets */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2.5 text-fg">
            <Logo className="h-7" />
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-on-accent">Admin</span>
          </Link>
          <div className="flex items-center">
            {themeButton}
            <button type="button" onClick={logout} aria-label="Log out" className="grid h-10 w-10 place-items-center rounded-full text-accent-fg hover:bg-line">
              <Icon name="logout" />
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 px-3 pb-2.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex h-9 flex-1 items-center justify-center rounded-full text-sm font-semibold ${isActive ? 'bg-fg text-canvas' : 'text-fg-soft hover:bg-line'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
    </div>
  )
}

export default AdminLayout

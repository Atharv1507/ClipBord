import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { Icon } from './Icons'
import Logo from './Logo'

export const fieldClass =
  'h-[50px] w-full rounded-[14px] border-[1.5px] border-drawer-line bg-transparent px-[18px] text-base text-drawer-fg outline-none transition-colors placeholder:text-drawer-soft focus:border-drawer-fg'
export const labelClass = 'mb-1.5 block text-[13px] font-semibold'
export const submitClass =
  'group mt-2 flex h-[52px] w-full items-center justify-between rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent transition-shadow hover:shadow-[0_10px_30px_-12px_var(--c-accent)] disabled:cursor-not-allowed disabled:opacity-50'

// The frame for the log in and sign up pages: the logo back to home and the light/dark
// switch on top, then the form in a card with a soft outer bezel.
function AuthShell({ title, intro, children, footer }) {
  const { dark, toggle } = useTheme()
  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4 pb-12">
      <div className="flex h-[68px] items-center justify-between">
        <Link to="/home" aria-label="Clipbord home" className="text-fg">
          <Logo className="h-9" />
        </Link>
        <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="grid h-[42px] w-[42px] place-items-center rounded-full hover:bg-line">
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
      </div>
      <main className="grid flex-1 place-items-center">
        <div className="w-full max-w-[440px] rounded-[28px] bg-drawer/70 p-2 shadow-[0_0_0_1px_var(--c-drawer-line),0_40px_80px_-30px_var(--c-shadow)] motion-safe:animate-[rise-in_.5s_var(--ease-spring)]">
          <div className="rounded-[22px] bg-drawer px-6 pb-6 pt-7 text-drawer-fg">
            <h1 className="display text-[clamp(40px,7vw,56px)]">{title}</h1>
            <p className="mt-2.5 text-sm text-drawer-soft">{intro}</p>
            {children}
          </div>
        </div>
        <p className="mt-6 text-sm text-fg-soft">{footer}</p>
      </main>
    </div>
  )
}

export function SubmitArrow() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15 transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
      <Icon name="arrow" className="h-4 w-4" />
    </span>
  )
}

export default AuthShell

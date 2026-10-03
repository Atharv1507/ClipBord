import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../utils/contact'
import Monogram from './Monogram'

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const headingClass = 'text-sm text-mute'
const linkClass = 'text-paper transition-colors hover:text-crimson-bright'

// Site footer: the contact email up front, links to the About page's sections and
// Instagram beside it. Pages that use it give their root element id="top".
function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-ink">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <p className="text-mute">Sizing, an order or a collab idea? Write to us.</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-block break-words text-[clamp(1.75rem,5.5vw,3.25rem)] leading-tight tracking-display text-paper underline decoration-crimson-bright decoration-2 underline-offset-[0.2em] transition-colors hover:text-crimson-bright"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav aria-labelledby="footer-company">
              <p id="footer-company" className={headingClass}>Company</p>
              <ul className="mt-4 space-y-3">
                <li><Link to="/about#about" className={linkClass}>About us</Link></li>
                <li><Link to="/about#story" className={linkClass}>Our story</Link></li>
                <li><Link to="/about#contact" className={linkClass}>Contact us</Link></li>
              </ul>
            </nav>

            <div>
              <p className={headingClass}>Follow us</p>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 ${linkClass}`}
                  >
                    <InstagramIcon />
                    <span>
                      Instagram
                      <span className="block text-sm text-mute">@{INSTAGRAM_HANDLE}</span>
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between gap-4 border-t border-paper/10 py-6 text-sm text-mute">
          <div className="flex items-center gap-4">
            <Monogram label="" className="h-14 text-paper" />
            <p>&copy; {new Date().getFullYear()} Clipbord</p>
          </div>
          <a href="#top" className="transition-colors hover:text-paper">Back to top</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer

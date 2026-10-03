import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../utils/contact'
import { CATEGORY_LABELS, categoryPath } from '../utils/product'
import { Icon } from './Icons'
import Logo from './Logo'

const heading = 'mb-3 text-sm font-semibold'
const link = 'text-sm hover:underline hover:underline-offset-[3px]'

// Site footer: the contact email big, then the logo in the bottom-left with the shop,
// help and brand links beside it. Pages that use it give their root element id="top".
function Footer() {
  return (
    <footer className="mt-[clamp(110px,12vw,170px)] bg-canvas-2 px-4 pb-7 pt-[clamp(56px,7vw,96px)] transition-colors duration-500 md:px-[clamp(16px,2.2vw,32px)]">
      <p className="text-fg-soft">Sizing, an order or a collab idea? Write to us.</p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="display mt-2.5 inline-block break-all bg-[linear-gradient(var(--c-accent),var(--c-accent))] bg-[length:100%_4px] bg-[position:0_100%] bg-no-repeat pb-1.5 text-[clamp(34px,6.6vw,108px)] transition-[background-size] duration-500 ease-spring hover:bg-[length:100%_10px]"
      >
        {CONTACT_EMAIL}
      </a>

      <div className="mt-[clamp(48px,6vw,88px)] grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <Link to="/home" aria-label="Clipbord home" className="order-last col-span-2 mt-3 self-end text-fg md:order-none md:col-span-1 md:mt-0">
          <Logo className="w-[clamp(160px,17vw,260px)]" />
        </Link>
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={heading}>Shop</h2>
          <ul className="space-y-2">
            <li><Link to="/home#new" className={link}>New drop</Link></li>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <li key={value}><Link to={categoryPath(value)} className={link}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className={heading}>Help</h2>
          <ul className="space-y-2">
            <li><Link to="/about#contact" className={link}>Contact us</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className={link}>Email us</a></li>
            <li><Link to="/wishlist" className={link}>Bookmarks</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-brand">
          <h2 id="footer-brand" className={heading}>Clipbord</h2>
          <ul className="space-y-2">
            <li><Link to="/about#about" className={link}>About us</Link></li>
            <li><Link to="/about#story" className={link}>Our story</Link></li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${link}`}>
                <Icon name="instagram" className="h-4 w-4" /> @{INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-5 text-[13px] text-fg-soft">
        <p>&copy; {new Date().getFullYear()} Clipbord. Prices in ₹, incl. of all taxes.</p>
        <a href="#top" className="hover:text-fg">Back to top</a>
      </div>
    </footer>
  )
}

export default Footer

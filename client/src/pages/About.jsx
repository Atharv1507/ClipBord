import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../utils/contact'

const sectionClass = 'scroll-mt-24 border-t border-paper/10 py-14 first-of-type:border-t-0 sm:py-20'
const headingClass = 'text-5xl tracking-display sm:text-6xl'
const bodyClass = 'mt-6 max-w-[60ch] text-lg leading-relaxed text-mute'
const inlineLinkClass =
  'text-paper underline decoration-crimson-bright underline-offset-4 transition-colors hover:text-crimson-bright'

// About page: who we are, our story and how to reach us. The footer links straight to
// each section (/about#about, #story, #contact).
// TODO: the "Our story" copy is still a draft; replace it with the brand's own words.
function About() {
  const { hash } = useLocation()
  useSmoothScroll()

  // Land on the linked section, or the top when there isn't one. Coming from partway
  // down another page would otherwise open this one mid-way down.
  useLayoutEffect(() => {
    const section = hash && document.getElementById(hash.slice(1))
    if (section) section.scrollIntoView({ behavior: 'instant' })
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [hash])

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="sr-only">About Clipbord</h1>

          <section id="about" aria-labelledby="about-heading" className={sectionClass}>
            <h2 id="about-heading" className={headingClass}>About us</h2>
            <div className={`${bodyClass} space-y-5`}>
              <p>Getting dressed is part of your personality. We get it.</p>
              <p>
                CLIPBORD is modern streetwear with a playful twist. Our pieces draw on music, art,
                culture, and the streets around us.
              </p>
              <p>Oversized fits. A little edge. The “where did you get that?” moment.</p>
              <p>
                No rules. No “this is what you should wear.” Just clothes that make you want to
                experiment, mix things up, and have more fun with your wardrobe.
              </p>
              <p>
                Because the best outfit isn’t the loudest one. It’s the one that makes you look in
                the mirror and think: “Yep. That’s so me.”
              </p>
              <p>No fixed style. No boring rules. Just your vibe.</p>
              <p className="text-paper">Welcome to CLIPBORD. Wear it your way.</p>
            </div>
          </section>

          <section id="story" aria-labelledby="story-heading" className={sectionClass}>
            <h2 id="story-heading" className={headingClass}>Our story</h2>
            <p className={bodyClass}>
              It started as a list on a clipboard: the basics we kept reaching for and could never
              find done right. So we started making them ourselves, a few pieces at a time, and
              releasing them as drops.
            </p>
          </section>

          <section id="contact" aria-labelledby="contact-heading" className={sectionClass}>
            <h2 id="contact-heading" className={headingClass}>Contact us</h2>
            <p className={bodyClass}>
              Questions about sizing, an order or a collab idea? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={inlineLinkClass}>{CONTACT_EMAIL}</a>{' '}
              or message us on Instagram at{' '}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={inlineLinkClass}>
                @{INSTAGRAM_HANDLE}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About

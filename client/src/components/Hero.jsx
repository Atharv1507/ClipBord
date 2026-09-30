import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import logoSvg from '../assets/clipbord-logo-black.svg?raw'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const LOGO_D = logoSvg.match(/ d="([^"]+)"/)[1]
// Chrome restarts dash patterns on every subpath, so each one gets its own stroke to draw.
const LOGO_SUBPATHS = LOGO_D.split(/(?=M)/)
// Where the load-in sketch stops: every stroke 38% drawn, the rest is drawn by scrolling.
const SKETCH = 0.62
// The moment (timeline seconds) the logo starts flying to the navbar. The black backdrop
// fades from here, uncovering the next section as it scrolls up underneath.
const REVEAL = 3.9

// Scroll-driven hero: the logo is drawn in crimson, fills in cream, then flies into
// the navbar logo's spot (dockTargetRef). The next section is pulled up underneath this
// one by a stage's height, so it reaches the navbar just as the logo docks.
// The section sits above the navbar (z-40) so the logo stays in view the whole way there.
function Hero({ dockTargetRef }) {
  const rootRef = useRef(null)
  const pinRef = useRef(null)
  const slotRef = useRef(null)

  useGSAP(
    () => {
      const root = rootRef.current
      const slot = slotRef.current
      const target = dockTargetRef.current
      const header = target.closest('header')
      const strokes = root.querySelectorAll('.hero-stroke')
      const fill = root.querySelector('.hero-fill')
      const glow = root.querySelector('.hero-glow')

      // Offset that lands the hero logo exactly on the navbar logo.
      const dock = () => {
        const from = slot.getBoundingClientRect()
        const to = target.getBoundingClientRect()
        const scale = gsap.getProperty(slot, 'scale')
        const left = from.left - gsap.getProperty(slot, 'x')
        const top = from.top - gsap.getProperty(slot, 'y')
        return { x: to.left - left, y: to.top - top, scale: to.width / (from.width / scale) }
      }

      const mm = gsap.matchMedia()
      // `any: 'all'` always matches, so this runs for everyone; `reduce` picks the variant.
      mm.add({ any: 'all', reduce: '(prefers-reduced-motion: reduce)' }, (context) => {
        // Every step is a fromTo with explicit start and end values. invalidateOnRefresh
        // re-records from()/to()/set() starting values on each refresh, which can leave
        // elements stuck hidden; fromTo never depends on whatever state it finds.
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
        tl.fromTo('.hero-hint', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3 }, 0)
          // GSAP rounds the CSS strokeDashoffset to whole pixels, so tween the attribute instead.
          .fromTo(strokes, { attr: { 'stroke-dashoffset': SKETCH } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, ease: 'power1.inOut', stagger: 0.07 }, 0)
          .fromTo(glow, { autoAlpha: 0.55, scale: 0.8 }, { autoAlpha: 1, scale: 1.1, duration: 3, ease: 'power2.out' }, 0)
          .fromTo(fill, { fillOpacity: 0 }, { fillOpacity: 1, duration: 1.1, ease: 'power2.in' }, 2.2)
          .fromTo(strokes, { opacity: 1 }, { opacity: 0, duration: 0.8 }, 3)
          .fromTo(glow, { autoAlpha: 1, scale: 1.1 }, { autoAlpha: 0, scale: 1.6, duration: 1.4, ease: 'power2.in', immediateRender: false }, 3.6)
          .fromTo('.hero-backdrop', { autoAlpha: 1 }, { autoAlpha: 0, duration: 1, ease: 'power1.inOut' }, REVEAL)
          .fromTo(slot, { x: 0, y: 0, scale: 1 }, { x: () => dock().x, y: () => dock().y, scale: () => dock().scale, duration: 2.2, ease: 'power3.inOut' }, 3.9)
          // Swap the flying logo for the real navbar logo the moment it lands.
          .fromTo(slot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, immediateRender: false }, 6.1)
          .fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 6.1)
          // A short beat with the logo docked before the pin lets go.
          .to({}, { duration: 0.4 })

        // Nothing is left on the stage, so the next section sits right under the navbar.
        if (context.conditions.reduce) {
          tl.progress(1)
          return
        }

        ScrollTrigger.create({
          trigger: pinRef.current,
          start: () => `top ${header.offsetHeight}px`,
          end: '+=200%',
          pin: true,
          scrub: 1,
          animation: tl,
          invalidateOnRefresh: true,
        })
      })

      return () => mm.revert()
    },
    { scope: rootRef },
  )

  // Load-in: sketch the start of every stroke on a timer so the first frame isn't empty.
  useGSAP(
    () => {
      if (window.scrollY >= 10) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const strokes = rootRef.current.querySelectorAll('.hero-stroke')
      gsap.fromTo(strokes, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': SKETCH }, duration: 1.4, ease: 'power2.out', stagger: 0.03, delay: 0.2 })
    },
    { scope: rootRef },
  )

  return (
    // Above the navbar and the section it overlaps, but never in the way of clicks on them.
    // The negative margin (one stage height) pulls the next section up underneath.
    <section ref={rootRef} className="pointer-events-none relative z-[45] mb-[calc(var(--nav-h,64px)-100svh)]">
      {/* No overflow clipping here: the logo has to leave the stage to reach the navbar. */}
      <div ref={pinRef} className="relative grid h-[calc(100svh-var(--nav-h,64px))] place-items-center">
        {/* The stage is sized to the small viewport (browser bars showing), so the backdrop
            runs a full large viewport down to cover the strip below it when the bars hide. */}
        <div aria-hidden="true" className="hero-backdrop absolute inset-0 h-lvh bg-ink" />
        {/* The glow grows past the screen edges, so it's clipped to the stage. */}
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center overflow-hidden">
          <div className="hero-glow size-[70vmin] rounded-full bg-[radial-gradient(closest-side,rgb(179_18_46/0.45),transparent)] opacity-0 blur-xl" />
        </div>

        <div
          ref={slotRef}
          className="relative z-[2] aspect-[1000/642.7] w-[min(76vw,560px)] origin-top-left will-change-transform"
        >
          <svg viewBox="0 0 1000 642.7" aria-hidden="true" className="block size-full">
            <path className="hero-fill" d={LOGO_D} fill="var(--color-paper)" fillRule="evenodd" fillOpacity="0" />
            <g fill="none" stroke="var(--color-crimson-bright)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
              {LOGO_SUBPATHS.map((d, i) => (
                <path key={i} className="hero-stroke" d={d} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
              ))}
            </g>
          </svg>
        </div>

        <h1 className="sr-only">Clipbord: tees, sweatshirts and joggers</h1>

        <p className="hero-hint absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-mute" aria-hidden="true">
          Scroll
        </p>
      </div>
    </section>
  )
}

export default Hero

import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { animate, createTimeline, spring, stagger } from 'animejs'
import monogramSvg from '../assets/clipbord-monogram.svg?raw'
import { useTheme } from '../hooks/useTheme'
import { Icon } from './Icons'
import { createSignHereScene } from './signHereScene'

gsap.registerPlugin(ScrollTrigger)

const LINES = ['Sign here.', 'Wear it loud.']
// How long the section stays pinned while the pen signs, as a share of the screen height.
const PIN_LENGTH = '+=300%'
const ctaSpring = spring({ stiffness: 260, damping: 12 })
// The CTA's arrow springs toward the corner on hover.
const nudge = (to) => (e) => animate(e.currentTarget.querySelector('.cta-icon'), { ...to, ease: ctaSpring })

// "Sign here.": a clipboard lies on the table with a Clipbord delivery note under the clip.
// As you scroll, the section pins, a pen glides in and signs the note, then a red stamp
// lands on it. GSAP ScrollTrigger pins and scrubs; one progress value drives the 3D scene
// (signHereScene.js) and an Anime.js timeline for the headline and copy. Reduced motion
// shows the signed, stamped note with no pin.
function SignHere() {
  const pinRef = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const footRef = useRef(null)
  const sceneRef = useRef(null)
  const { theme } = useTheme()

  useLayoutEffect(() => {
    const pin = pinRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lite = window.matchMedia('(max-width: 759px), (pointer: coarse)').matches
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let progress = reduce ? 1 : 0

    // Headline letters rise line by line, the copy fades up after the stamp. The scroll
    // seeks this timeline (0..1000ms = progress 0..1), it never plays on its own.
    const lines = [...titleRef.current.querySelectorAll('.sign-line')].map((l) => l.querySelectorAll('.sign-ch'))
    const foot = footRef.current.children
    // Line one rises as the board settles; line two lands with the stamp; everything is in
    // place by 1000. Hidden up front, since a tween only renders once the playhead reaches it.
    let words = null
    if (!reduce) {
      lines.forEach((chars) => chars.forEach((c) => (c.style.transform = 'translateY(112%)')))
      ;[...foot].forEach((el) => (el.style.opacity = '0'))
      words = createTimeline({ autoplay: false, defaults: { ease: 'outCubic' } })
        .add(lines[0], { translateY: ['112%', '0%'], duration: 170, delay: stagger(14) }, 30)
        .add(lines[1], { translateY: ['112%', '0%'], duration: 140, delay: stagger(10) }, 760)
        .add(foot, { opacity: [0, 1], translateY: ['22px', '0px'], duration: 90, delay: stagger(30) }, 860)
        .add({ v: 0 }, { v: 1, duration: 1 }, 999)
    }

    const apply = (p) => {
      progress = p
      words?.seek(p * 1000)
      sceneRef.current?.setProgress(p)
    }

    // Where the board fits on phones: between the headline and the copy.
    const frame = () => {
      const narrow = pin.clientWidth < 760
      if (!narrow) return { narrow }
      const box = pin.getBoundingClientRect()
      return {
        narrow,
        top: titleRef.current.getBoundingClientRect().bottom - box.top + 8,
        bottom: footRef.current.getBoundingClientRect().top - box.top - 8,
      }
    }

    // The scene takes a moment to build (textures are drawn in code), so it is built when the
    // browser is idle or the section is getting close, whichever comes first.
    let built = false
    const build = () => {
      if (built) return
      built = true
      cancelIdle()
      near.disconnect()
      let scene
      try {
        scene = createSignHereScene({ canvas: canvasRef.current, pin, frame, monogramSvg, lite })
      } catch {
        return // no WebGL: the headline and copy still stand on their own
      }
      sceneRef.current = scene
      scene.applyTheme(document.documentElement.dataset.theme)
      scene.setProgress(progress)
      // The sheet is text drawn into a canvas: print it again once the web fonts are in.
      Promise.all([
        document.fonts.load('800 70px "Bricolage Grotesque"'),
        document.fonts.load('500 20px "Geist Mono"'),
        document.fonts.load('600 20px "Geist Mono"'),
        document.fonts.load('400 28px "Geist"'),
        document.fonts.load('600 46px "Caveat"'),
      ])
        .catch(() => {})
        .then(() => {
          if (sceneRef.current !== scene) return
          scene.reprint()
          scene.resize()
        })
    }
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 300))
    const idleId = idle(build, { timeout: 2500 })
    const cancelIdle = () => (window.cancelIdleCallback ?? clearTimeout)(idleId)
    const near = new IntersectionObserver(([e]) => e.isIntersecting && build(), { rootMargin: '150% 0px' })
    near.observe(pin)

    // Draw only while the section is on screen, on GSAP's ticker so it lands in the same
    // frame as the scrub. The scene skips frames where nothing changed.
    const tick = () => sceneRef.current?.frame()
    let ticking = false
    const onScreen = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ticking) gsap.ticker.add(tick)
      if (!e.isIntersecting && ticking) gsap.ticker.remove(tick)
      ticking = e.isIntersecting
    })
    onScreen.observe(pin)

    const ro = new ResizeObserver(() => sceneRef.current?.resize())
    ro.observe(pin)

    // The camera leans with the mouse. Not on touch, where the finger is busy scrolling.
    const onMove = (e) => {
      const r = pin.getBoundingClientRect()
      sceneRef.current?.setPointer(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2)
    }
    const onLeave = () => sceneRef.current?.setPointer(0, 0)
    if (finePointer && !reduce) {
      pin.addEventListener('pointermove', onMove)
      pin.addEventListener('pointerleave', onLeave)
    }

    let trigger
    const proxy = { p: 0 }
    if (!reduce) {
      trigger = ScrollTrigger.create({
        trigger: pin,
        start: () => `top ${document.querySelector('header')?.offsetHeight ?? 0}px`,
        end: PIN_LENGTH,
        pin: true,
        scrub: 0.8,
        animation: gsap.to(proxy, { p: 1, ease: 'none', onUpdate: () => apply(proxy.p) }),
        invalidateOnRefresh: true,
      })
    }

    // The new drop loads above this section after the page lays out, which moves where the
    // pin should start; measure again whenever it changes height.
    const above = document.getElementById('new')
    let refreshTimer = 0
    const aboveRo = new ResizeObserver(() => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150)
    })
    if (above) aboveRo.observe(above)

    return () => {
      cancelIdle()
      clearTimeout(refreshTimer)
      near.disconnect()
      onScreen.disconnect()
      ro.disconnect()
      aboveRo.disconnect()
      gsap.ticker.remove(tick)
      pin.removeEventListener('pointermove', onMove)
      pin.removeEventListener('pointerleave', onLeave)
      trigger?.animation?.kill()
      trigger?.kill()
      words?.revert()
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.applyTheme(theme)
  }, [theme])

  return (
    <section aria-labelledby="sign-title" className="relative mt-[clamp(96px,10vw,150px)] bg-canvas-2 transition-colors duration-500">
      <div ref={pinRef} className="relative h-[calc(100svh-var(--nav-h,68px))] min-h-[560px] overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
        <div className="pointer-events-none absolute inset-0 z-[2] grid grid-rows-[auto_1fr_auto] px-4 py-[clamp(24px,4vw,56px)] md:px-[clamp(16px,2.2vw,32px)]">
          <h2 ref={titleRef} id="sign-title" className="display text-[clamp(52px,9vw,160px)]">
            <span className="sr-only">{LINES.join(' ')}</span>
            {LINES.map((line, i) => (
              <span key={line} aria-hidden="true" className="block overflow-hidden pb-[.05em]">
                <span className={`sign-line block whitespace-nowrap ${i === 1 ? 'text-accent' : ''}`}>
                  {[...line].map((ch, k) => (
                    <span key={k} className="sign-ch inline-block will-change-transform">{ch === ' ' ? ' ' : ch}</span>
                  ))}
                </span>
              </span>
            ))}
          </h2>
          <div />
          <div ref={footRef} className="flex flex-col items-start gap-4 md:max-w-[40%] md:gap-6">
            <p className="max-w-[34ch] text-[15px] text-fg-soft md:text-base">
              Packed with a little edge, signed for at your door. Then comes the “where did you get that?” moment.
            </p>
            <Link
              to="/catalogue"
              onPointerEnter={nudge({ translateX: 3, translateY: -2, scale: 1.08 })}
              onPointerLeave={nudge({ translateX: 0, translateY: 0, scale: 1 })}
              className="pointer-events-auto inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent transition-shadow hover:shadow-[0_10px_30px_-12px_var(--c-accent)]"
            >
              Start your order
              <span className="cta-icon grid h-9 w-9 place-items-center rounded-full bg-on-accent/15">
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SignHere

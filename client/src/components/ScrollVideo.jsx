import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Logo from './Logo'

// Frames decoded from the clip and how wide each is. Phones get fewer, smaller ones:
// every frame is a full bitmap in memory (a 1280px one is about 3.7 MB).
const FRAMES = { desktop: 120, mobile: 60 }
const FRAME_WIDTH = { desktop: 1280, mobile: 960 }
// The scrub spring: how snappily the picture chases the scroll, and how much that's damped
// (about 2 × √stiffness gives smooth motion without bounce).
const STIFFNESS = 160
const DAMPING = 22
// The splash lifts once this share of frames is decoded; the rest fill in behind it.
const REVEAL_AT = 0.45
// Scrubbing can start once the first pass has spread this many frames across the whole clip.
const LIVE_AFTER = 17
const SPLASH_MIN_MS = 1400
const SPLASH_FADE_MS = 800
// Whatever happens, the splash lifts after this long.
const SPLASH_MAX_MS = 20000

// The corner copy, one set for each side of the tee. It swaps at TURN, the point in the
// scroll where the film has turned the tee from its front to its back.
const TURN = 0.65
const ACTS = [
  {
    eyebrow: '01 · Front',
    headline: 'Four balls.\nZero focus.',
    body: 'The ADHD tee. A, D, H and D racked up in pool balls across the chest of an all-black tee.',
  },
  {
    eyebrow: '02 · Back',
    headline: 'All over\nthe table.',
    body: 'Round the back, the red script says it for you: cue the chaos. For minds with forty tabs open.',
  },
]

// Decoded frames outlive the component, so coming back to the home page neither
// decodes again nor shows the splash.
const frameCache = new Map()

function getProfile() {
  return window.matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop'
}

function cacheKey(src, profile) {
  return `${src}|${FRAMES[profile]}|${FRAME_WIDTH[profile]}`
}

// The frame order: first, last, middle, then quarters, eighths... so the first handful
// already spans the whole clip and every later frame only adds detail.
function buildOrder(n) {
  const order = []
  const seen = new Uint8Array(n)
  const push = (i) => {
    if (i >= 0 && i < n && !seen[i]) {
      seen[i] = 1
      order.push(i)
    }
  }
  push(0)
  push(n - 1)
  const queue = [[0, n - 1]]
  while (queue.length) {
    const [a, b] = queue.shift()
    if (b - a < 2) continue
    const m = (a + b) >> 1
    push(m)
    queue.push([a, m], [m, b])
  }
  return order
}

// A scroll-scrubbed film: the clip is decoded into still frames painted on a canvas, and
// scrolling through the tall track moves through them. While the first frames decode, a
// full-screen splash (logo and percentage) covers the page and holds the scroll; it lifts
// once REVEAL_AT of the frames exist and then calls onSplashDone. If frames can't be
// decoded it scrubs the <video> itself; with reduced motion it shows a still.
const swapClass = '[grid-area:1/1] transition duration-700 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none'

function ScrollVideo({ src, onSplashDone }) {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const splashFillRef = useRef(null)
  const splashCountRef = useRef(null)
  const loaderRef = useRef(null)
  const loaderFillRef = useRef(null)
  const notifiedRef = useRef(false)

  const [profile] = useState(getProfile)
  const [act, setAct] = useState(0)
  // 'up' covers the page, 'fading' is on its way out, 'gone' is unmounted.
  const [splash, setSplash] = useState(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return reduce || frameCache.has(cacheKey(src, profile)) ? 'gone' : 'up'
  })
  const splashAtMount = useRef(splash)

  useEffect(() => {
    if (splash === 'up' || notifiedRef.current) return
    notifiedRef.current = true
    onSplashDone?.()
  }, [splash, onSplashDone])

  // Hold the page still under the splash. Lenis ignores wheel events on it (data-lenis-prevent)
  // and hidden overflow stops native scrolling; pins are re-measured once it's released.
  useEffect(() => {
    if (splash !== 'up') return
    const html = document.documentElement
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = ''
      ScrollTrigger.refresh()
    }
  }, [splash])

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d', { alpha: false })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const TOTAL = FRAMES[profile]
    const WIDTH = FRAME_WIDTH[profile]
    const key = cacheKey(src, profile)

    let slots = new Array(TOTAL)
    const nearL = new Int32Array(TOTAL)
    const nearR = new Int32Array(TOTAL)
    let filled = 0
    let lastPainted = -1
    let mode = 'idle'
    let duration = 0
    let raf = 0
    let destroyed = false
    let started = false
    let visible = false
    let pos = 0
    let vel = 0
    let target = 0
    let lastTime = 0
    let lastScrollAt = 0
    let lastProgress = -1
    let lastW = 0
    let lastH = 0
    let shownAct = 0
    const timers = new Set()
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id)
        fn()
      }, ms)
      timers.add(id)
      return id
    }

    // ── Splash ──
    const splashStart = performance.now()
    let splashDone = splashAtMount.current !== 'up'
    // The splash counts toward "ready to reveal", so it reads 100% as it lifts.
    let revealAt = TOTAL

    function splashProgress(pct) {
      const v = Math.max(0, Math.min(100, pct))
      if (splashFillRef.current) splashFillRef.current.style.width = `${v}%`
      if (splashCountRef.current) splashCountRef.current.textContent = `${Math.round(v)}%`
    }

    function releaseSplash() {
      if (splashDone) return
      splashDone = true
      const wait = Math.max(0, SPLASH_MIN_MS - (performance.now() - splashStart))
      later(() => {
        splashProgress(100)
        setSplash('fading')
        later(() => setSplash('gone'), SPLASH_FADE_MS)
      }, wait)
    }

    function loaderProgress(pct) {
      if (loaderFillRef.current) loaderFillRef.current.style.width = `${pct}%`
      if (loaderRef.current && pct >= 100) loaderRef.current.style.opacity = '0'
    }

    function setMode(next) {
      mode = next
      root.dataset.mode = next
    }

    // ── Frames ──
    function reindex() {
      let last = -1
      for (let i = 0; i < TOTAL; i++) {
        if (slots[i]) last = i
        nearL[i] = last
      }
      let next = -1
      for (let i = TOTAL - 1; i >= 0; i--) {
        if (slots[i]) next = i
        nearR[i] = next
      }
    }

    // The nearest decoded frame to slot i.
    function resolve(i) {
      if (slots[i]) return i
      const l = nearL[i]
      const r = nearR[i]
      if (l < 0) return r
      if (r < 0) return l
      return i - l <= r - i ? l : r
    }

    function paint(idx) {
      if (filled === 0) return
      const r = resolve(Math.max(0, Math.min(TOTAL - 1, idx)))
      if (r < 0 || r === lastPainted) return
      const img = slots[r]
      const cW = canvas.width
      const cH = canvas.height
      if (!img || !cW || !cH) return
      lastPainted = r
      // Cover-fit, centered.
      const scale = Math.max(cW / img.width, cH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (cW - w) / 2, (cH - h) / 2, w, h)
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      lastPainted = -1
      paint(Math.round(pos))
    }

    // ── Scroll ──
    // 0 when the stage first sticks under the navbar, 1 when it's about to scroll away.
    function scrollProgress() {
      const scrollable = track.offsetHeight - stage.offsetHeight
      if (scrollable <= 0) return 0
      const stickAt = parseFloat(getComputedStyle(stage).top) || 0
      return Math.min(1, Math.max(0, (stickAt - track.getBoundingClientRect().top) / scrollable))
    }

    function readScroll(now) {
      const p = scrollProgress()
      if (p !== lastProgress) {
        lastProgress = p
        lastScrollAt = now
      }
      if (mode === 'frames') target = p * (TOTAL - 1)
      else if (mode === 'seek') target = p * duration
      const nextAct = p < TURN ? 0 : 1
      if (nextAct !== shownAct) {
        shownAct = nextAct
        setAct(nextAct)
      }
    }

    function tick(now) {
      raf = 0
      if (destroyed) return
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) {
        lastW = canvas.clientWidth
        lastH = canvas.clientHeight
        resizeCanvas()
      }
      readScroll(now)

      if (mode === 'frames') {
        const disp = pos - target
        vel += (-STIFFNESS * disp - DAMPING * vel) * dt
        // A floor on the speed so the last half-frame of travel doesn't crawl.
        const MIN_VEL = 30
        if (Math.abs(disp) > 0.5 && Math.abs(vel) < MIN_VEL) vel = disp < 0 ? MIN_VEL : -MIN_VEL
        pos += vel * dt
        if (Math.abs(disp) < 0.4 && Math.abs(vel) < MIN_VEL) {
          pos = target
          vel = 0
        }
        paint(Math.round(pos))
      } else if (mode === 'seek') {
        pos += (target - pos) * Math.min(1, dt * 9)
        const t = Math.max(0, Math.min(duration - 0.05, pos))
        if (Math.abs(video.currentTime - t) > 0.02 && video.readyState >= 2 && !video.seeking) {
          try {
            video.currentTime = t
          } catch {
            // Not seekable yet; the next frame tries again.
          }
        }
      }

      // Keep running while it's on screen or still catching up with the scroll.
      if (visible || Math.abs(pos - target) > 0.01) raf = requestAnimationFrame(tick)
    }

    function run() {
      if (raf || !started || destroyed) return
      lastTime = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) run()
    })
    observer.observe(track)

    function start() {
      if (started) return
      started = true
      window.addEventListener('resize', resizeCanvas)
      resizeCanvas()
      readScroll(performance.now())
      pos = target
      run()
    }

    // ── Reduced motion: a still of the opening frame, no scroll track ──
    function stillMode() {
      setMode('still')
      video.preload = 'auto'
      video.src = src
      loaderProgress(100)
    }

    // ── Fallback: scrub the <video> element itself ──
    function seekMode(why) {
      if (started && mode === 'frames') return
      console.warn('[scroll-video] scrubbing the video element instead of frames:', why)
      setMode('seek')
      loaderProgress(100)
      if (!video.getAttribute('src')) video.src = src
      const go = () => {
        duration = video.duration || 0
        if (!duration || !isFinite(duration)) {
          stillMode()
          releaseSplash()
          return
        }
        releaseSplash()
        start()
      }
      if (video.readyState >= 1) go()
      else video.addEventListener('loadedmetadata', go, { once: true })
    }

    // ── Main path: decode frames straight off the <video>, coarse to fine ──
    // The browser range-requests only what each seek needs, so the first pass lands fast.
    function framesMode() {
      const cached = frameCache.get(key)
      if (cached) {
        slots = cached
        filled = TOTAL
        reindex()
        setMode('frames')
        loaderProgress(100)
        start()
        return
      }

      const order = buildOrder(TOTAL)
      const liveAfter = Math.min(order.length, LIVE_AFTER)
      revealAt = Math.max(liveAfter, Math.ceil(TOTAL * REVEAL_AT))
      let cursor = 0
      let stop = false
      const t0 = performance.now()

      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      video.src = src
      video.load()

      const fallBack = (why) => {
        stop = true
        seekMode(why)
      }
      const metaTimer = later(() => {
        if (!duration) fallBack('metadata never arrived')
      }, 12000)

      // Creep the splash while metadata loads so it never sits dead at 0%.
      const creep = setInterval(() => {
        if (filled > 0 || splashDone || destroyed) {
          clearInterval(creep)
          return
        }
        splashProgress(Math.min(18, ((performance.now() - t0) / 3000) * 18))
      }, 100)

      video.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(metaTimer)
          timers.delete(metaTimer)
          clearInterval(creep)
          duration = video.duration || 0
          if (!duration || !isFinite(duration)) fallBack('bad duration')
          else step()
        },
        { once: true },
      )
      video.addEventListener(
        'error',
        () => {
          if (!started) fallBack('video error')
        },
        { once: true },
      )

      function seekTo(t) {
        return new Promise((resolveSeek) => {
          let settled = false
          const done = () => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            video.removeEventListener('seeked', done)
            resolveSeek()
          }
          // A seek to the current spot fires no `seeked` in some browsers, and a cold
          // range request can simply be slow.
          const timer = setTimeout(done, 3000)
          video.addEventListener('seeked', done)
          try {
            video.currentTime = t
          } catch {
            done()
          }
        })
      }

      function grab() {
        if ((video.videoWidth || 0) > WIDTH) {
          return createImageBitmap(video, { resizeWidth: WIDTH, resizeQuality: 'medium' }).catch(() =>
            createImageBitmap(video),
          )
        }
        return createImageBitmap(video)
      }

      // Between frames, stay out of the way of scrolling once the page is live.
      function yieldToPage() {
        return new Promise((resolveYield) => {
          if (!splashDone) {
            requestAnimationFrame(() => resolveYield())
            return
          }
          const busy = performance.now() - lastScrollAt < 250
          if (window.requestIdleCallback) window.requestIdleCallback(() => resolveYield(), { timeout: busy ? 600 : 200 })
          else setTimeout(resolveYield, busy ? 180 : 60)
        })
      }

      function step() {
        if (stop || destroyed) return
        if (cursor >= order.length) {
          finish()
          return
        }
        const i = order[cursor]
        const t = Math.min((i / (TOTAL - 1)) * duration, duration - 0.001)

        seekTo(t)
          .then(grab)
          .then((bitmap) => {
            if (destroyed) {
              bitmap.close()
              return
            }
            slots[i] = bitmap
            filled++
            cursor++
            reindex()
            // Re-resolve against the new frame.
            lastPainted = -1
            loaderProgress((filled / TOTAL) * 100)
            if (!splashDone) splashProgress((filled / revealAt) * 100)
            if (filled >= revealAt) releaseSplash()
            if (!started && filled >= liveAfter) {
              setMode('frames')
              start()
            }
            return yieldToPage().then(step)
          })
          .catch((err) => {
            // A cross-origin video without CORS headers taints the canvas and lands here.
            console.warn(`[scroll-video] frame ${i} failed to decode:`, err)
            stop = true
            if (!started) {
              slots = new Array(TOTAL)
              filled = 0
              seekMode(String(err))
            } else {
              releaseSplash()
            }
          })
      }

      function finish() {
        releaseSplash()
        frameCache.set(key, slots)
        loaderProgress(100)
        // Every frame is in memory now; let the decoder and the file go.
        video.removeAttribute('src')
        video.load()
      }
    }

    later(releaseSplash, SPLASH_MAX_MS)

    if (reduce) stillMode()
    else framesMode()

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      observer.disconnect()
      window.removeEventListener('resize', resizeCanvas)
      // Stop any download still running; a half-decoded set is thrown away.
      if (!frameCache.has(key)) {
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [src, profile])

  return (
    <section ref={rootRef} data-mode="idle" aria-label="Clipbord ADHD tee, a short film" className="group relative bg-ink">
      {/* The tall track the scroll is measured against; the stage sticks under the navbar.
          The hero overlaps the first stretch of it, so the film is already moving as the logo docks. */}
      <div ref={trackRef} className="relative h-[360vh] max-[900px]:h-[300vh] group-data-[mode=still]:h-auto group-data-[mode=still]:max-[900px]:h-auto">
        <div
          ref={stageRef}
          className="sticky top-[var(--nav-h,64px)] h-[calc(100svh-var(--nav-h,64px))] w-full overflow-hidden bg-ink"
        >
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 hidden size-full group-data-[mode=frames]:block" />
          <video
            ref={videoRef}
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 hidden size-full object-cover group-data-[mode=seek]:block group-data-[mode=still]:block"
          />

          {/* Corner copy: the punchline bottom left, the detail and a way to shop bottom right.
              Both swap when the film turns the tee around. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-6 px-5 pb-8 text-paper [text-shadow:0_2px_18px_rgb(0_0_0/0.6)] sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:px-10 sm:pb-10">
            <div className="grid">
              {ACTS.map((item, i) => (
                <div key={item.eyebrow} aria-hidden={i !== act} className={`${swapClass} ${i === act ? '' : 'translate-y-4 opacity-0'}`}>
                  <p className="eyebrow text-paper/70">{item.eyebrow}</p>
                  <p className="mt-3 whitespace-pre-line text-[clamp(3rem,8vw,6.75rem)] leading-[0.92] tracking-display">
                    {item.headline}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid max-w-xs gap-5 sm:justify-items-end sm:text-right">
              <div className="grid">
                {ACTS.map((item, i) => (
                  <p key={item.eyebrow} aria-hidden={i !== act} className={`text-sm leading-relaxed text-paper/80 ${swapClass} ${i === act ? '' : 'translate-y-3 opacity-0'}`}>
                    {item.body}
                  </p>
                ))}
              </div>
              <a
                href="#products"
                className="group/cta pointer-events-auto inline-flex w-fit items-center gap-3 rounded-full bg-paper/5 py-1.5 pl-5 pr-1.5 text-sm ring-1 ring-paper/20 backdrop-blur-md transition-colors [text-shadow:none] hover:bg-paper/10"
              >
                Shop the drop
                <span className="grid size-8 place-items-center rounded-full bg-crimson transition-transform duration-300 group-hover/cta:rotate-45">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                    <path d="M2.9 11.1l8.2-8.2m0 0h-7m7 0v7" />
                  </svg>
                </span>
              </a>
            </div>
          </div>

          {/* Frames still decoding after the splash lifts. */}
          <div ref={loaderRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-paper/10 transition-opacity duration-500">
            <div ref={loaderFillRef} className="h-full w-0 bg-crimson-bright transition-[width] duration-150 ease-out" />
          </div>
        </div>
      </div>

      {splash !== 'gone' && (
        <div
          data-scroll-video-splash
          data-lenis-prevent
          role="status"
          aria-label="Loading"
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink transition-[opacity,visibility] duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] ${
            splash === 'fading' ? 'pointer-events-none invisible opacity-0' : ''
          }`}
        >
          <Logo className="w-[min(380px,72vw)] text-paper motion-safe:animate-[splash-logo-in_.9s_cubic-bezier(.2,.7,.2,1)_both]" />
          <p ref={splashCountRef} className="mt-7 text-[14px] text-mute tabular-nums">
            0%
          </p>
          <div className="mt-4 h-0.5 w-44 overflow-hidden rounded-full bg-paper/15">
            <div ref={splashFillRef} className="h-full w-0 bg-crimson-bright transition-[width] duration-200 ease-out" />
          </div>
        </div>
      )}
    </section>
  )
}

export default ScrollVideo

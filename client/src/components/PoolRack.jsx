import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useTheme } from '../hooks/useTheme'
import { Icon } from './Icons'

gsap.registerPlugin(ScrollTrigger)

// Ball colours per mode, for A D H D.
const SETS = {
  paper: ['#111111', '#C8102E', '#111111', '#C8102E'],
  noir: ['#D50C08', '#121212', '#EEEBE6', '#D50C08'],
}
const LETTERS = ['A', 'D', 'H', 'D']
const R = 1
const GAP = 2.36
const FINAL = [-1.5, -0.5, 0.5, 1.5].map((k) => k * GAP)
const ROLL = Math.PI * 2 * 2 * R // two full turns, so each letter lands upright
// How long the section stays pinned while the balls roll in, as a share of the screen
// height. Higher is slower: 280% means about three screens of scrolling.
const PIN_LENGTH = '+=280%'

const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150
}

// Equirectangular ball texture: base colour with a number disc facing the camera
// (u = 0.25 is +z on a SphereGeometry).
function ballTexture(base, letter) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const g = c.getContext('2d')
  const light = isLight(base)
  g.fillStyle = base
  g.fillRect(0, 0, 1024, 512)
  g.fillStyle = light ? '#111111' : '#F7F5F0'
  g.beginPath()
  g.arc(256, 256, 74, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = light ? '#F7F5F0' : '#111111'
  g.font = '700 92px "Bricolage Grotesque", system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(letter, 256, 262)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

// "Four balls. Zero focus.": four glossy pool balls spelling ADHD in the mode's colours.
// The section pins while they roll in from the right with the scroll (GSAP ScrollTrigger
// scrub), and they lean toward the cursor. Reduced motion shows them racked and still.
function PoolRack() {
  const pinRef = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const sceneRef = useRef(null)
  const { theme } = useTheme()

  useEffect(() => {
    const pin = pinRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture
    scene.environmentIntensity = 0.85
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(-4, 6, 8)
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.15))

    // Soft contact shadow, drawn once into a canvas.
    const sc = document.createElement('canvas')
    sc.width = sc.height = 128
    const sg = sc.getContext('2d')
    const grd = sg.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(0,0,0,.55)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    sg.fillStyle = grd
    sg.fillRect(0, 0, 128, 128)
    const shadowTex = new THREE.CanvasTexture(sc)

    const geo = new THREE.SphereGeometry(R, 96, 64)
    const shadowGeo = new THREE.PlaneGeometry(2.6, 2.6)
    const balls = LETTERS.map((letter) => {
      const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 })
      const mesh = new THREE.Mesh(geo, mat)
      const holder = new THREE.Group() // leans toward the cursor; the mesh rolls inside it
      holder.add(mesh)
      scene.add(holder)
      const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = -R - 0.01
      scene.add(shadow)
      return { letter, mesh, holder, shadow, mat, p: reduce ? 1 : 0 }
    })

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    function render() {
      balls.forEach((b, i) => {
        const x = FINAL[i] + (1 - b.p) * (ROLL + 6 + i * 1.2)
        b.holder.position.x = x
        b.mesh.rotation.z = -(x - FINAL[i]) / R
        b.shadow.position.x = x
        b.holder.rotation.y = pointer.x * 0.45 + (i - 1.5) * -0.04
        b.holder.rotation.x = pointer.y * 0.22
      })
      renderer.render(scene, camera)
    }

    function applyTheme(mode) {
      const set = SETS[mode] ?? SETS.paper
      balls.forEach((b, i) => {
        b.mat.map?.dispose()
        b.mat.map = ballTexture(set[i], b.letter)
        b.mat.needsUpdate = true
        b.shadow.material.opacity = mode === 'noir' ? 0.9 : 0.45
      })
      render()
    }
    sceneRef.current = { applyTheme }
    document.fonts.ready.then(() => applyTheme(document.documentElement.dataset.theme))

    function resize() {
      const w = pin.clientWidth
      const h = pin.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      const span = 4 * GAP + 0.6
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)
      camera.position.set(0, 1.6, Math.max(span / 2 / Math.tan(hfov / 2), 9))
      camera.lookAt(0, w < 760 ? 1.1 : 0.62, 0)
      camera.updateProjectionMatrix()
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(pin)

    const onMove = (e) => {
      const r = pin.getBoundingClientRect()
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    const onLeave = () => {
      pointer.tx = 0
      pointer.ty = 0
    }
    pin.addEventListener('pointermove', onMove)
    pin.addEventListener('pointerleave', onLeave)

    // Draw only while the section is on screen.
    let visible = false
    let raf = 0
    function loop() {
      raf = 0
      if (!visible) return
      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06
      render()
      if (!reduce) raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !raf) loop()
    })
    io.observe(pin)

    let trigger
    const ctx = gsap.context(() => {
      if (reduce) return
      gsap.set('.rack-line', { yPercent: 110 })
      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      balls.forEach((b, i) => tl.to(b, { p: 1, duration: 1, ease: 'power2.out' }, i * 0.22))
      tl.to('.rack-line', { yPercent: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' }, 0.35).to({}, { duration: 0.5 })
      trigger = ScrollTrigger.create({
        trigger: pin,
        start: () => `top ${document.querySelector('header')?.offsetHeight ?? 0}px`,
        end: PIN_LENGTH,
        pin: true,
        scrub: 1.2,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: () => {
          if (!raf) render()
        },
      })
    }, titleRef)

    // The new drop loads above this section after the page lays out, which moves where
    // the pin should start; measure again whenever it changes height.
    const above = document.getElementById('new')
    let refreshTimer = 0
    const aboveRo = new ResizeObserver(() => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150)
    })
    if (above) aboveRo.observe(above)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(refreshTimer)
      io.disconnect()
      ro.disconnect()
      aboveRo.disconnect()
      pin.removeEventListener('pointermove', onMove)
      pin.removeEventListener('pointerleave', onLeave)
      trigger?.kill()
      ctx.revert()
      balls.forEach((b) => {
        b.mat.map?.dispose()
        b.mat.dispose()
        b.shadow.material.dispose()
      })
      geo.dispose()
      shadowGeo.dispose()
      shadowTex.dispose()
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.applyTheme(theme)
  }, [theme])

  return (
    <section aria-labelledby="rack-title" className="relative mt-[clamp(96px,10vw,150px)] bg-canvas-2 transition-colors duration-500">
      <div ref={pinRef} className="relative h-[calc(100svh-var(--nav-h,68px))] min-h-[540px] overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
        <div ref={titleRef} className="pointer-events-none absolute inset-0 z-[2] grid grid-rows-[auto_1fr_auto] px-4 py-[clamp(28px,4vw,56px)] md:px-[clamp(16px,2.2vw,32px)]">
          <h2 id="rack-title" className="display text-[clamp(64px,11vw,188px)]">
            <span className="block overflow-hidden pb-[.04em]"><span className="rack-line block">Four balls.</span></span>
            <span className="block overflow-hidden pb-[.04em]"><span className="rack-line block">Zero focus.</span></span>
          </h2>
          <div />
          <div className="pointer-events-auto flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[34ch] text-fg-soft">The ADHD print: A, D, H and D racked up in pool balls across the chest.</p>
            <Link to="/catalogue?q=ADHD" className="group inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent transition-shadow hover:shadow-[0_10px_30px_-12px_var(--c-accent)]">
              Shop the ADHD print
              <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15 transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PoolRack

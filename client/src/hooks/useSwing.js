import { useEffect, useRef } from 'react'

// The swing is a damped spring: how hard it pulls back to hanging straight, how fast
// the swinging dies away, and the furthest it can tip either way (degrees).
const STIFFNESS = 60
const DAMPING = 5.5
const MAX_ANGLE = 6
const MAX_SPEED = 60
// Speed (degrees per second) the pointer gives the tag when it arrives from one side.
const NUDGE = 28
// Extra speed for each pixel the pointer moves sideways across it.
const DRAG = 0.3

const clamp = (value, max) => Math.max(-max, Math.min(max, value))

// Makes something hang like a tag on a string. The pointer arriving from one side knocks
// it the other way, moving across it keeps pushing, and it swings until it settles.
// Put areaRef on an element that stays put (it takes the hover) and swingRef on the one
// that turns; give that one transform-origin at its hanging point. Rotation goes straight
// onto the element's style, so a swing never re-renders React.
export function useSwing() {
  const areaRef = useRef(null)
  const swingRef = useRef(null)

  useEffect(() => {
    const area = areaRef.current
    const el = swingRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let angle = 0
    let speed = 0
    let frame = 0
    let last = 0

    function step(now) {
      // Capped so a tab coming back from the background doesn't jump.
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      speed += (-STIFFNESS * angle - DAMPING * speed) * dt
      angle = clamp(angle + speed * dt, MAX_ANGLE)
      if (Math.abs(angle) < 0.02 && Math.abs(speed) < 0.05) {
        angle = 0
        speed = 0
        frame = 0
        el.style.transform = ''
        return
      }
      el.style.transform = `rotate(${angle}deg)`
      frame = requestAnimationFrame(step)
    }

    function push(amount) {
      speed = clamp(speed + amount, MAX_SPEED)
      if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(step)
      }
    }

    // A positive CSS rotation turns clockwise, which swings the bottom to the left, so a
    // push to the right is a negative one.
    function handleEnter(e) {
      if (e.pointerType !== 'mouse') return
      const box = area.getBoundingClientRect()
      push(e.clientX < box.left + box.width / 2 ? -NUDGE : NUDGE)
    }

    function handleMove(e) {
      if (e.pointerType === 'mouse') push(-e.movementX * DRAG)
    }

    // Tabbing onto it gives a small nudge too (clicks already had the hover one).
    function handleFocus(e) {
      if (e.target.matches(':focus-visible')) push(NUDGE * 0.6)
    }

    area.addEventListener('pointerenter', handleEnter)
    area.addEventListener('pointermove', handleMove)
    area.addEventListener('focusin', handleFocus)
    return () => {
      area.removeEventListener('pointerenter', handleEnter)
      area.removeEventListener('pointermove', handleMove)
      area.removeEventListener('focusin', handleFocus)
      cancelAnimationFrame(frame)
    }
  }, [])

  return { areaRef, swingRef }
}

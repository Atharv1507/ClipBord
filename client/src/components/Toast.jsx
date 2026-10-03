import { useEffect, useRef } from 'react'

// A short message in a pill at the bottom of the screen. Closes itself after `duration`.
function Toast({ message, onClose, duration = 4000 }) {
  // Held in a ref so an inline arrow from the parent doesn't restart the
  // timer on every re-render (e.g. while the user keeps typing).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => onCloseRef.current(), duration)
    return () => clearTimeout(timer)
  }, [message, duration])

  if (!message) return null

  return (
    <div role="alert" className="fixed inset-x-0 bottom-5 z-[95] flex justify-center px-4">
      <div className="flex max-w-md items-center gap-4 rounded-full bg-fg py-2.5 pl-5 pr-2.5 text-sm font-medium text-canvas shadow-[0_18px_40px_-16px_var(--c-shadow)] motion-safe:animate-[rise-in_.5s_var(--ease-spring)]">
        <p>{message}</p>
        <button type="button" onClick={onClose} className="shrink-0 rounded-full px-3 py-1.5 text-[13px] opacity-80 hover:opacity-100">
          Close
        </button>
      </div>
    </div>
  )
}

export default Toast

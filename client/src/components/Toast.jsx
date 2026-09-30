import { useEffect, useRef } from 'react'

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
    <div
      role="alert"
      className="fixed inset-x-0 top-6 z-50 flex justify-center px-6"
    >
      <div className="flex w-full max-w-sm items-start justify-between gap-4 rounded-md bg-raised px-5 py-4 text-paper shadow-lg shadow-black/50">
        <p className="text-[13px] leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 text-sm text-mute transition-colors hover:text-paper"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default Toast

import { useEffect, useState } from 'react'

// Returns value once it has stopped changing for `delay` ms.
// Each change restarts the timer, so fast typing only settles once.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

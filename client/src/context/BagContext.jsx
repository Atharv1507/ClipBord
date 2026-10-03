import { useCallback, useEffect, useState } from 'react'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useAuth } from './AuthContext'
import { BagContext } from './bag'

const EMPTY = { items: [], count: 0, subtotal: 0 }

// The full cart: items with product name, image, price and stock, plus count and subtotal.
// addToCart and the remove calls only send back product ids, so the cart is fetched again
// after every change.
const fetchCart = () => axiosInstance.get('/cart/getCart').then((res) => res.data.cart)

// The customer's bag, shared by the navbar count, the bag drawer and the cart page.
// Loaded whenever someone logs in; logged out, it's simply empty.
export function BagProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id ?? null
  const [attempt, setAttempt] = useState(0)
  // The last load, tagged with whose bag and which attempt it answers, so a stale answer
  // (or the previous customer's bag) never shows as current.
  const requestKey = `${userId}|${attempt}`
  const [result, setResult] = useState({ key: null, userId: null, cart: EMPTY, error: '' })
  const [open, setOpen] = useState(false)
  // The line whose buttons are waiting on the server, so they can't be double-clicked.
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let ignore = false
    fetchCart()
      .then((cart) => {
        if (!ignore) setResult({ key: requestKey, userId, cart, error: '' })
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setResult({ key: requestKey, userId, cart: EMPTY, error: getErrorMessage(err, "Couldn't load your bag. Please try again.") })
      })
    return () => {
      ignore = true
    }
  }, [requestKey, userId])

  let status = 'idle'
  let cart = EMPTY
  if (userId) {
    // Keep showing this customer's last bag while a reload is in flight.
    cart = result.userId === userId ? result.cart : EMPTY
    if (result.key !== requestKey) status = 'loading'
    else status = result.error ? 'error' : 'ready'
  }

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const store = useCallback((next) => setResult({ key: requestKey, userId, cart: next, error: '' }), [requestKey, userId])

  // Adds to the server cart, then reloads it. Errors (e.g. "Only 2 left in size M")
  // are thrown for the caller to show next to its button.
  const add = useCallback(async (productId, size, quantity = 1) => {
    await axiosInstance.post('/cart/addToCart', { productId, size, quantity })
    store(await fetchCart())
  }, [store])

  // Runs one change on a line, then reloads. Failures come back as a message.
  const update = useCallback(async (item, request) => {
    setBusyId(item._id)
    setError('')
    try {
      await request()
      store(await fetchCart())
    } catch (err) {
      console.log(err)
      setError(getErrorMessage(err, "Couldn't update your bag. Please try again."))
    } finally {
      setBusyId(null)
    }
  }, [store])

  const increase = useCallback(
    (item) => update(item, () => axiosInstance.post('/cart/addToCart', { productId: item.product._id, size: item.size, quantity: 1 })),
    [update],
  )
  // Takes one away; the server drops the line once it reaches 0.
  const decrease = useCallback(
    (item) => update(item, () => axiosInstance.post('/cart/removeFromCart', { productId: item.product._id, size: item.size })),
    [update],
  )
  const remove = useCallback(
    (item) => update(item, () => axiosInstance.post('/cart/removeItem', { itemId: item._id })),
    [update],
  )

  const value = {
    cart, status, error: error || (status === 'error' ? result.error : ''), setError, retry, busyId,
    open, openBag: () => setOpen(true), closeBag: () => setOpen(false),
    add, increase, decrease, remove,
  }
  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}

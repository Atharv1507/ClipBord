import { useSyncExternalStore } from 'react'
import { axiosInstance } from '../axiosCalls/axios'

// Wishlisted product ids for the logged-in customer, shared by every card on the page.
// AuthContext fills it on login and clears it on logout; cards only read and toggle.
const listeners = new Set()
let savedIds = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setSavedIds(updatedIds) {
  savedIds = updatedIds
  listeners.forEach((listener) => listener())
}

export async function loadWishlist() {
  try {
    const res = await axiosInstance.get('/wishlist/ids')
    setSavedIds(new Set(res.data.ids))
  } catch {
    setSavedIds(new Set())
  }
}

export function clearWishlist() {
  setSavedIds(new Set())
}

// Fills or empties the bookmark straight away, then tells the server. If the server refuses,
// the bookmark flips back and the error goes to the caller to show.
async function toggle(id) {
  const wasSaved = savedIds.has(id)
  const flip = (add) => {
    const updatedIds = new Set(savedIds)
    if (add) updatedIds.add(id)
    else updatedIds.delete(id)
    setSavedIds(updatedIds)
  }

  flip(!wasSaved)
  try {
    await axiosInstance.post(wasSaved ? '/wishlist/remove' : '/wishlist/add', { productId: id })
  } catch (err) {
    flip(wasSaved)
    throw err
  }
}

// How many products are bookmarked, for the navbar badge.
export function useWishlistCount() {
  return useSyncExternalStore(subscribe, () => savedIds.size)
}

// Each card reads only its own true/false, so toggling one bookmark
// re-renders that card alone.
export function useWishlist(id) {
  const saved = useSyncExternalStore(subscribe, () => savedIds.has(id))
  return { saved, toggle: () => toggle(id) }
}

import { useSyncExternalStore } from 'react'

// Wishlisted product ids, shared by every card on the page and kept in this browser.
// TODO: once the server has a wishlist route (e.g. GET/POST /wishlist for the logged-in
// customer), load and save through it instead of localStorage.
const STORAGE_KEY = 'clipboard:wishlist'
const listeners = new Set()
let saved = load()

function load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [])
  } catch {
    return new Set()
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function toggle(id) {
  saved = new Set(saved)
  if (saved.has(id)) saved.delete(id)
  else saved.add(id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]))
  } catch {
    // Storage is blocked (private mode): the wishlist still works until the page closes.
  }
  listeners.forEach((listener) => listener())
}

export function useWishlist() {
  const current = useSyncExternalStore(subscribe, () => saved)
  return { has: (id) => current.has(id), toggle }
}

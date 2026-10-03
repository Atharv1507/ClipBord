import { useSyncExternalStore } from 'react'

// Light (Paper) or dark (Noir). index.html sets data-theme before the first paint from the
// saved choice or the system setting; this keeps React in step and saves a manual switch.
const KEY = 'cb-mode'
const listeners = new Set()

function current() {
  return document.documentElement.dataset.theme === 'noir' ? 'noir' : 'paper'
}

function subscribe(listener) {
  listeners.add(listener)
  // Follow the system setting until the visitor picks one themselves.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = (e) => {
    let saved = null
    try { saved = localStorage.getItem(KEY) } catch { /* storage blocked */ }
    if (!saved) setTheme(e.matches ? 'noir' : 'paper', false)
  }
  media.addEventListener('change', onSystem)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystem)
  }
}

export function setTheme(theme, save = true) {
  document.documentElement.dataset.theme = theme
  if (save) {
    try { localStorage.setItem(KEY, theme) } catch { /* storage blocked */ }
  }
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, current)
  return { theme, dark: theme === 'noir', toggle: () => setTheme(theme === 'noir' ? 'paper' : 'noir') }
}

import { createContext, useContext } from 'react'

// The bag context and its hook live apart from BagProvider so the provider's file only
// exports a component (fast refresh needs that).
export const BagContext = createContext(null)
export const useBag = () => useContext(BagContext)

// Stock can drop after something was added, so warn before checkout.
export function stockWarning(item) {
  if (item.available === 0) return `Sold out in ${item.size}. Remove it to check out.`
  if (item.available < item.quantity) return `Only ${item.available} left in ${item.size}. Lower the quantity to check out.`
  return ''
}

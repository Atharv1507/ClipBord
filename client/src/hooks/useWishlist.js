import { useDispatch, useSelector } from 'react-redux'
import { toggleBookmark } from '../store/wishlistSlice'

// How many products are bookmarked, for the navbar badge.
export function useWishlistCount() {
  return useSelector((state) => state.wishlist.ids.length)
}

// Each card reads only its own true/false, so toggling one bookmark
// re-renders that card alone. toggle() rejects with the error message if the
// server refuses (the bookmark has already flipped back by then).
export function useWishlist(id) {
  const dispatch = useDispatch()
  const saved = useSelector((state) => state.wishlist.ids.includes(id))
  return { saved, toggle: () => dispatch(toggleBookmark({ id, saved })).unwrap() }
}

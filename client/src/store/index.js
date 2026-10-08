import { configureStore } from '@reduxjs/toolkit'
import productsReducer from './productsSlice'
import wishlistReducer from './wishlistSlice'

// The one Redux store for the app. Each key is a slice: state.products is owned by
// productsSlice, state.wishlist by wishlistSlice. New slices get added here.
export const store = configureStore({
  reducer: {
    products: productsReducer,
    wishlist: wishlistReducer,
  },
})

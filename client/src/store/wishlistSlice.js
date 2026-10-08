import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'

// The logged-in customer's bookmarked product ids. AuthContext loads them on login;
// every card reads its own true/false from them.
export const loadWishlistIds = createAsyncThunk('wishlist/loadIds', async () => {
  const { data } = await axiosInstance.get('/wishlist/ids')
  return data.ids
})

// Bookmarks or un-bookmarks one product. The reducers flip the bookmark straight away
// (pending) and flip it back if the server refuses (rejected). `saved` is whether it was
// bookmarked when clicked. Use dispatch(...).unwrap() to get the error and show it.
export const toggleBookmark = createAsyncThunk('wishlist/toggle', async ({ id, saved }, { rejectWithValue }) => {
  try {
    await axiosInstance.post(saved ? '/wishlist/remove' : '/wishlist/add', { productId: id })
  } catch (err) {
    console.log(err)
    return rejectWithValue(getErrorMessage(err, "Couldn't update your bookmarks. Please try again."))
  }
})

// The bookmarked products for the Wishlist page, fetched each time the page opens.
// Both outcomes carry `fetchedAt`, so the page can tell its own answer from one left
// over from an earlier visit.
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchPage',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/wishlist/getWishlist')
      return { products: data.products, fetchedAt: Date.now() }
    } catch (err) {
      console.log(err)
      return rejectWithValue({
        error: getErrorMessage(err, "Couldn't load your bookmarks. Please try again."),
        fetchedAt: Date.now(),
      })
    }
  },
  { condition: (_, { getState }) => getState().wishlist.page.status !== 'loading' },
)

const emptyPage = { status: 'idle', error: '', products: [], fetchedAt: 0 }

// ids with `id` bookmarked or not, never listing it twice.
const withId = (ids, id, saved) => (saved ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id))

// ids:  bookmarked product ids
// page: the Wishlist page's products; status is 'idle' | 'loading' | 'ready' | 'error'.
//       A reload keeps the previous products until the answer arrives.
const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: [], idsRequest: null, page: emptyPage },
  reducers: {
    // On logout: nobody's bookmarks. Also drops any ids request still in flight.
    cleared: () => ({ ids: [], idsRequest: null, page: emptyPage }),
  },
  extraReducers: (builder) => {
    builder
      // Only the latest ids request counts, so a slow answer for the previous
      // customer can't land after logout or a switch of account.
      .addCase(loadWishlistIds.pending, (state, action) => {
        state.idsRequest = action.meta.requestId
      })
      .addCase(loadWishlistIds.fulfilled, (state, action) => {
        if (state.idsRequest === action.meta.requestId) state.ids = action.payload
      })
      .addCase(loadWishlistIds.rejected, (state, action) => {
        if (state.idsRequest === action.meta.requestId) state.ids = []
      })
      .addCase(toggleBookmark.pending, (state, action) => {
        const { id, saved } = action.meta.arg
        state.ids = withId(state.ids, id, !saved)
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        const { id, saved } = action.meta.arg
        state.ids = withId(state.ids, id, saved)
      })
      .addCase(fetchWishlist.pending, (state) => {
        state.page.status = 'loading'
        state.page.error = ''
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.page = { status: 'ready', error: '', ...action.payload }
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.page.status = 'error'
        state.page.error = action.payload.error
        state.page.fetchedAt = action.payload.fetchedAt
      })
  },
})

export const { cleared: wishlistCleared } = wishlistSlice.actions
export default wishlistSlice.reducer

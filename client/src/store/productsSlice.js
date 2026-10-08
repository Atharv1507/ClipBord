import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'

// How long a loaded list or product counts as fresh. Opening a page within this window
// reuses what's in the store; after it, the page fetches again.
const FRESH_MS = 60_000

// What the filters can count before the first response (or from an older server
// that doesn't send facets): no counts known, no price range known.
export const EMPTY_FACETS = { category: {}, price: { min: null, max: null } }

function readFacets(facets) {
  return {
    category: facets?.category ?? {},
    price: { min: facets?.price?.min ?? null, max: facets?.price?.max ?? null },
  }
}

// The query string for one /products/getAll request, also used as that list's key in the
// store: { page: 1, limit: 12, filters: { category: ['Tshirt', 'Joggers'] } }
// -> "page=1&limit=12&category=Joggers,Tshirt". Equal requests always give the same
// string, so two components asking for the same list share one entry.
export function productsQuery({ search = '', page = 1, limit = 12, filters = {} } = {}) {
  const { category = [], minPrice, maxPrice } = filters
  const parts = [['page', String(page)], ['limit', String(limit)]]
  if (search) parts.push(['search', search])
  if (category.length) parts.push(['category', [...category].sort().join(',')])
  if (Number.isFinite(minPrice)) parts.push(['minPrice', String(minPrice)])
  if (Number.isFinite(maxPrice)) parts.push(['maxPrice', String(maxPrice)])
  return new URLSearchParams(parts).toString()
}

const isFresh = (entry) => entry?.status === 'ready' && Date.now() - entry.fetchedAt < FRESH_MS

// Loads one list. Skipped while the same list is already loading, or loaded recently,
// so every component on the page can ask for what it needs without doubling requests.
export const fetchProducts = createAsyncThunk(
  'products/fetchList',
  async (query, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/products/getAll?${query}`)
      return {
        products: data.Allproducts ?? [],
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 0,
        facets: readFacets(data.facets),
        fetchedAt: Date.now(),
      }
    } catch (err) {
      console.log(err)
      return rejectWithValue(getErrorMessage(err, "Couldn't load products. Check your connection and try again."))
    }
  },
  {
    condition: (query, { getState }) => {
      const entry = getState().products.lists[query]
      return entry?.status !== 'loading' && !isFresh(entry)
    },
  },
)

// Loads one product's full details for its page. Lists only carry name, price, image and
// category, so details are kept apart from them.
export const fetchProduct = createAsyncThunk(
  'products/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/products/getproduct/${id}`)
      return { product: data.prod, fetchedAt: Date.now() }
    } catch (err) {
      console.log(err)
      return rejectWithValue(getErrorMessage(err, "Couldn't load this product. Check your connection and try again."))
    }
  },
  {
    condition: (id, { getState }) => {
      const entry = getState().products.details[id]
      return entry?.status !== 'loading' && !isFresh(entry)
    },
  },
)

// lists:   { "<query>": { status, error, products, total, totalPages, facets, fetchedAt } }
// details: { "<id>":    { status, error, product, fetchedAt } }
// status is 'loading' | 'ready' | 'error'. A reload keeps the old products in the entry
// until the new ones arrive, so the page doesn't blank out.
const productsSlice = createSlice({
  name: 'products',
  initialState: { lists: {}, details: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        const query = action.meta.arg
        const entry = state.lists[query]
        state.lists[query] = entry
          ? { ...entry, status: 'loading', error: '' }
          : { status: 'loading', error: '', products: [], total: 0, totalPages: 0, facets: EMPTY_FACETS, fetchedAt: 0 }
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.lists[action.meta.arg] = { status: 'ready', error: '', ...action.payload }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        const entry = state.lists[action.meta.arg]
        entry.status = 'error'
        entry.error = action.payload
      })
      .addCase(fetchProduct.pending, (state, action) => {
        const id = action.meta.arg
        const entry = state.details[id]
        state.details[id] = entry
          ? { ...entry, status: 'loading', error: '' }
          : { status: 'loading', error: '', product: null, fetchedAt: 0 }
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.details[action.meta.arg] = { status: 'ready', error: '', ...action.payload }
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        const entry = state.details[action.meta.arg]
        entry.status = 'error'
        entry.error = action.payload
      })
  },
})

export default productsSlice.reducer

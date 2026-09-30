// import { axiosInstance } from './axios'

// Cart API placeholders. There's no cart route on the server yet, so each function
// fakes a response. When the route exists, delete the fake lines and uncomment the
// request (and the axiosInstance import above).

// Add `quantity` of one size of a product to the logged-in customer's cart.
// Suggested route: POST /cart/add   body: { productId, size, quantity }
// The server should check the size is in stock (product.sizes[size] >= quantity)
// and answer 400 with { message } if not; the page shows that message as-is.
// Suggested response: { message, cart: { items: [...], count } }
export async function addToCart({ productId, size, quantity }) {
  // const res = await axiosInstance.post('/cart/add', { productId, size, quantity })
  // return res.data

  // Placeholder: pretend it worked after a short delay so the button states are visible.
  console.log('addToCart placeholder', { productId, size, quantity })
  await new Promise((resolve) => setTimeout(resolve, 400))
  return { message: 'Added to cart' }
}

// Total number of items in the cart, for the navbar badge.
// Suggested route: GET /cart   response: { cart: { items: [...], count } }
// Return 0 for a logged-out visitor (e.g. catch the 401) so the badge just shows 0.
export async function getCartCount() {
  // const res = await axiosInstance.get('/cart')
  // return res.data.cart.count

  // Placeholder: an empty cart.
  return 0
}

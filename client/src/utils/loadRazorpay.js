// Razorpay's checkout script, which adds window.Razorpay (the payment popup).
// It's loaded only when someone checks out, not on every page.
const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

// Shared by every caller, so clicking checkout twice still adds one script tag.
let loading = null

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay)
      } else {
        fail()
      }
    }
    // Offline, or an ad blocker stopped it. Clear the cache so the next
    // click can try again instead of reusing this failure.
    const fail = () => {
      script.remove()
      loading = null
      reject(new Error('Could not load the payment window. Check your connection or ad blocker and try again.'))
    }
    script.onerror = fail
    document.body.appendChild(script)
  })

  return loading
}

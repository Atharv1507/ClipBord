import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { Icon } from '../components/Icons'
import { SubmitArrow, fieldClass, labelClass, submitClass } from '../components/AuthShell'
import { stockWarning, useBag } from '../context/bag'
import { useAuth } from '../context/AuthContext'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { loadRazorpay } from '../utils/loadRazorpay'
import { formatPrice, plural } from '../utils/product'

const gutter = 'px-4 md:px-[clamp(16px,2.2vw,32px)]'

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
]

// Same rules as the server's order model, so mistakes are caught here first.
// The server checks again; this is only for quicker feedback.
const RULES = {
  fullName: (v) => (v.trim() ? '' : 'Enter the name for delivery'),
  phone: (v) => (/^[6-9]\d{9}$/.test(v) ? '' : 'Enter a 10-digit mobile number'),
  line1: (v) => (v.trim() ? '' : 'Enter your house number and street'),
  city: (v) => (v.trim() ? '' : 'Enter your city'),
  state: (v) => (v ? '' : 'Choose your state'),
  pincode: (v) => (/^\d{6}$/.test(v) ? '' : 'Enter a 6-digit pincode'),
}

// Keeps only the last 10 digits, so "+91 98765 43210" becomes "9876543210".
const cleanPhone = (value) => value.replace(/\D/g, '').slice(-10)

function validate(form) {
  const errors = {}
  for (const [name, rule] of Object.entries(RULES)) {
    const message = rule(form[name])
    if (message) errors[name] = message
  }
  return errors
}

// One labelled input with its error underneath, linked for screen readers.
function Field({ name, label, error, optional, className = '', ...props }) {
  return (
    <div className={className}>
      <label htmlFor={name} className={labelClass}>
        {label}
        {optional && <span className="font-normal text-drawer-soft"> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${fieldClass} ${error ? 'border-accent-fg' : ''}`}
        {...props}
      />
      {error && <p id={`${name}-error`} className="mt-1.5 text-[13px] text-accent-fg">{error}</p>}
    </div>
  )
}

// Where to ship, then pay. The bag's items and total are shown for a last look;
// the server works out the real amount from the database either way.
function Checkout() {
  const { user } = useAuth()
  const { cart, status, retry } = useBag()
  useSmoothScroll()

  const [form, setForm] = useState(() => ({
    fullName: user?.fullName ?? '',
    phone: cleanPhone(user?.phone ?? ''),
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  // idle -> paying (popup open) -> verifying (asking our server) -> back to idle
  const [step, setStep] = useState('idle')
  // Set once the server confirms the payment; the page then shows the receipt.
  const [placedOrderId, setPlacedOrderId] = useState(null)
  const [prefilled, setPrefilled] = useState(false)
  // Once the customer types, a late pre-fill must not overwrite their input.
  const edited = useRef(false)

  // Fill in the address from their last order, if they have one.
  useEffect(() => {
    let ignore = false
    axiosInstance
      .get('/orders/last-address')
      .then(({ data }) => {
        if (ignore || edited.current || !data.address) return
        const { fullName, phone, line1, line2, city, state, pincode } = data.address
        setForm({ fullName, phone: cleanPhone(phone), line1, line2: line2 ?? '', city, state, pincode })
        setPrefilled(true)
      })
      // No saved address just means an empty form.
      .catch((err) => console.log(err))
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    document.title = 'Checkout · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  const hasStockIssue = cart.items.some((item) => stockWarning(item))

  // Nothing to check out: back to the bag. Not after an order is placed,
  // though: the bag is empty then because it was just bought.
  if (status === 'ready' && cart.items.length === 0 && !placedOrderId) {
    return <Navigate to="/cart" replace />
  }

  function handleChange(e) {
    const { name } = e.target
    let { value } = e.target
    if (name === 'phone') value = value.replace(/[^\d+\s-]/g, '')
    if (name === 'pincode') value = value.replace(/\D/g, '').slice(0, 6)
    edited.current = true
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear a field's error as soon as it's being fixed.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const address = { ...form, phone: cleanPhone(form.phone) }
    const found = validate(address)
    setErrors(found)
    if (Object.keys(found).length) {
      // Take the user to the first problem.
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }

    const shippingAddress = {
      fullName: address.fullName.trim(),
      phone: address.phone,
      line1: address.line1.trim(),
      line2: address.line2.trim() || undefined,
      city: address.city.trim(),
      state: address.state,
      pincode: address.pincode,
    }
    pay(shippingAddress)
  }

  async function pay(shippingAddress) {
    setError('')
    setStep('paying')
    try {
      // Script first: if it's blocked, no order is created for nothing.
      const Razorpay = await loadRazorpay()
      // The server reads the bag, prices it and creates the Razorpay order.
      const { data } = await axiosInstance.post('/orders/checkout', { shippingAddress })

      // Razorpay keeps the popup open after a failed attempt so the customer can
      // try another method; the reason is shown only if they then close it.
      let lastFailure = ''

      const popup = new Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: 'Clipbord',
        description: plural(cart.count, 'item'),
        image: `${window.location.origin}/apple-touch-icon.png`,
        prefill: data.prefill,
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() },
        // Runs when Razorpay says the payment succeeded. That's only the
        // browser's word, so our server checks it before anything changes.
        handler: (response) => confirmPayment(response),
        modal: {
          ondismiss: () => {
            setStep('idle')
            setError(lastFailure ? `Payment failed: ${lastFailure}` : 'Payment cancelled. Your bag is still here.')
          },
        },
      })
      popup.on('payment.failed', (response) => {
        lastFailure = response.error?.description || 'Please try another method.'
      })
      popup.open()
    } catch (err) {
      console.log(err)
      setStep('idle')
      setError(getErrorMessage(err, "Couldn't start the payment. Please try again."))
    }
  }

  async function confirmPayment(response) {
    setStep('verifying')
    try {
      const { data } = await axiosInstance.post('/orders/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
      setPlacedOrderId(data.orderId)
      window.scrollTo({ top: 0 })
    } catch (err) {
      console.log(err)
      // 409: sold out while paying, already refunded. Anything else: the money
      // may still have gone through, and the webhook or the reconcile job will
      // record it, so don't tell the customer it failed.
      setError(
        err.response?.status === 409
          ? getErrorMessage(err)
          : "We couldn't confirm your payment yet. If money was taken, the order will appear in your orders within a few minutes.",
      )
    } finally {
      setStep('idle')
      // The server changed the bag (bought lines removed); load what's left.
      retry()
    }
  }

  const loading = status === 'loading' || status === 'idle'
  const busy = step !== 'idle'

  if (placedOrderId) {
    return (
      <div id="top" className="flex min-h-screen flex-col">
        <Navbar />
        <main className={`${gutter} flex-1 pb-[clamp(48px,7vw,96px)] pt-[clamp(36px,5vw,72px)]`}>
          <div role="status" className="rounded-panel bg-panel px-[clamp(20px,4vw,56px)] py-[clamp(48px,8vw,110px)] text-panel-fg">
            <h1 className="display text-[clamp(48px,8vw,110px)]">Order placed.</h1>
            <p className="mt-3.5 max-w-[46ch] text-panel-soft">
              Payment received. We'll start packing your order and you can follow it from your orders.
            </p>
            <p className="mt-2 text-[13px] text-panel-soft">Order {placedOrderId}</p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Link to="/orders" className="inline-flex h-[52px] items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent">
                Track your order
                <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15"><Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
              <Link to="/catalogue" className="text-sm underline underline-offset-4">Keep shopping</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />
      <Toast message={error} onClose={() => setError('')} duration={8000} />

      <main className="flex-1" aria-busy={loading}>
        <header className={`${gutter} pb-7 pt-[clamp(36px,5vw,72px)]`}>
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-fg-soft hover:text-fg">
            <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
            Back to bag
          </Link>
          <h1 className="display mt-4 text-[clamp(56px,10vw,160px)]">Checkout</h1>
        </header>

        <div className={`${gutter} pb-[clamp(48px,7vw,96px)]`}>
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_380px]">
            <form id="checkout-form" onSubmit={handleSubmit} noValidate className="rounded-panel bg-drawer p-6 text-drawer-fg sm:p-8">
              {/* disabled on a fieldset locks every field inside at once */}
              <fieldset disabled={busy} className="contents">
                <h2 className="display text-[34px]">Delivery address</h2>
                <p className="mt-2 text-sm text-drawer-soft">
                {prefilled ? 'Filled in from your last order. Change anything that’s different.' : 'We ship across India.'}
              </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field name="fullName" label="Full name" autoComplete="name" value={form.fullName} onChange={handleChange} error={errors.fullName} />
                  <Field name="phone" label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" value={form.phone} onChange={handleChange} error={errors.phone} />
                  <Field name="line1" label="House no., building, street" autoComplete="address-line1" value={form.line1} onChange={handleChange} error={errors.line1} className="sm:col-span-2" />
                  <Field name="line2" label="Area, landmark" optional autoComplete="address-line2" value={form.line2} onChange={handleChange} className="sm:col-span-2" />
                  <Field name="city" label="City" autoComplete="address-level2" value={form.city} onChange={handleChange} error={errors.city} />
                  <Field name="pincode" label="Pincode" inputMode="numeric" autoComplete="postal-code" placeholder="6 digits" value={form.pincode} onChange={handleChange} error={errors.pincode} />
                  <div className="sm:col-span-2">
                    <label htmlFor="state" className={labelClass}>State</label>
                    <select
                      id="state"
                      name="state"
                      autoComplete="address-level1"
                      value={form.state}
                      onChange={handleChange}
                      aria-invalid={errors.state ? true : undefined}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      className={`${fieldClass} appearance-none ${errors.state ? 'border-accent-fg' : ''} ${form.state ? '' : 'text-drawer-soft'}`}
                    >
                      <option value="" disabled>Choose a state</option>
                      {STATES.map((s) => <option key={s} value={s} className="text-drawer-fg">{s}</option>)}
                    </select>
                    {errors.state && <p id="state-error" className="mt-1.5 text-[13px] text-accent-fg">{errors.state}</p>}
                  </div>
                </div>
              </fieldset>
            </form>

            <aside aria-labelledby="summary-title" className="rounded-panel bg-panel p-6 text-panel-fg lg:sticky lg:top-[calc(var(--nav-h,68px)+1.5rem)]">
              <h2 id="summary-title" className="display text-[34px]">Your order</h2>

              {loading ? (
                <div className="mt-5 flex flex-col gap-3" aria-hidden="true">
                  {[0, 1].map((n) => <div key={n} className="h-14 rounded-inner bg-panel-fg/10 motion-safe:animate-pulse" />)}
                </div>
              ) : (
                <ul className="mt-5 flex flex-col gap-4">
                  {cart.items.map((item) => (
                    <li key={item._id} className="flex gap-3">
                      <img src={item.product.image} alt="" className="aspect-[4/5] w-12 shrink-0 rounded-[8px] object-cover" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-semibold">{item.product.name}</p>
                        <p className="text-panel-soft">Size {item.size} × {item.quantity}</p>
                        {stockWarning(item) && <p className="text-accent-fg">{stockWarning(item)}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(item.lineTotal)}</p>
                    </li>
                  ))}
                </ul>
              )}

              <dl className="mt-6 flex flex-col gap-3 border-t border-panel-fg/10 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-panel-soft">Items</dt><dd className="tabular-nums">{cart.count}</dd></div>
                <div className="flex justify-between"><dt className="text-panel-soft">Shipping</dt><dd>Free</dd></div>
                <div className="mt-2 flex items-baseline justify-between border-t border-panel-fg/10 pt-4">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{formatPrice(cart.subtotal)}</dd>
                </div>
              </dl>

              {/* Outside the form in the markup, tied to it by form="checkout-form". */}
              <button type="submit" form="checkout-form" disabled={loading || hasStockIssue || busy} className={submitClass}>
                {step === 'paying' ? 'Opening payment…' : step === 'verifying' ? 'Confirming payment…' : `Pay ${formatPrice(cart.subtotal)}`}
                <SubmitArrow />
              </button>
              <p className="mt-3 text-center text-[13px] text-panel-soft">
                {hasStockIssue
                  ? <>Some items changed. <Link to="/cart" className="underline underline-offset-4">Fix them in your bag</Link>.</>
                  : `${plural(cart.count, 'item')}. Payments are secured by Razorpay.`}
              </p>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Checkout

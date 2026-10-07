import { useCallback, useEffect, useState } from 'react'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { formatPrice } from '../utils/product'

// Shared helpers for the admin screens (components live in ui.jsx).

// Inputs on the page background (the shop's fieldClass is for drawer cards).
export const inputClass =
  'h-11 w-full rounded-[12px] border-[1.5px] border-line-strong bg-transparent px-3.5 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-soft focus:border-fg aria-[invalid=true]:border-accent-fg'
export const selectClass = `${inputClass} appearance-none pr-9`
export const smallLabel = 'mb-1.5 block text-[13px] font-semibold'
export const card = 'rounded-panel border border-line bg-canvas p-5 sm:p-6'
export const primaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-line-strong px-5 font-semibold transition-colors hover:border-fg disabled:cursor-not-allowed disabled:opacity-50'
export const quietButton =
  'inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-semibold text-fg-soft transition-colors hover:bg-line hover:text-fg disabled:cursor-not-allowed disabled:opacity-50'

// Orders store paise (₹1 = 100); products store rupees.
export const formatPaise = (paise) => formatPrice((paise ?? 0) / 100)

// Dates as the shop sees them, in India time whatever the admin's device says.
export const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
export const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
})
export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '')
export const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : '')

// A short, readable reference from the long Mongo id, e.g. #3F9A1C2B. Same as
// the customer's Orders page, so both sides quote the same number.
export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`

// One label + colour for an order, used in lists, the detail page and the overview.
export function orderStatus(order) {
  if (order.paymentStatus === 'refunded') {
    return order.razorpayRefundId ? { label: 'Refunded', tone: 'muted' } : { label: 'Refund pending', tone: 'warn' }
  }
  if (order.paymentStatus === 'created') return { label: 'Unpaid', tone: 'outline' }
  if (order.paymentStatus === 'failed') return { label: 'Payment failed', tone: 'outline' }
  switch (order.fulfillmentStatus) {
    case 'processing': return { label: 'Packing', tone: 'accent' }
    case 'shipped': return { label: 'Shipped', tone: 'solid' }
    case 'delivered':
      if (order.returnStatus === 'full') return { label: 'Returned', tone: 'warn' }
      if (order.returnStatus === 'partial') return { label: 'Partly returned', tone: 'warn' }
      return { label: 'Delivered', tone: 'muted' }
    case 'cancelled': return { label: 'Cancelled', tone: 'muted' }
    default: return { label: 'Paid', tone: 'solid' }
  }
}

// Loads one admin endpoint. `params` must be a plain object of strings; the
// request reruns when any of them (or `reload`) changes.
export function useAdminFetch(url, params) {
  const key = JSON.stringify(params ?? {})
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: '', key: null })

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get(url, { params: JSON.parse(key) })
      .then(({ data }) => {
        if (!ignore) setState({ status: 'ready', data, error: '', key: `${url}|${key}|${attempt}` })
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setState({ status: 'error', data: null, error: getErrorMessage(err, "Couldn't load this. Please try again."), key: `${url}|${key}|${attempt}` })
      })
    return () => {
      ignore = true
    }
  }, [url, key, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  // While a new request is in flight, report loading but keep the last data on screen.
  const current = state.key === `${url}|${key}|${attempt}`
  return { status: current ? state.status : 'loading', data: state.data, error: current ? state.error : '', reload, setData: (data) => setState((s) => ({ ...s, data })) }
}

// Reads and writes list filters in the URL (?status=archived&page=2), so a
// filtered view survives a reload and can be linked to from the overview.
export function updateParams(searchParams, setSearchParams, changes) {
  const next = new URLSearchParams(searchParams)
  for (const [k, v] of Object.entries(changes)) {
    if (v === '' || v == null) next.delete(k)
    else next.set(k, String(v))
  }
  // Any filter change goes back to page 1, unless the page itself is changing.
  if (!('page' in changes)) next.delete('page')
  setSearchParams(next, { replace: true })
}

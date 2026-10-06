import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { Icon } from '../components/Icons'
import { axiosInstance } from '../axiosCalls/axios'
import { getErrorMessage } from '../utils/getErrorMessage'
import { buildImageOrder, itemsFromProduct } from '../utils/gallery'
import { CATEGORIES, CATEGORY_LABELS, SIZES } from '../utils/product'
import GalleryEditor from './GalleryEditor'
import { card, inputClass, primaryButton, secondaryButton, smallLabel } from './lib'
import { Badge, ErrorPanel, PageHeader, Select, SkeletonRows } from './ui'

const EMPTY = { name: '', price: '', category: '', description: '', sizes: { S: '0', M: '0', L: '0', XL: '0' } }

const formFromProduct = (p) => ({
  name: p.name ?? '',
  price: String(p.price ?? ''),
  category: p.category ?? '',
  description: p.description ?? '',
  sizes: Object.fromEntries(SIZES.map((s) => [s, String(p.sizes?.[s] ?? 0)])),
})

// Same rules the server checks; here only for quicker feedback.
function validate(form, items) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Give the product a name'
  else if (form.name.trim().length > 120) errors.name = 'Keep the name under 120 characters'
  if (!/^\d+$/.test(form.price) || Number(form.price) < 1) errors.price = 'Enter the price in whole rupees, e.g. 899'
  if (!form.category) errors.category = 'Choose a category'
  if (form.description.length > 2000) errors.description = 'Keep the description under 2000 characters'
  for (const s of SIZES) {
    if (!/^\d+$/.test(form.sizes[s])) errors[`size-${s}`] = 'Whole number'
  }
  if (items.length === 0) errors.images = 'Add at least one photo'
  return errors
}

const revokeNew = (items) => items.forEach((item) => item.kind === 'new' && URL.revokeObjectURL(item.url))

// Create a product (/admin/products/new) or edit one (/admin/products/:id).
function ProductForm({ id }) {
  const isNew = !id
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY)
  const [items, setItems] = useState([])
  const [product, setProduct] = useState(null) // the saved version, when editing
  const [load, setLoad] = useState({ status: isNew ? 'ready' : 'loading', error: '' })
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (isNew) return
    let ignore = false
    axiosInstance
      .get(`/admin/products/${id}`)
      .then(({ data }) => {
        if (ignore) return
        setProduct(data.product)
        setForm(formFromProduct(data.product))
        setItems((prev) => {
          revokeNew(prev)
          return itemsFromProduct(data.product)
        })
        setConflict(false)
        setLoad({ status: 'ready', error: '' })
      })
      .catch((err) => {
        if (ignore) return
        console.log(err)
        setLoad({ status: 'error', error: getErrorMessage(err, "Couldn't load this product.") })
      })
    return () => {
      ignore = true
    }
  }, [id, isNew, attempt])

  function reload() {
    setLoad({ status: 'loading', error: '' })
    setAttempt((n) => n + 1)
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function setSize(size, value) {
    setForm((prev) => ({ ...prev, sizes: { ...prev.sizes, [size]: value.replace(/\D/g, '').slice(0, 5) } }))
    if (errors[`size-${size}`]) setErrors((prev) => ({ ...prev, [`size-${size}`]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate(form, items)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first === 'images' ? 'gallery' : first)?.focus?.()
      return
    }

    // Multipart form data, because it carries files. Text fields travel as
    // strings, so the sizes object goes as JSON.
    const body = new FormData()
    body.append('name', form.name.trim())
    body.append('price', form.price)
    body.append('category', form.category)
    body.append('description', form.description.trim())
    body.append('sizes', JSON.stringify(Object.fromEntries(SIZES.map((s) => [s, Number(form.sizes[s])]))))

    const { tokens, files } = buildImageOrder(items)
    if (isNew) {
      // A new product's photos are all new, so their order is just the file order.
      files.forEach((file) => body.append('images', file))
    } else {
      body.append('updatedAt', product.updatedAt)
      body.append('imageOrder', JSON.stringify(tokens))
      files.forEach((file) => body.append('newImages', file))
    }

    setSaving(true)
    setConflict(false)
    try {
      // axiosInstance defaults to JSON, and axios would turn FormData into JSON
      // (dropping the files). Saying multipart here lets the browser send it as
      // real form data and add the boundary itself.
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (isNew) {
        await axiosInstance.post('/admin/products', body, config)
        navigate('/admin/products', { state: { message: `${form.name.trim()} is live in the shop.` } })
        return
      }
      const { data } = await axiosInstance.patch(`/admin/products/${id}`, body, config)
      revokeNew(items)
      setProduct(data.product)
      setForm(formFromProduct(data.product))
      setItems(itemsFromProduct(data.product))
      setToast('Saved')
    } catch (err) {
      console.log(err)
      if (err.response?.status === 409) setConflict(true)
      else setToast(getErrorMessage(err, "Couldn't save the product. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  async function toggleArchived() {
    setSaving(true)
    try {
      const { data } = await axiosInstance.patch(`/admin/products/${id}/archive`, { archived: !product.archived })
      // Archiving changes updatedAt too; take the new one so the next save isn't a false conflict.
      setProduct((prev) => ({ ...prev, archived: data.product.archived, updatedAt: data.product.updatedAt }))
      setToast(data.product.archived ? 'Hidden from the shop' : 'Back in the shop')
    } catch (err) {
      console.log(err)
      setToast(getErrorMessage(err, "Couldn't update the product. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  const title = isNew ? 'New product' : product?.name || 'Edit product'
  const back = (
    <Link to="/admin/products" className="inline-flex items-center gap-2 hover:text-fg">
      <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Products
    </Link>
  )

  if (load.status === 'error') return <><PageHeader title="Edit product" eyebrow={back} /><ErrorPanel message={load.error} onRetry={reload} /></>
  if (load.status === 'loading') return <><PageHeader title="Edit product" eyebrow={back} /><SkeletonRows rows={3} height="h-40" /></>

  const fieldError = (name) => errors[name] && <p id={`${name}-error`} className="mt-1.5 text-[13px] text-accent-fg">{errors[name]}</p>
  const aria = (name) => ({ 'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? `${name}-error` : undefined })

  return (
    <>
      <PageHeader title={title} eyebrow={back}>
        {!isNew && product?.archived && <Badge tone="outline">Archived</Badge>}
        {!isNew && (
          <>
            <Link to={`/product/${id}`} className={secondaryButton}>View in shop</Link>
            <button type="button" onClick={toggleArchived} disabled={saving} className={secondaryButton}>
              {product?.archived ? 'Restore' : 'Archive'}
            </button>
          </>
        )}
      </PageHeader>
      <Toast message={toast} onClose={() => setToast('')} />

      {conflict && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border-[1.5px] border-accent-fg px-5 py-4 text-accent-fg">
          <p className="font-semibold">This product changed since you opened it. Reload to see the latest.</p>
          <button type="button" onClick={reload} className={secondaryButton}>Reload</button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <fieldset disabled={saving} className="contents">
          <section className={`${card} flex flex-col gap-4`} aria-label="Details">
            <div>
              <label htmlFor="name" className={smallLabel}>Name</label>
              <input id="name" value={form.name} onChange={(e) => setField('name', e.target.value)} maxLength={120} className={inputClass} {...aria('name')} />
              {fieldError('name')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className={smallLabel}>Price (₹)</label>
                <input id="price" inputMode="numeric" value={form.price} onChange={(e) => setField('price', e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="899" className={inputClass} {...aria('price')} />
                {fieldError('price')}
              </div>
              <div>
                <Select id="category" label="Category" value={form.category} onChange={(v) => setField('category', v)}>
                  <option value="" disabled>Choose…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </Select>
                {fieldError('category')}
              </div>
            </div>
            <div>
              <label htmlFor="description" className={smallLabel}>Description</label>
              <textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={2000}
                className={`${inputClass} h-auto py-3 leading-relaxed`}
                {...aria('description')}
              />
              {fieldError('description')}
            </div>
            <fieldset>
              <legend className={smallLabel}>Stock per size</legend>
              <div className="grid grid-cols-4 gap-2.5">
                {SIZES.map((s) => (
                  <div key={s}>
                    <label htmlFor={`size-${s}`} className="mb-1 block text-center text-[13px] font-semibold">{s}</label>
                    <input
                      id={`size-${s}`}
                      inputMode="numeric"
                      value={form.sizes[s]}
                      onChange={(e) => setSize(s, e.target.value)}
                      className={`${inputClass} text-center tabular-nums`}
                      {...aria(`size-${s}`)}
                    />
                    {fieldError(`size-${s}`)}
                  </div>
                ))}
              </div>
              {!isNew && <p className="mt-2 text-[13px] text-fg-soft">Saving sets these exact numbers. If someone buys while you edit, you'll be asked to reload first.</p>}
            </fieldset>
          </section>

          <section id="gallery" tabIndex={-1} className={`${card} outline-none`} aria-label="Photos">
            <GalleryEditor
              items={items}
              onChange={(next) => {
                setItems(next)
                if (errors.images) setErrors((prev) => ({ ...prev, images: '' }))
              }}
              error={errors.images}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3 xl:col-span-2">
            <button type="submit" className={primaryButton}>
              {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </button>
            <Link to="/admin/products" className={secondaryButton}>Cancel</Link>
          </div>
        </fieldset>
      </form>
    </>
  )
}

// Keyed by id, so moving from one product to another starts a fresh form
// instead of briefly showing the previous product's fields.
function ProductFormPage() {
  const { id } = useParams()
  return <ProductForm key={id ?? 'new'} id={id} />
}

export default ProductFormPage

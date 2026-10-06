import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { MAX_IMAGES, moveItem } from '../utils/gallery'
import { ACCEPTED_TYPES, downscaleImage } from '../utils/downscaleImage'
import { secondaryButton } from './lib'

let nextKey = 0

// The product's photos in display order. The first one is the cover the shop
// shows on cards. New photos are shrunk in the browser as they're added and
// only uploaded when the form is saved.
//
// `items` / `onChange` are controlled by the form (see utils/gallery.js for the shape).
function GalleryEditor({ items, onChange, error }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [preparing, setPreparing] = useState(false)
  const [message, setMessage] = useState('')

  // Local previews hold memory until revoked: free each one when its photo is
  // removed, and whatever is left when the form closes.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })
  useEffect(() => () => {
    itemsRef.current.forEach((item) => item.kind === 'new' && URL.revokeObjectURL(item.url))
  }, [])

  async function addFiles(fileList) {
    const files = Array.from(fileList)
    if (!files.length) return
    setMessage('')
    const room = MAX_IMAGES - items.length
    const problems = []
    if (files.length > room) problems.push(`Only ${MAX_IMAGES} photos per product, so ${files.length - room} ${files.length - room === 1 ? 'was' : 'were'} left out.`)

    setPreparing(true)
    const added = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        const small = await downscaleImage(file)
        added.push({ key: `new-${nextKey++}`, kind: 'new', file: small, url: URL.createObjectURL(small) })
      } catch (err) {
        problems.push(err.message)
      }
    }
    setPreparing(false)
    if (added.length) onChange([...itemsRef.current, ...added])
    if (problems.length) setMessage(problems.join(' '))
  }

  function remove(index) {
    const item = items[index]
    if (item.kind === 'new') URL.revokeObjectURL(item.url)
    onChange(items.filter((_, i) => i !== index))
  }

  const move = (from, to) => onChange(moveItem(items, from, to))

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold" id={`${inputId}-label`}>Photos</p>
        <p className="text-[13px] text-fg-soft">{items.length} of {MAX_IMAGES} · the first is the cover</p>
      </div>

      <ul aria-labelledby={`${inputId}-label`} className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.key} className="flex flex-col overflow-hidden rounded-inner border border-line bg-canvas">
            <div className="relative aspect-[4/5] bg-photo">
              <img src={item.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-canvas">Cover</span>}
              {item.kind === 'new' && <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">New</span>}
            </div>
            <div className="flex items-center justify-between gap-1 p-1.5">
              <div className="flex">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-line disabled:opacity-30">
                  <Icon name="caretLeft" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move photo ${i + 1} later`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-line disabled:opacity-30">
                  <Icon name="caretLeft" className="h-4 w-4 rotate-180" />
                </button>
              </div>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`} className="grid h-9 w-9 place-items-center rounded-full text-accent-fg hover:bg-line">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}

        {items.length < MAX_IMAGES && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-[4/5] h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-inner border-[1.5px] border-dashed border-line-strong p-3 text-center text-sm text-fg-soft transition-colors hover:border-fg hover:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg"
            >
              <Icon name="plus" className="h-6 w-6" />
              {preparing ? 'Preparing photos…' : 'Add photos'}
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                disabled={preparing}
                onChange={(e) => {
                  addFiles(e.target.files)
                  // Lets the same file be picked again after removing it.
                  e.target.value = ''
                }}
                className="sr-only"
              />
            </label>
          </li>
        )}
      </ul>

      <p className="mt-2 text-[13px] text-fg-soft">JPEG, PNG, WebP or AVIF. Large photos are resized to 2000px before upload.</p>
      {(message || error) && <p role="alert" className="mt-1.5 text-[13px] text-accent-fg">{error || message}</p>}
      {items.length === 0 && (
        <button type="button" onClick={() => inputRef.current?.click()} className={`${secondaryButton} mt-3`} disabled={preparing}>
          Choose photos
        </button>
      )}
    </div>
  )
}

export default GalleryEditor

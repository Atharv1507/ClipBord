// Pure helpers for the product gallery editor, kept apart from the component
// so they can be tested on their own.
//
// A gallery item is either a photo already on the product:
//   { key, kind: 'existing', url, publicId? }
// or one picked in this session, not uploaded yet:
//   { key, kind: 'new', file, url }   (url is a local preview)

export const MAX_IMAGES = 8

// Moves the item at `from` to `to`, returning a new array.
export function moveItem(items, from, to) {
  if (to < 0 || to >= items.length || from === to) return items
  const next = items.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// What the server needs to rebuild the gallery in this exact order:
// - tokens: one per photo, in display order. Kept photos are named by their
//   Cloudinary id ("existing:<publicId>"), or by URL for older photos that have
//   none ("existing-url:<url>"); new photos point into `files` ("new:<i>").
// - files: the new photos' files, in the order the tokens refer to them.
export function buildImageOrder(items) {
  const tokens = []
  const files = []
  for (const item of items) {
    if (item.kind === 'new') {
      files.push(item.file)
      tokens.push(`new:${files.length - 1}`)
    } else if (item.publicId) {
      tokens.push(`existing:${item.publicId}`)
    } else {
      tokens.push(`existing-url:${item.url}`)
    }
  }
  return { tokens, files }
}

// The product's saved photos as gallery items. Products from before galleries
// only have `image`, which becomes their one photo.
export function itemsFromProduct(product) {
  const images = product.images?.length ? product.images : product.image ? [{ url: product.image }] : []
  return images.map((img, i) => ({ key: `existing-${i}-${img.publicId ?? img.url}`, kind: 'existing', url: img.url, publicId: img.publicId }))
}

// Shrinks a photo in the browser before upload: at most 2000px on its longest
// side, re-encoded as WebP (or JPEG where the browser can't write WebP).
// Re-encoding also drops the camera's EXIF data, location included.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SIDE = 2000
const QUALITY = 0.85

// The size to draw at: unchanged if it already fits, otherwise scaled down so
// the longest side is `max`, keeping the shape.
export function fitSize(width, height, max = MAX_SIDE) {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

// Browsers that can't write WebP quietly hand back a PNG instead (Safari did
// for years), which would be far bigger. So check what came back.
export async function encodeCanvas(canvas, quality = QUALITY) {
  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error("Couldn't process this image")
  return jpeg
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through to <img>, which some browsers decode more formats with */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Returns a new File ready to upload, or throws an Error whose message can be
// shown as is.
export async function downscaleImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`${file.name} isn't a JPEG, PNG, WebP or AVIF image`)
  }

  let source
  try {
    source = await decode(file)
  } catch {
    throw new Error(`Couldn't read ${file.name}. Try saving it as a JPEG or PNG.`)
  }

  const { width, height } = fitSize(source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  source.close?.()

  const blob = await encodeCanvas(canvas)
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is still over 5MB after resizing. Try a smaller photo.`)
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `${base}.${ext}`, { type: blob.type })
}

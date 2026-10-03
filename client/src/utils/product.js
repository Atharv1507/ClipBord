import teeBack from '../assets/campaign/tee-back.jpg'
import hoodieBack from '../assets/campaign/hoodie-back.jpg'

// The product model stores these enum values; show friendlier names.
export const CATEGORY_LABELS = {
  Tshirt: 'T-shirts',
  'Sweat Shirt': 'Sweatshirts',
  Joggers: 'Joggers',
}

// Same order as the sizes object in the product model.
export const SIZES = ['S', 'M', 'L', 'XL']

export function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

// The same enum values in a fixed display order, for filters and URL params.
export const CATEGORIES = Object.keys(CATEGORY_LABELS)

// The catalogue filtered to one category, e.g. /catalogue?category=Sweat%20Shirt.
export function categoryPath(category) {
  return category ? `/catalogue?category=${encodeURIComponent(category)}` : '/catalogue'
}

// The three category tiles: a campaign photo, the oversized word cropped across the
// bottom, and which tile colour it takes.
const JOGGERS_PHOTO =
  'https://res.cloudinary.com/dmxf5exhr/image/upload/c_crop,h_0.82,g_north/c_fill,ar_4:5,g_center,w_900,f_auto,q_auto/v1790688386/clipBoard/product-images/uzjktcl7hptklik5u6v2.png'
export const CATEGORY_TILES = {
  Tshirt: { word: 'Tees', tone: 1, photo: teeBack, position: '50% 38%' },
  'Sweat Shirt': { word: 'Hoods', tone: 2, photo: hoodieBack, position: '50% 34%' },
  Joggers: { word: 'Jogs', tone: 3, photo: JOGGERS_PHOTO, position: '50% 50%' },
}

// "1 style" / "2 styles", "1 piece" / "5 pieces".
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

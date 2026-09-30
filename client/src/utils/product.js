// The product model stores these enum values; show friendlier names.
export const CATEGORY_LABELS = {
  Tshirt: 'T-shirt',
  'Sweat Shirt': 'Sweatshirt',
  Joggers: 'Joggers',
}

// Same order as the sizes object in the product model.
export const SIZES = ['S', 'M', 'L', 'XL']

export function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

// The same enum values in a fixed display order, for filters and URL params.
export const CATEGORIES = Object.keys(CATEGORY_LABELS)

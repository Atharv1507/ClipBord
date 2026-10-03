import ProductCard from './ProductCard'

// Four to a row on laptops, two on phones and tablets. With `feature`, the first product
// is the big 2×2 card that leads the new drop. With `placeholders`, that many pulsing
// panels stand in while products load.
function ProductGrid({ products = [], feature = false, placeholders = 0 }) {
  const grid = 'grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4'

  if (placeholders) {
    return (
      <ul aria-label="Loading products" className={grid}>
        {Array.from({ length: placeholders }, (_, i) => (
          <li key={i} className={`overflow-hidden rounded-panel bg-panel ${feature && i === 0 ? 'col-span-2 lg:row-span-2' : ''}`}>
            <div className="aspect-[1/1.025] bg-photo motion-safe:animate-pulse lg:h-full" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={grid}>
      {products.map((product, i) => (
        <li key={product._id} className={`flex ${feature && i === 0 ? 'col-span-2 lg:row-span-2' : ''} [&>article]:w-full`}>
          <ProductCard product={product} feature={feature && i === 0} />
        </li>
      ))}
    </ul>
  )
}

export default ProductGrid

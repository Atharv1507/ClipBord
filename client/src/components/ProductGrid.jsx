import ProductCard from './ProductCard'

// Four to a row on laptops, two on phones and tablets. With `feature`, the first product
// is the big 2×2 card that leads the new drop. With `placeholders`, that many pulsing
// tiles, with bars for the name and price, stand in while products load.
function ProductGrid({ products = [], feature = false, placeholders = 0 }) {
  const grid = 'grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4'

  if (placeholders) {
    return (
      <ul aria-label="Loading products" className={grid}>
        {Array.from({ length: placeholders }, (_, i) => {
          const big = feature && i === 0
          return (
            <li key={i} className={`flex flex-col motion-safe:animate-pulse ${big ? 'col-span-2 lg:row-span-2' : ''}`}>
              <div className={`rounded-panel bg-photo ${big ? 'aspect-square lg:aspect-auto lg:flex-1' : 'aspect-[1/1.025]'}`} />
              <div className="flex justify-between gap-3 px-0.5 pb-1 pt-3">
                <div className="h-3.5 w-1/2 rounded-full bg-photo" />
                <div className="h-3.5 w-12 rounded-full bg-photo" />
              </div>
            </li>
          )
        })}
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

import ProductCard from './ProductCard'

// Tags hang off a clothing rail, one per row of the grid: each cell draws its piece of the
// rail half a gap past both sides (gap-x-6), so the pieces join up across the row.
const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-x-6 gap-y-14'

function Rail() {
  return <span aria-hidden="true" className="absolute -inset-x-3 top-px h-1 rounded-full bg-paper/20" />
}

// Products as hang tags on the rail. With `placeholders` it shows that many blank,
// pulsing tags instead, for while the products load.
function ProductRack({ products = [], placeholders = 0 }) {
  if (placeholders) {
    return (
      <ul aria-label="Loading products" className={gridClass}>
        {Array.from({ length: placeholders }, (_, i) => (
          <li key={i} className="relative">
            <Rail />
            <div className="mx-auto mt-10 aspect-[1/1.85] max-w-sm rounded-b-2xl bg-raised [clip-path:polygon(22%_0,78%_0,100%_44px,100%_100%,0_100%,0_44px)] motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={gridClass}>
      {products.map((product) => (
        <li key={product._id} className="relative">
          <Rail />
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export default ProductRack

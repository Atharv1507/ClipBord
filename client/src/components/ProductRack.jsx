import ProductCard from './ProductCard'

// Two tags to a row on phones, three on tablets, four on laptops and up. They hang off a
// clothing rail, one per row of the grid: each cell draws its piece of the rail half a gap
// past both sides (gap-x-3, then gap-x-6), so the pieces join up across the row.
const gridClass = 'grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-14 md:grid-cols-3 lg:grid-cols-4'

function Rail() {
  return <span aria-hidden="true" className="absolute -inset-x-1.5 top-px sm:-inset-x-3 h-1 rounded-full bg-paper/20" />
}

// Products as hang tags on the rail. With `placeholders` it shows that many blank,
// pulsing tags instead, for while the products load.
function ProductRack({ products = [], placeholders = 0 }) {
  if (placeholders) {
    return (
      <ul aria-label="Loading products" className={gridClass}>
        {Array.from({ length: placeholders }, (_, i) => (
          <li key={i} className="@container relative">
            <Rail />
            <div className="mx-auto mt-10 aspect-[1/2.2] max-w-sm @min-[15rem]:aspect-[1/2] rounded-b-2xl bg-raised [clip-path:polygon(22%_0,78%_0,100%_44px,100%_100%,0_100%,0_44px)] motion-safe:animate-pulse" />
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

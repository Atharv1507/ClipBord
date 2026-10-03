import { Link } from 'react-router-dom'
import { useProductSearch } from '../hooks/useProducts'
import ProductResults from './ProductResults'

// The five newest pieces: the newest as the big 2×2 card, four beside it.
const LIMIT = 5

// Home page product section, with a link through to the whole shop.
function LatestDrop() {
  const results = useProductSearch('', { limit: LIMIT })

  return (
    <section id="new" aria-labelledby="new-title" aria-busy={results.status === 'loading'} className="scroll-mt-20 pt-[clamp(96px,10vw,150px)]">
      <div className="flex items-baseline justify-between px-4 pb-[22px] md:px-[clamp(16px,2.2vw,32px)]">
        <h2 id="new-title" className="text-[15px] font-semibold">New drop</h2>
        <Link to="/catalogue" className="text-sm text-fg-soft hover:text-fg hover:underline hover:underline-offset-[3px]">Shop all</Link>
      </div>
      <div className="px-4 md:px-[clamp(16px,2.2vw,32px)]">
        <ProductResults results={results} feature placeholders={LIMIT} />
      </div>
    </section>
  )
}

export default LatestDrop

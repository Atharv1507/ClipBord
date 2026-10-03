import { Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_TILES, categoryPath, plural } from '../utils/product'
import { Icon } from './Icons'

const TONES = {
  1: 'bg-tile-1 text-tile-1-fg',
  2: 'bg-tile-2 text-tile-2-fg',
  3: 'bg-tile-3 text-tile-3-fg',
}

// The category tiles: a campaign photo set into a colour block, the name and how many
// styles there are, and the category word oversized and cropped along the bottom.
// `exclude` leaves one out (the catalogue shows the other two under its grid).
function CategoryTiles({ exclude = null }) {
  // One tiny request just for the per-category counts.
  const { facets } = useProducts({ limit: 1 })
  const shown = CATEGORIES.filter((c) => c !== exclude)

  return (
    <div className={`grid grid-cols-1 gap-3 px-4 md:px-[clamp(16px,2.2vw,32px)] ${shown.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
      {shown.map((category) => {
        const tile = CATEGORY_TILES[category]
        const count = facets.category[category]
        return (
          <Link
            key={category}
            to={categoryPath(category)}
            className={`group relative flex flex-col overflow-hidden rounded-panel p-2 transition-colors duration-500 md:min-h-[520px] ${shown.length === 2 ? 'md:h-[min(70svh,640px)]' : 'md:h-[min(82svh,780px)]'} ${TONES[tile.tone]}`}
          >
            <div className="relative aspect-[5/4] overflow-hidden rounded-inner bg-photo md:aspect-auto md:min-h-0 md:flex-1">
              <img
                src={tile.photo}
                alt=""
                loading="lazy"
                style={{ objectPosition: tile.position }}
                className="h-full w-full object-cover transition-transform duration-[1400ms] ease-spring group-hover:scale-[1.04]"
              />
            </div>
            <div className="relative h-[190px] px-3 pt-[18px] md:h-[38%] md:min-h-[200px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{CATEGORY_LABELS[category]}</p>
                  <p className="text-[13px] opacity-80">{count !== undefined ? plural(count, 'style') : ' '}</p>
                </div>
                <span className="grid h-[46px] w-[46px] place-items-center rounded-full border-[1.5px] border-current transition-transform duration-500 ease-spring group-hover:-rotate-45">
                  <Icon name="arrow" className="h-[18px] w-[18px]" />
                </span>
              </div>
              <span aria-hidden="true" className="display pointer-events-none absolute -bottom-[.2em] left-[-.02em] whitespace-nowrap text-[clamp(110px,36vw,200px)] md:text-[clamp(120px,13.4vw,230px)]">
                {tile.word}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default CategoryTiles

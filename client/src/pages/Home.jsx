import { useRef } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Campaign from '../components/Campaign'
import LatestDrop from '../components/LatestDrop'
import PoolRack from '../components/PoolRack'
import CategoryTiles from '../components/CategoryTiles'
import Footer from '../components/Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

function Home() {
  // The hero's logo flies into this navbar logo as you scroll.
  const navLogoRef = useRef(null)
  useSmoothScroll()

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar logoRef={navLogoRef} />
      <main className="flex flex-1 flex-col">
        <Hero dockTargetRef={navLogoRef} />
        <Campaign />
        <LatestDrop />
        <PoolRack />
        <section aria-labelledby="categories-title" className="pt-[clamp(96px,10vw,150px)]">
          <h2 id="categories-title" className="px-4 pb-[22px] text-[15px] font-semibold md:px-[clamp(16px,2.2vw,32px)]">Shop by category</h2>
          <CategoryTiles />
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Home

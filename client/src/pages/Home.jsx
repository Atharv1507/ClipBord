import { useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import LatestDrop from '../components/LatestDrop'
import Footer from '../components/Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

function Home() {
  // Lives here because the navbar edits it and the product rail searches by it.
  const [query, setQuery] = useState('')
  // The hero's logo flies into this navbar logo as you scroll.
  const navLogoRef = useRef(null)
  useSmoothScroll()

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar query={query} onQueryChange={setQuery} logoRef={navLogoRef} />
      <main className="flex flex-1 flex-col">
        <Hero dockTargetRef={navLogoRef} />
        <LatestDrop query={query} onClearQuery={() => setQuery('')} />
      </main>
      <Footer />
    </div>
  )
}

export default Home

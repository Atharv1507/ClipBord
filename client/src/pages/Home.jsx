import { useCallback, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import ScrollVideo from '../components/ScrollVideo'
import LatestDrop from '../components/LatestDrop'
import Footer from '../components/Footer'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

function Home() {
  // Lives here because the navbar edits it and the product rail searches by it.
  const [query, setQuery] = useState('')
  // The hero's logo flies into this navbar logo as you scroll.
  const navLogoRef = useRef(null)
  // The hero's opening sketch waits until the film's loading splash lifts.
  const [introReady, setIntroReady] = useState(false)
  const handleSplashDone = useCallback(() => setIntroReady(true), [])
  useSmoothScroll()

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar query={query} onQueryChange={setQuery} logoRef={navLogoRef} />
      <main className="flex flex-1 flex-col">
        <Hero dockTargetRef={navLogoRef} introReady={introReady} />
        <ScrollVideo src="/videos/adhd-tee.mp4" onSplashDone={handleSplashDone} />
        <LatestDrop query={query} onClearQuery={() => setQuery('')} />
      </main>
      <Footer />
    </div>
  )
}

export default Home

import Monogram from '../Monogram'

// Fills the screen while the app checks who's logged in, so a guarded page doesn't
// flash the wrong thing (or redirect) before the answer comes back.
function PageLoader() {
  return (
    <div role="status" className="grid min-h-screen place-items-center bg-canvas text-fg">
      <Monogram label="" className="h-16 motion-safe:animate-pulse" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export default PageLoader

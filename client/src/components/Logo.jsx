import logoUrl from '../assets/clipbord-logo-black.svg'

// The logo file is used as a mask so it takes the text color (cream by default).
// The cream SVG has a dark box baked in, which would show against pure black.
const maskStyle = {
  maskImage: `url(${logoUrl})`,
  WebkitMaskImage: `url(${logoUrl})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'left center',
  WebkitMaskPosition: 'left center',
}

function Logo({ className = '', ref }) {
  return (
    <span
      ref={ref}
      role="img"
      aria-label="Clipbord"
      style={maskStyle}
      className={`block aspect-[1000/643] bg-current ${className}`}
    />
  )
}

export default Logo

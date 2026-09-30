import monogramUrl from '../assets/clipbord-monogram.svg'

// The CB monogram in its pill. Like Logo, the file is used as a mask so it takes the
// text color: ink on the paper tags, cream on black.
const maskStyle = {
  maskImage: `url(${monogramUrl})`,
  WebkitMaskImage: `url(${monogramUrl})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
}

function Monogram({ className = '', label = 'Clipbord' }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={maskStyle}
      className={`block aspect-[161/293] bg-current ${className}`}
    />
  )
}

export default Monogram

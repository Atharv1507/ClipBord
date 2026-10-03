import hoodieFront from '../assets/campaign/hoodie-front.jpg'
import teeBack from '../assets/campaign/tee-back.jpg'
import { Icon } from './Icons'

// The fold the hero logo reveals: two campaign photos edge to edge, then one line and
// one call to action. On phones only the first photo shows.
function Campaign() {
  return (
    <section aria-labelledby="campaign-title" className="relative z-[1]">
      <div className="grid grid-cols-1 md:h-[calc(100svh-var(--nav-h,68px)-196px)] md:min-h-[420px] md:grid-cols-2">
        <figure className="aspect-[4/5] overflow-hidden bg-photo md:aspect-auto">
          <img src={hoodieFront} alt="Model in the cream ADHD Pool Ball Hoodie, hands in the front pocket" className="h-full w-full object-cover object-[50%_24%]" />
        </figure>
        <figure className="hidden overflow-hidden bg-photo md:block">
          <img src={teeBack} alt="Back of the black Cue the Chaos Tee: red script above a pool cue" className="h-full w-full object-cover object-[50%_40%]" />
        </figure>
      </div>
      <div className="grid items-end gap-[18px] px-4 pb-[34px] pt-[30px] md:h-[196px] md:grid-cols-[1fr_auto] md:gap-6 md:px-[clamp(16px,2.2vw,32px)]">
        <h2 id="campaign-title" className="display pb-[.06em] text-[clamp(56px,7.6vw,118px)]">Cue the chaos.</h2>
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-6">
          <p className="max-w-[30ch] text-fg-soft">Pool-hall prints on hoodies, tees and joggers. The new drop, in cream and black.</p>
          <a href="#new" className="group inline-flex h-[52px] shrink-0 items-center gap-3 rounded-full bg-accent pl-6 pr-2 font-semibold text-on-accent transition-shadow hover:shadow-[0_10px_30px_-12px_var(--c-accent)] active:scale-[.98]">
            Shop the drop
            <span className="grid h-9 w-9 place-items-center rounded-full bg-on-accent/15 transition-transform duration-500 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px">
              <Icon name="arrow" className="h-4 w-4" />
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}

export default Campaign

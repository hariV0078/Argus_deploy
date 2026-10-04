import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../lib/gsap';
import { MEDIA } from '../lib/media';
import { Button } from '../components/Button';
import { Mark } from '../components/Mark';

export function Finale() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      // The plate grows from a card to full bleed, then the line rises.
      gsap.fromTo('.finale-media', { scale: 0.86, borderRadius: 48 }, { scale: 1, borderRadius: 0, ease: 'none', scrollTrigger: { trigger: '.finale-media', start: 'top bottom', end: 'top 15%', scrub: true } });
      gsap.fromTo('.finale-img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finale-media', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.finale-line > span', { yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.finale-media', start: 'top 45%' } });
      gsap.from('.finale-cta', { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.3, scrollTrigger: { trigger: '.finale-media', start: 'top 45%' } });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative pt-10">
      <div className="finale-media relative mx-auto flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-6">
        <img src={MEDIA.heroPoster} alt="" loading="lazy" className="finale-img absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_50%,rgba(6,8,11,0.25),rgba(6,8,11,0.92))]" />
        <div className="relative flex flex-col items-center text-center">
          <h2 className="text-[clamp(3.2rem,8vw,8rem)] leading-[0.96] font-medium tracking-[-0.05em]">
            <span className="finale-line block overflow-hidden pb-[0.06em]">
              <span className="block">Fly once.</span>
            </span>
            <span className="finale-line block overflow-hidden pb-[0.06em]">
              <span className="block text-signal">Measure everything.</span>
            </span>
          </h2>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <span className="finale-cta">
              <Button href="/runs" size="lg">
                Explore a run
              </Button>
            </span>
            <span className="finale-cta">
              <Button href="/report" variant="glass" size="lg">
                Field report
              </Button>
            </span>
          </div>
        </div>
      </div>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-10 font-mono text-xs tracking-wide md:px-14">
        <a href="#top" className="flex items-center gap-2.5 text-fg">
          <Mark size={20} className="text-signal" />
          ARGUS
        </a>
        <span>SIH 2026 · NTRO</span>
      </footer>
    </section>
  );
}

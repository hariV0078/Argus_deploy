import { useRef } from 'react';
import { Link005 } from '../../components/ui/skiper-ui/skiper40';
import { Button } from '../../components/Button';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { photo, PHOTOS, BACKEND_URL } from '../../lib/media';

export function ReportHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.rh-img', { scale: 1.12, filter: 'blur(10px) brightness(0.4)', duration: 2 }, 0)
        .from('.rh-line > span', { yPercent: 110, duration: 1.3, stagger: 0.1 }, 0.2)
        .from('.rh-fade', { y: 20, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.6);
      // A slow survey pass over the plate, the same scan light as the landing page.
      gsap.fromTo('.rh-scan', { top: '0%' }, { top: '100%', duration: 4.5, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.2 });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative px-6 pt-24 pb-16 md:pb-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="pt-8 lg:pt-0">
          <p className="rh-fade font-mono text-xs tracking-[0.2em] text-signal uppercase">Field report</p>
          <h1 className="mt-6 text-[clamp(2.5rem,4.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.04em]">
            <span className="rh-line block overflow-hidden pb-[0.08em]">
              <span className="block">Two flights,</span>
            </span>
            <span className="rh-line block overflow-hidden pb-[0.08em]">
              <span className="block text-fg/55 lg:whitespace-nowrap">measured end to end.</span>
            </span>
          </h1>
          <p className="rh-fade mt-7 max-w-lg text-lg leading-relaxed">
            Timings, accuracy and coverage from two real survey runs on one laptop GPU. Nothing below is simulated.
          </p>
          <div className="rh-fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Button href={`${BACKEND_URL}/docs`} size="lg">
              Run a survey
            </Button>
            <Link005 href="/#pipeline" className="py-1 text-base text-fg">
              How Argus works
            </Link005>
          </div>
        </div>

        <figure className="rh-fade relative aspect-[4/3] w-full overflow-hidden rounded-[28px] ring-1 ring-inset ring-line lg:aspect-auto lg:h-[min(76dvh,720px)]">
          <img
            className="rh-img size-full object-cover contrast-125 grayscale-[25%] brightness-90"
            src={photo(PHOTOS.rooftops, 1200, 1400)}
            alt="Dense town rooftops seen from directly above"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/20" />
          <div className="rh-scan scanline absolute inset-x-0 top-0" />
        </figure>
      </div>
    </section>
  );
}

import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../lib/gsap';
import { MEDIA } from '../lib/media';

const ITEMS = [
  { src: MEDIA.mesh, name: 'Textured mesh', fmt: 'OBJ · GLB · FBX', alt: 'Textured 3D city mesh, oblique view' },
  { src: MEDIA.dsm, name: 'Surface model', fmt: 'DSM · GeoTIFF', alt: 'Digital surface model, buildings coloured by height' },
  { src: MEDIA.ortho, name: 'True orthophoto', fmt: 'GeoTIFF', alt: 'True orthophoto of the surveyed area' },
];

export function Outputs() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.utils.toArray<HTMLElement>('.out-item').forEach((el, i) => {
        // Each render opens out of a smaller window as it scrolls in.
        gsap.fromTo(
          el.querySelector('.out-frame'),
          { clipPath: 'inset(14% 14% 14% 14% round 32px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: el, start: `top ${92 - i * 4}%`, end: 'top 45%', scrub: true } },
        );
        gsap.fromTo(el.querySelector('img'), { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.from(el.querySelector('figcaption'), { y: 20, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 60%' } });
      });
      gsap.from('.out-head > *', { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.out-head', start: 'top 80%' } });
    },
    { scope: root },
  );

  return (
    <section id="outputs" ref={root} className="relative scroll-mt-24 px-6 py-36 md:px-14 md:py-48">
      <div className="mx-auto max-w-7xl">
        <div className="out-head max-w-3xl">
          <p className="font-mono text-xs tracking-[0.2em] text-signal">01 — WHAT IT MAKES</p>
          <h2 className="mt-5 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.04em]">
            Footage in. <span className="text-fg/45">Measurable ground out.</span>
          </h2>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {ITEMS.map((it) => (
            <figure key={it.name} className="out-item">
              <div className="out-frame relative aspect-[4/5] overflow-hidden rounded-[24px] bg-ink-2 ring-1 ring-inset ring-line md:aspect-[4/5]">
                <img src={it.src} alt={it.alt} loading="lazy" className="absolute inset-0 size-full object-cover will-change-transform" />
              </div>
              <figcaption className="mt-5 flex items-baseline justify-between gap-4">
                <span className="text-xl text-fg">{it.name}</span>
                <span className="font-mono text-xs text-fg-2">{it.fmt}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 font-mono text-xs tracking-wide text-fg-2">+ dense point cloud · PLY · LAS</p>
      </div>
    </section>
  );
}

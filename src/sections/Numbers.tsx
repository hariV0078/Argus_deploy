import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../lib/gsap';

// Toledo run, backend/ARCHITECTURE.md. RMSE is agreement with onboard GPS.
const STATS = [
  { v: 14.9, dp: 1, unit: 'min', label: 'footage to model' },
  { v: 1.34, dp: 2, unit: 'm', label: 'RMSE against drone GPS' },
  { v: 0, dp: 0, unit: '', label: 'holes in the mesh' },
  { v: 0, dp: 0, unit: '', label: 'ground control points' },
];

export function Numbers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.num-cell', { y: 50, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } });
      gsap.from('.num-rule', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } });
      gsap.utils.toArray<HTMLElement>('.num-value').forEach((el, i) => {
        const { v, dp } = STATS[i];
        if (!v) return;
        const o = { n: v * 2.3 };
        gsap.to(o, {
          n: v,
          duration: 2,
          ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 75%' },
          onUpdate: () => (el.textContent = o.n.toFixed(dp)),
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="px-6 py-32 md:px-14 md:py-40">
      <dl className="mx-auto grid max-w-7xl gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="num-cell relative pt-7">
            <span className="num-rule absolute inset-x-0 top-0 h-px bg-white/15" />
            <dt className="sr-only">{s.label}</dt>
            <dd className="flex items-baseline gap-2 text-fg">
              <span className="num-value text-[clamp(4.5rem,7vw,6.5rem)] leading-[0.9] font-extralight tracking-[-0.06em] tabular-nums">{s.v.toFixed(s.dp)}</span>
              {s.unit && <span className="text-2xl font-light text-fg-2">{s.unit}</span>}
            </dd>
            <p aria-hidden="true" className="mt-4 text-[15px]">
              {s.label}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}

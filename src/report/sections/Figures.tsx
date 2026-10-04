import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { FIGURES } from '../data';

export function Figures() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.fig', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 85%' } });
      root.current?.querySelectorAll<HTMLElement>('.fig-value').forEach((el) => {
        const to = Number(el.dataset.to);
        const digits = Number(el.dataset.digits);
        const n = { v: 0 };
        gsap.to(n, {
          v: to,
          duration: 1.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 85%' },
          onUpdate: () => {
            el.textContent = n.v.toFixed(digits);
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label="Headline figures" className="px-6 py-12 md:py-16">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-10 lg:grid-cols-4 lg:gap-x-0">
        {FIGURES.map((f, i) => (
          <div key={f.label} className={`fig flex flex-col-reverse justify-end gap-3 lg:px-8 ${i ? 'lg:border-l lg:border-line' : 'lg:pl-0'}`}>
            <dt className="max-w-[22ch] text-[15px] leading-snug">{f.label}</dt>
            <dd className="flex items-baseline gap-2 text-fg">
              <span className="fig-value text-[clamp(3rem,4.6vw,4.5rem)] leading-none font-light tracking-[-0.05em]" data-to={f.value} data-digits={f.digits}>
                {f.value.toFixed(f.digits)}
              </span>
              <span className="text-xl font-light text-fg-3">{f.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import { useRef } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { VideoCamera, FilmStrip, Crosshair, Graph, Polygon, Export, ArrowRight } from '@phosphor-icons/react';
import { gsap, useGSAP, reducedMotion } from '../lib/gsap';

// Measured on the Toledo set (backend/ARCHITECTURE.md): 86 frames, RTX 5070 Laptop.
const PHASES: { icon: Icon; name: string; runs: string; s: number; time: string }[] = [
  { icon: FilmStrip, name: 'Ingestion', runs: 'CPU', s: 10, time: '10 s' },
  { icon: Crosshair, name: 'Masking', runs: 'GPU', s: 44, time: '44 s' },
  { icon: Graph, name: 'Structure from motion', runs: 'GPU', s: 126, time: '2 min 6 s' },
  { icon: Polygon, name: 'Dense surface', runs: 'GPU', s: 670, time: '11 min 10 s' },
  { icon: Export, name: 'Export', runs: 'CPU', s: 33, time: '33 s' },
];
const HOT = 3; // the phase that dominates the run
const TOTAL = PHASES.reduce((a, p) => a + p.s, 0);

export function Architecture() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.arch-head > *', { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.arch-head', start: 'top 80%' } });

      // The flow assembles left to right as it is scrolled through.
      const flow = gsap.timeline({ scrollTrigger: { trigger: '.arch-flow', start: 'top 90%', end: 'top 55%', scrub: 0.6 } });
      flow
        .fromTo('.arch-wire', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)
        .from('.arch-node', { y: 50, autoAlpha: 0, scale: 0.92, ease: 'power3.out', duration: 0.35, stagger: 0.11 }, 0);

      gsap.fromTo('.arch-hot', { boxShadow: '0 0 0 rgba(61,220,255,0)' }, { boxShadow: '0 0 60px rgba(61,220,255,0.28)', duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true });

      // Time bar: each segment grows in turn, then the share count runs up.
      const bar = gsap.timeline({ scrollTrigger: { trigger: '.arch-bar', start: 'top 95%', end: 'top 75%', scrub: 0.6 } });
      bar.from('.arch-seg', { scaleX: 0, transformOrigin: 'left center', ease: 'power2.out', stagger: 0.12 });
      const share = { v: 0 };
      bar.to(share, { v: Math.round((PHASES[HOT].s / TOTAL) * 100), ease: 'none', onUpdate: () => {
        const el = root.current?.querySelector('.arch-share');
        if (el) el.textContent = `${Math.round(share.v)}%`;
      } }, '<0.2');
    },
    { scope: root },
  );

  return (
    <section id="architecture" ref={root} className="relative scroll-mt-24 border-y border-white/[0.06] bg-ink-2 px-6 py-36 md:px-14 md:py-48">
      <div className="survey-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative mx-auto max-w-7xl">
        <div className="arch-head flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-signal">02 — ARCHITECTURE</p>
            <h2 className="mt-5 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.04em]">
              Five phases. <span className="text-fg/45">One laptop GPU.</span>
            </h2>
          </div>
          <a href="/runs" className="group inline-flex min-h-11 items-center gap-2 font-mono text-sm text-fg transition-colors hover:text-signal">
            See a real run
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <div className="arch-flow relative mt-20">
          {/* The wire every phase sits on */}
          <span className="arch-wire absolute top-1/2 right-6 left-6 hidden h-px origin-left bg-gradient-to-r from-white/20 via-signal to-white/20 lg:block" aria-hidden="true" />
          <ol className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <li className="arch-node flex min-h-44 flex-col justify-between rounded-[20px] border border-dashed border-white/25 bg-ink-2 p-5">
              <VideoCamera size={26} weight="light" className="text-fg-2" />
              <div>
                <p className="text-lg leading-tight text-fg">Drone video</p>
                <p className="mt-1.5 font-mono text-xs text-fg-2">MP4 + SRT</p>
              </div>
            </li>
            {PHASES.map((p, i) => (
              <li
                key={p.name}
                className={`arch-node flex min-h-44 flex-col justify-between rounded-[20px] bg-surface p-5 ring-1 ring-inset ${i === HOT ? 'arch-hot ring-signal' : 'ring-line'}`}
              >
                <div className="flex items-center justify-between">
                  <p.icon size={26} weight="light" className="text-signal" />
                  <span className="font-mono text-[11px] text-fg-3">0{i + 1}</span>
                </div>
                <div>
                  <p className="text-lg leading-tight text-fg">{p.name}</p>
                  <p className="mt-1.5 font-mono text-xs text-fg-2">
                    {p.runs} · {p.time}
                  </p>
                </div>
              </li>
            ))}
            <li className="arch-node flex min-h-44 flex-col justify-between rounded-[20px] bg-fg p-5 text-ink">
              <Polygon size={26} weight="fill" />
              <div>
                <p className="text-lg leading-tight font-medium">3D model</p>
                <p className="mt-1.5 font-mono text-xs text-ink/70">mesh · cloud · DSM · ortho</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="arch-bar mt-16">
          <div className="flex items-baseline justify-between gap-4 font-mono text-xs tracking-wide">
            <span className="text-fg-2">WHERE THE TIME GOES</span>
            <span className="text-fg">14.9 min</span>
          </div>
          <div className="mt-4 flex h-14 gap-1">
            {PHASES.map((p, i) => (
              <div
                key={p.name}
                title={`${p.name}: ${p.time}`}
                className="arch-seg flex min-w-2.5 items-center overflow-hidden rounded-lg bg-signal px-4 font-mono text-[13px] whitespace-nowrap text-signal-ink"
                style={{ flex: `${p.s} 1 0`, opacity: i === HOT ? 1 : 0.3 + i * 0.08 }}
              >
                {i === HOT && (
                  <>
                    Dense surface ·&nbsp;<span className="arch-share">75%</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

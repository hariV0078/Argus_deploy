import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '../lib/gsap';
import { HERO_SEQ } from '../lib/media';
import { createRenderer, frameUrl, loadSequence } from '../lib/frameSequence';
import { Button } from '../components/Button';

// What the clip shows at each third of the scrub.
const STEPS = [
  { name: 'Footage', sub: 'one pass, every frame geotagged' },
  { name: 'Geometry', sub: 'cameras posed, surface triangulated' },
  { name: 'Model', sub: 'mesh, point cloud, DSM, orthophoto' },
];
const WORD = 'Argus'.split('');

// Phones (and small low-DPR windows) get the 960 px set.
const seqBase = () => (window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= 1100 ? HERO_SEQ.sm : HERO_SEQ.lg);

// Pinned for ~2.6 screens. Scroll drives an image sequence frame by frame; the
// copy hands off from the opening line to three step captions to the wordmark.
// Everything animated is transform or opacity, so it stays on the compositor.
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const el = canvas.current!;
      const base = seqBase();
      const last = HERO_SEQ.count - 1;
      el.style.backgroundImage = `url(${frameUrl(base, 0)})`; // shows before the first paint
      const mm = gsap.matchMedia();

      mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
        const reduce = ctx.conditions?.reduce;
        // Reduced motion needs only the finished model.
        const seq = loadSequence(base, HERO_SEQ.count, reduce ? { only: [last] } : {});
        const paint = createRenderer(el, seq);
        const playhead = { frame: reduce ? last : 0 };

        // One draw per display frame at most, and only when the index changes.
        const tick = () => paint.draw(Math.round(playhead.frame));
        gsap.ticker.add(tick);
        const ro = new ResizeObserver(() => paint.resize());
        ro.observe(el);

        const cleanup = () => {
          gsap.ticker.remove(tick);
          ro.disconnect();
          seq.dispose();
        };

        if (reduce) {
          gsap.set('.hero-intro, .hero-step, .hero-hint', { autoAlpha: 0 });
          gsap.set('.hero-dim', { opacity: 0.45 });
          el.style.backgroundImage = `url(${frameUrl(base, last)})`;
          return cleanup;
        }

        // Entrance, once: the plate settles in from a slight zoom as a veil lifts
        // (opacity on an overlay instead of animating filter: brightness/blur).
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .fromTo('.hero-veil', { opacity: 1 }, { opacity: 0, duration: 1.8, ease: 'power2.out' }, 0)
          .from('.hero-plate', { scale: 1.18, duration: 2.6 }, 0)
          .from('.hero-intro-line > span', { yPercent: 115, duration: 1.4, stagger: 0.12 }, 0.35)
          .from('.hero-hint', { autoAlpha: 0, y: 12, duration: 1 }, 1.1)
          .fromTo('.hero-scan', { y: 0, autoAlpha: 1 }, { y: () => window.innerHeight, duration: 2.2, ease: 'power2.inOut' }, 0.2)
          .to('.hero-scan', { autoAlpha: 0, duration: 0.3 }, 2.2);

        // Scroll. Timeline units are arbitrary: 10 = the whole pin. The frame
        // tween is linear (it is time in the clip); scrub: 1 adds a short
        // catch-up so a flicked wheel glides instead of jumping.
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root.current, start: 'top top', end: '+=260%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
        });

        tl.to(playhead, { frame: last, duration: 7.4 }, 0)
          .fromTo('.hero-plate-scroll', { scale: 1.12 }, { scale: 1, duration: 7.4 }, 0)
          .to('.hero-hint', { autoAlpha: 0, duration: 0.5 }, 0)
          .to('.hero-intro', { autoAlpha: 0, y: -90, scale: 0.96, duration: 1.2, ease: 'power2.in' }, 0.1)
          .fromTo('.hero-rail-fill', { scaleY: 0 }, { scaleY: 1, duration: 10 }, 0);

        gsap.utils.toArray<HTMLElement>('.hero-step').forEach((step, i) => {
          const at = 1.1 + i * 2.15;
          tl.fromTo(step, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' }, at)
            .to(step, { autoAlpha: 0, y: -48, duration: 0.5, ease: 'power3.in' }, at + 1.6)
            .fromTo(`.hero-tick-${i}`, { opacity: 0.35 }, { opacity: 1, duration: 0.2 }, at);
        });

        tl.to('.hero-dim', { opacity: 0.5, duration: 1.6, ease: 'power1.inOut' }, 7.2)
          .fromTo('.hero-letter', { yPercent: 135 }, { yPercent: 0, duration: 1.3, stagger: 0.14, ease: 'expo.out' }, 7.5)
          .fromTo('.hero-tag', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 8.6)
          .fromTo('.hero-cta', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 8.9)
          .to({}, { duration: 0.6 });

        // Layers that move get their own GPU layer only while the hero is on
        // screen; promoting them for the whole page wastes video memory.
        const layers = gsap.utils.toArray<HTMLElement>('.hero-plate, .hero-plate-scroll, .hero-intro, .hero-step, .hero-letter');
        const promote = ScrollTrigger.create({
          trigger: root.current,
          start: 'top bottom',
          end: () => `+=${window.innerHeight * 3.6 + 1}`,
          onToggle: (self) => gsap.set(layers, { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
        });

        return () => {
          promote.kill();
          cleanup();
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="top" ref={root} className="relative isolate h-[100svh] overflow-hidden bg-ink [contain:layout_paint]">
      <div className="hero-plate absolute inset-0 -z-10">
        <div className="hero-plate-scroll absolute inset-0">
          <canvas ref={canvas} aria-hidden="true" className="block size-full bg-ink bg-cover bg-center" />
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(85%_70%_at_55%_40%,rgba(6,8,11,0)_0%,rgba(6,8,11,0.55)_70%,#06080b_100%)]" />
      <div className="hero-dim absolute inset-0 -z-10 bg-ink opacity-0" />
      <div className="hero-veil absolute inset-0 -z-10 bg-ink opacity-0" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-ink to-transparent" />
      <div className="hero-scan scanline pointer-events-none absolute inset-x-0 top-0 opacity-0" />

      {/* Opening line */}
      <div className="hero-intro absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="hero-intro-line overflow-hidden font-mono text-xs tracking-[0.3em] text-signal uppercase">
          <span className="block">SIH 2026 · PS 17</span>
        </p>
        <p className="mt-6 text-[clamp(3rem,7vw,7rem)] leading-[0.95] font-medium tracking-[-0.045em] text-fg">
          <span className="hero-intro-line block overflow-hidden pb-[0.06em]">
            <span className="block">One drone pass.</span>
          </span>
          <span className="hero-intro-line block overflow-hidden pb-[0.06em]">
            <span className="block text-fg/50">One 3D model.</span>
          </span>
        </p>
      </div>

      {/* Step captions, one per third of the clip */}
      <div className="absolute bottom-14 left-6 md:left-14">
        {STEPS.map((s, i) => (
          <div key={s.name} className="hero-step invisible absolute bottom-0 left-0 w-[80vw] max-w-lg opacity-0">
            <p className="font-mono text-xs tracking-[0.2em] text-signal">0{i + 1} / 03</p>
            <p className="mt-3 text-[clamp(2.75rem,6vw,5.5rem)] leading-none font-medium tracking-[-0.045em] text-fg">{s.name}</p>
            <p className="mt-4 font-mono text-sm text-fg-2">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress rail */}
      <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 items-center gap-4 md:right-14 md:flex" aria-hidden="true">
        <ol className="flex h-56 flex-col justify-between font-mono text-[11px] text-signal">
          {STEPS.map((s, i) => (
            <li key={s.name} className={`hero-tick-${i} opacity-35`}>
              0{i + 1}
            </li>
          ))}
        </ol>
        <span className="relative block h-56 w-px bg-white/15">
          <span className="hero-rail-fill absolute inset-0 origin-top scale-y-0 bg-signal shadow-[0_0_10px_rgba(61,220,255,0.7)]" />
        </span>
      </div>

      <div className="hero-hint absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 font-mono text-[11px] tracking-[0.25em] text-fg-2 uppercase">
        Scroll
        <span className="relative block h-10 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[hint_1.8s_ease-in-out_infinite] bg-signal" />
        </span>
      </div>

      {/* Wordmark, revealed as the model completes */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-6 pb-14 md:px-14">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h1 aria-label="Argus" className="-mb-[0.12em] overflow-hidden pb-[0.16em] text-[clamp(6rem,19vw,17rem)] leading-[0.8] font-medium tracking-[-0.065em] text-fg">
            {WORD.map((c, i) => (
              <span key={i} aria-hidden="true" className="hero-letter inline-block">
                {c}
              </span>
            ))}
          </h1>
          <div className="pointer-events-auto max-w-sm pb-3">
            <p className="hero-tag text-2xl leading-snug font-light text-fg motion-safe:invisible">
              Drone video in.
              <br />
              Georeferenced 3D out.
            </p>
            <div className="hero-cta mt-7 motion-safe:invisible">
              <Button href="/runs" size="lg">
                Explore a run
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import runs from 'virtual:runs';
import { Nav } from '../components/Nav';
import { gsap, useGSAP, reducedMotion } from '../lib/gsap';
import { useSmoothScroll } from '../lib/useSmoothScroll';
import { HEADLINE } from '../lib/figures';
import { FlightVideo } from './FlightVideo';
import { MeshViewer } from './MeshViewer';
import { AccuracyPanel, Files, MeshPanel, Previews, TimingRibbon } from './RunPanels';
import { formatBytes, formatDuration } from './format';
import type { Run } from './types';

// The run is in the URL hash (#RUN_2) so a link opens the same run.
// YouTube id of the drone footage behind the run.
const FLIGHT_VIDEO = 'UZuFwuswWKQ';

const fromHash = () => runs.findIndex((r) => r.id === decodeURIComponent(location.hash.slice(1)));

const LINKS = [
  { href: '#model', label: 'Model' },
  { href: '#flight', label: 'Flight' },
  { href: '#time', label: 'Time' },
  { href: '#maps', label: 'Maps' },
  { href: '#files', label: 'Files' },
];

function coords(run: Run) {
  const w = run.origin?.wgs84;
  if (!w) return null;
  return [`${w.lat.toFixed(4)}° ${w.lat < 0 ? 'S' : 'N'}`, `${Math.abs(w.lon).toFixed(4)}° ${w.lon < 0 ? 'W' : 'E'}`];
}

// Headline figures for the header; each counts up on load. Time and RMSE are
// the landing page's figures (lib/figures.ts) so the two pages agree.
function stats(run: Run) {
  const out: { v: number; dp: number; unit: string; label: string }[] = [];
  out.push({ v: HEADLINE.minutes, dp: 1, unit: 'min', label: 'footage to model' });
  out.push({ v: HEADLINE.rmseM, dp: 2, unit: 'm', label: 'RMSE vs GPS' });
  if (run.meshStats) out.push({ v: run.meshStats.faces / 1e6, dp: 1, unit: 'M', label: 'mesh faces' });
  if (run.meshStats) out.push({ v: run.meshStats.interior_holes, dp: 0, unit: '', label: 'holes left' });
  return out;
}

export default function RunsPage() {
  useSmoothScroll();
  const [i, setI] = useState(() => Math.max(0, fromHash()));
  const run = runs[i];
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Argus runs';
    const on = () => fromHash() >= 0 && setI(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useGSAP(
    () => {
      if (!run || reducedMotion()) return;

      // Header: plate resolves out of the dark, a scan line sweeps, copy rises.
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.rh-plate', { scale: 1.3, autoAlpha: 0, filter: 'blur(14px)', duration: 2.6 }, 0)
        .fromTo('.rh-scan', { y: 0, autoAlpha: 1 }, { y: () => (root.current?.querySelector('.rh')?.clientHeight ?? 800), duration: 2.4, ease: 'power2.inOut' }, 0.1)
        .to('.rh-scan', { autoAlpha: 0, duration: 0.3 }, 2.4)
        .from('.rh-line > span', { yPercent: 115, duration: 1.4, stagger: 0.1 }, 0.25)
        .from('.rh-fade', { y: 24, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.6)
        .from('.rh-stat', { y: 40, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 0.7)
        .from('.rh-rule', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, stagger: 0.08 }, 0.7);

      gsap.utils.toArray<HTMLElement>('.rh-num').forEach((el) => {
        const to = Number(el.dataset.to);
        const dp = Number(el.dataset.dp);
        if (!to) return;
        const o = { n: 0 };
        gsap.to(o, { n: to, duration: 2.2, delay: 0.7, ease: 'power3.out', onUpdate: () => (el.textContent = o.n.toFixed(dp)) });
      });

      // Header drifts away under the viewer.
      gsap.to('.rh-plate', { yPercent: 16, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.rh', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.rh-copy', { y: -90, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: '.rh', start: '30% top', end: 'bottom top', scrub: true } });

      // Viewer grows into place; its HUD corners snap in.
      gsap.fromTo('.rv-frame', { scale: 0.9, y: 60 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.rv-frame', start: 'top bottom', end: 'top 25%', scrub: true } });
      gsap.from('.rv-corner', { scale: 1.8, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.rv-frame', start: 'top 55%' } });

      gsap.from('.rf-frame', { y: 80, scale: 0.94, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.rf-frame', start: 'top 85%' } });

      gsap.utils.toArray<HTMLElement>('.rs-head').forEach((el) =>
        gsap.from(el.children, { y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 82%' } }),
      );

      // Time ribbon: segments sweep out in run order, then the budget line drops.
      const rib = gsap.timeline({ scrollTrigger: { trigger: '.ribbon', start: 'top 80%' } });
      rib
        .from('.ribbon-seg', { scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'power3.inOut', stagger: 0.35 })
        .from('.ribbon-label', { y: 16, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1 }, 0.4)
        .from('.ribbon-budget', { scaleY: 0, transformOrigin: 'top center', duration: 0.8, ease: 'expo.out' }, '-=0.3');

      gsap.from('.run-panel', { y: 50, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.run-panels', start: 'top 82%' } });
      gsap.from('.run-bar', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.out', stagger: 0.05, delay: 0.3, scrollTrigger: { trigger: '.run-panels', start: 'top 82%' } });
      gsap.from('.run-files', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '#files', start: 'top 80%' } });
    },
    { scope: root, dependencies: [run?.id], revertOnUpdate: true },
  );

  const total = run ? run.files.reduce((s, f) => s + f.bytes, 0) : 0;
  const where = run ? coords(run) : null;
  const ortho = run?.files.some((f) => f.path === 'previews/orthophoto.jpg') ? `${run.base}previews/orthophoto.jpg` : null;

  return (
    <div ref={root} className="grain">
      <Nav links={LINKS} home="/" cta={{ href: '/report', label: 'Field report' }} />

      {!run ? (
        <main className="grid min-h-[100dvh] place-items-center px-6 text-center">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">No runs yet.</h1>
            <p className="mt-3">
              Copy a finished run into <code className="font-mono text-fg">frontend_mk2/Output/RUN_1/</code> and reload.
            </p>
          </div>
        </main>
      ) : (
        <main className="w-full max-w-full overflow-x-hidden">
          {/* Header: the run's own orthophoto as the plate */}
          <header className="rh relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden px-6 pt-32 pb-14 md:px-14">
            {ortho && (
              <img src={ortho} alt="" className="rh-plate absolute inset-0 -z-10 size-full object-cover opacity-55 saturate-[0.85] will-change-transform" />
            )}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_70%_30%,rgba(6,8,11,0.1),rgba(6,8,11,0.75)_60%,#06080b)]" />
            <div className="survey-grid absolute inset-0 -z-10 opacity-70" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-ink to-transparent" />
            <div className="rh-scan scanline pointer-events-none absolute inset-x-0 top-0 opacity-0" />

            <div className="rh-copy mx-auto w-full max-w-7xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="rh-fade font-mono text-xs tracking-[0.25em] text-signal uppercase">
                  {run.id.replace('_', ' ')} · {run.timings ? `${run.timings.frames_used} frames` : 'run'}
                  {run.bounds ? ` · EPSG:${run.bounds.epsg}` : ''}
                </p>
                {runs.length > 1 && (
                  <div role="tablist" aria-label="Runs" className="rh-fade flex flex-wrap gap-1 rounded-full bg-ink/60 p-1 ring-1 ring-inset ring-line backdrop-blur-xl">
                    {runs.map((r, j) => (
                      <a
                        key={r.id}
                        role="tab"
                        aria-selected={j === i}
                        href={`#${encodeURIComponent(r.id)}`}
                        className={`rounded-full px-4 py-2 text-sm transition-colors ${j === i ? 'bg-fg text-ink' : 'text-fg-2 hover:bg-white/[0.06] hover:text-fg'}`}
                      >
                        {r.id.replace('_', ' ')}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <h1 className="mt-6 text-[clamp(3rem,8.5vw,8.5rem)] leading-[0.9] font-medium tracking-[-0.055em] tabular-nums">
                {where ? (
                  <>
                    <span className="rh-line block overflow-hidden pb-[0.05em]">
                      <span className="block">{where[0]}</span>
                    </span>
                    <span className="rh-line block overflow-hidden pb-[0.05em]">
                      <span className="block text-fg/45">{where[1]}</span>
                    </span>
                  </>
                ) : (
                  <span className="rh-line block overflow-hidden">
                    <span className="block">{run.id}</span>
                  </span>
                )}
              </h1>

              <dl className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
                {stats(run).map((s) => (
                  <div key={s.label} className="rh-stat relative pt-5">
                    <span className="rh-rule absolute inset-x-0 top-0 h-px bg-white/20" />
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="flex items-baseline gap-1.5 text-fg">
                      <span className="rh-num text-[clamp(2.75rem,4.5vw,4.25rem)] leading-none font-extralight tracking-[-0.05em] tabular-nums" data-to={s.v} data-dp={s.dp}>
                        {s.v.toFixed(s.dp)}
                      </span>
                      {s.unit && <span className="text-lg font-light text-fg-2">{s.unit}</span>}
                    </dd>
                    <p aria-hidden="true" className="mt-2 font-mono text-xs text-fg-2">
                      {s.label}
                    </p>
                  </div>
                ))}
              </dl>
            </div>
          </header>

          {/* Model */}
          <section id="model" className="scroll-mt-24 px-4 pt-10 sm:px-6 md:px-14">
            <div className="rv-frame relative mx-auto max-w-[1440px] will-change-transform">
              {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
                <span key={c} aria-hidden="true" className={`rv-corner pointer-events-none absolute z-10 size-7 -m-2.5 border-signal ${c}`} />
              ))}
              <MeshViewer key={run.id} run={run} />
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            {/* Flight: the footage this run was built from */}
            <section id="flight" className="mt-36 scroll-mt-28">
              <div className="rs-head">
                <p className="font-mono text-xs tracking-[0.2em] text-signal">01 — FLIGHT</p>
                <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.02] font-medium tracking-[-0.04em]">
                  The footage in. <span className="text-fg/45">The model above out.</span>
                </h2>
              </div>
              <div className="rf-frame mt-12">
                <FlightVideo id={FLIGHT_VIDEO} title="Sample input used in 3D reconstruction from drone video" fallback={ortho ?? undefined} />
              </div>
            </section>

            {/* Time */}
            <section id="time" className="mt-36 scroll-mt-28">
              <div className="rs-head flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-signal">02 — TIME</p>
                  <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.02] font-medium tracking-[-0.04em]">
                    {run.timings ? formatDuration(run.timings.total_s) : 'Timing'}{' '}
                    {run.timings && <span className="text-fg/45">{run.timings.total_s <= run.timings.budget_s ? 'inside' : 'over'} the budget.</span>}
                  </h2>
                </div>
              </div>
              <div className="mt-12">
                <TimingRibbon run={run} />
              </div>
            </section>

            <div className="run-panels mt-8 grid gap-6 lg:grid-cols-2">
              <AccuracyPanel run={run} />
              <MeshPanel run={run} />
            </div>

            {/* Maps */}
            <section id="maps" className="mt-36 scroll-mt-28">
              <div className="rs-head">
                <p className="font-mono text-xs tracking-[0.2em] text-signal">03 — MAPS</p>
                <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.02] font-medium tracking-[-0.04em]">
                  Drag the split. <span className="text-fg/45">Compare any two.</span>
                </h2>
              </div>
              <div className="mt-12">
                <Previews key={run.id} run={run} />
              </div>
            </section>

            {/* Files */}
            <section id="files" className="mt-36 scroll-mt-28 pb-28">
              <div className="rs-head flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-signal">04 — FILES</p>
                  <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.02] font-medium tracking-[-0.04em]">Every file from the run.</h2>
                </div>
                <p className="font-mono text-sm text-fg-2">
                  {run.files.length} files · {formatBytes(total)}
                </p>
              </div>
              <div className="mt-12">
                <Files run={run} />
              </div>
            </section>
          </div>

          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 font-mono text-xs sm:px-6">
              <a href="/" className="text-fg transition-colors hover:text-signal">
                ← Argus
              </a>
              <a href="/report" className="text-fg transition-colors hover:text-signal">
                Field report →
              </a>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}

import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { ACCURACY, CHART } from '../data';
import { ChartTable, Legend, Tip } from '../chart';
import { tipAlign, useHover } from '../hover';

const AXIS_MAX = 4.8;
const TICKS = [0, 1, 2, 3, 4];
const pct = (m: number) => `${(m / AXIS_MAX) * 100}%`;
const SERIES = [
  { key: 'h', label: 'Horizontal RMSE', color: CHART.a },
  { key: 'v', label: 'Vertical RMSE', color: CHART.b },
] as const;
// Label the shipped configuration and the worst value; axis, tooltip and table carry the rest.
const WORST = Math.max(...ACCURACY.map((r) => r.v));
const labelled = (row: number, value: number) => row === 0 || value === WORST;

export function Accuracy() {
  const root = useRef<HTMLElement>(null);
  const [hover, bind] = useHover<string>();

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.acc-bar', { scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.acc-plot', start: 'top 75%' } });
      gsap.from('.acc-callout', { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.acc-callout', start: 'top 85%' } });
    },
    { scope: root },
  );

  return (
    <section id="accuracy" ref={root} className="relative px-6 py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl text-[clamp(2.4rem,4.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.035em]">
          Agreement with the drone's own GPS.
        </h2>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed">
          Camera centres after alignment, against onboard GNSS. This is agreement, not certified accuracy: that needs ground control points.
        </p>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.7fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <Legend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />

            <div className="acc-plot mt-8 grid gap-y-6">
              {ACCURACY.map((row, r) => (
                <div key={row.label} className="grid gap-2 md:grid-cols-[14rem_1fr] md:items-center md:gap-8">
                  <div>
                    <p className={`text-[15px] ${r === 0 ? 'text-fg' : ''}`}>{row.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-fg-3">{row.note}</p>
                  </div>
                  <div className="relative">
                    <div aria-hidden="true" className="pointer-events-none absolute -inset-y-3 left-0 w-full">
                      {TICKS.map((t) => (
                        <span key={t} className={`absolute inset-y-0 w-px ${t === 1 ? 'bg-fg/35' : 'bg-line'}`} style={{ left: pct(t) }} />
                      ))}
                    </div>
                    {SERIES.map((s) => {
                      const v = row[s.key];
                      const key = `${r}-${s.key}`;
                      return (
                        <div key={s.key} {...bind(key)} aria-label={`${row.label}, ${s.label}: ${v} m`} className="relative flex h-6 items-center outline-none">
                          <div className="acc-bar relative h-3 rounded-r-[4px]" style={{ width: pct(v), background: s.color }}>
                            {hover === key && <Tip align={tipAlign(v / AXIS_MAX)} title={s.label} lines={[`${v} m`, row.note]} />}
                          </div>
                          {labelled(r, v) && <span className="ml-2 font-mono text-xs whitespace-nowrap text-fg">{v} m</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="grid md:grid-cols-[14rem_1fr] md:gap-8">
                <span className="hidden md:block" />
                <div className="relative h-6 font-mono text-[11px] text-fg-3">
                  {TICKS.map((t) => (
                    <span key={t} className={`absolute top-0 -translate-x-1/2 ${t === 1 ? 'text-fg-2' : ''}`} style={{ left: pct(t) }}>
                      {t} m
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed">
              The brighter line marks 1 m. Getting below it needs ground control points or RTK, not a better solver.
            </p>

            <ChartTable
              caption="Camera centre RMSE against onboard GPS, by configuration"
              head={['Configuration', 'Horizontal (m)', 'Vertical (m)']}
              rows={ACCURACY.map((r) => [`${r.label} (${r.note})`, r.h, r.v])}
            />
          </div>

          <aside className="acc-callout self-start rounded-[28px] bg-surface p-8 ring-1 ring-inset ring-line md:p-10">
            <p className="flex items-baseline gap-2 text-fg">
              <span className="text-[clamp(3.5rem,6vw,5rem)] leading-none font-light tracking-[-0.05em]">37-39</span>
              <span className="text-xl font-light text-fg-3">m</span>
            </p>
            <p className="mt-5 text-[15px] leading-relaxed">
              What global SfM alone gave on Toledo, on every seed, while every frame registered and the reprojection error looked fine.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-fg">
              Argus now fits each global model to GPS before dense stereo. Above 10 m RMSE it switches to incremental SfM.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

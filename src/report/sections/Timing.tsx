import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { BUDGET_MIN, CHART, RUNS, STAGES, STEREO } from '../data';
import { ChartTable, Legend, Tip } from '../chart';
import { starts, tipAlign, useHover } from '../hover';

// Axis runs past the longest run so its end label has room.
const AXIS_MAX = 25;
const TICKS = [0, 5, 10, 15, 20];
const pct = (m: number) => `${(m / AXIS_MAX) * 100}%`;

function Gridlines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-full">
      {TICKS.map((t) => (
        <span key={t} className={`absolute inset-y-0 w-px ${t === BUDGET_MIN ? '' : 'bg-line'}`} style={{ left: pct(t) }} />
      ))}
    </div>
  );
}

// Drawn after the bar so it sits on top: the overrun has to read at a glance.
function BudgetLine() {
  return <span aria-hidden="true" className="budget pointer-events-none absolute inset-y-0 w-px bg-fg/70" style={{ left: pct(BUDGET_MIN) }} />;
}

export function Timing() {
  const root = useRef<HTMLElement>(null);
  const [hover, bind] = useHover<string>();

  useGSAP(
    () => {
      if (reducedMotion()) return;
      // Segments build in pipeline order, one run after the other.
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.runs', start: 'top 75%' } });
      tl.from('.seg-fill', { scaleX: 0, transformOrigin: 'left center', duration: 0.5, ease: 'power2.out', stagger: 0.07 })
        .from('.run-total', { autoAlpha: 0, x: -8, duration: 0.6, ease: 'expo.out', stagger: 0.1 }, '-=0.3')
        .from('.budget', { autoAlpha: 0, duration: 0.8 }, '<');
    },
    { scope: root },
  );

  return (
    <section id="timing" ref={root} className="relative px-6 py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl text-[clamp(2.4rem,4.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.035em]">Where the minutes go.</h2>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed">
          Dense stereo is the largest stage in both runs, so its resolution is fitted to whatever time the earlier stages leave.
        </p>

        <div className="mt-12">
          <Legend
            items={[
              { label: 'Dense stereo', color: CHART.a },
              { label: 'Every other stage', color: CHART.rest },
            ]}
          />
        </div>

        <div className="runs mt-10 grid gap-y-8">
          {RUNS.map((run) => {
            const at = starts(run.minutes);
            return (
              <div key={run.id} className="grid gap-3 md:grid-cols-[13rem_1fr] md:items-center md:gap-8">
                <div>
                  <p className="flex items-baseline justify-between gap-4 font-medium text-fg">
                    {run.name}
                    <span className="font-mono text-sm font-normal md:hidden">{run.total} min</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-fg-3">{run.detail}</p>
                </div>
                <div className="relative">
                  <Gridlines />
                  <div className="relative flex h-12 items-center gap-[2px]" style={{ width: pct(run.total) }}>
                    {run.minutes.map((m, i) => {
                      const key = `${run.id}-${i}`;
                      return (
                        <div
                          key={key}
                          {...bind(key)}
                          aria-label={`${run.name}, ${STAGES[i]}: ${m} minutes`}
                          className="relative flex h-full items-center outline-none"
                          style={{ flexGrow: m, flexBasis: 0, minWidth: 3 }}
                        >
                          <div
                            className={`seg-fill flex h-6 w-full items-center overflow-visible ${i === run.minutes.length - 1 ? 'rounded-r-[4px]' : ''}`}
                            style={{ background: i === STEREO ? CHART.a : CHART.rest }}
                          >
                            {i === STEREO && <span className="px-2.5 font-mono text-[11px] font-medium whitespace-nowrap text-signal-ink">{m} min</span>}
                          </div>
                          {hover === key && (
                            <Tip
                              align={tipAlign(at[i] / AXIS_MAX)}
                              title={STAGES[i]}
                              lines={[`${m} min`, `${Math.round((m / run.total) * 100)}% of the run`]}
                            />
                          )}
                        </div>
                      );
                    })}
                    <span className="run-total absolute left-full ml-3 hidden font-mono md:block text-sm whitespace-nowrap text-fg">{run.total} min</span>
                  </div>
                  <BudgetLine />
                </div>
              </div>
            );
          })}

          <div className="grid md:grid-cols-[13rem_1fr] md:gap-8">
            <span className="hidden md:block" />
            <div className="relative h-6 font-mono text-[11px] text-fg-3">
              {TICKS.map((t) => (
                <span key={t} className={`absolute top-0 -translate-x-1/2 whitespace-nowrap ${t === BUDGET_MIN ? 'text-fg-2' : ''}`} style={{ left: pct(t) }}>
                  {t === BUDGET_MIN ? (
                    <>
                      20<span className="hidden md:inline"> min budget</span>
                      <span className="md:hidden"> budget</span>
                    </>
                  ) : (
                    t
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed">
          Austin ran 1.8 min over. The stereo time model predicted 5.4 min and stereo took 8.5, so the model has since been refitted on both runs.
        </p>

        <ChartTable
          caption="Minutes per stage for each run"
          head={['Stage', 'Toledo (min)', 'Austin (min)']}
          rows={[...STAGES.map((s, i) => [s, RUNS[0].minutes[i], RUNS[1].minutes[i]]), ['Total', RUNS[0].total, RUNS[1].total]]}
        />
      </div>
    </section>
  );
}

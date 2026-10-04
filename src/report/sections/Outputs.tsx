import { useRef } from 'react';
import { Link004 } from '../../components/ui/skiper-ui/skiper40';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { CHART, OUTPUTS, OUTPUT_MAX_MB } from '../data';

export function Outputs() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.out-group', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.out-grid', start: 'top 80%' } });
      gsap.from('.out-size', { scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: '.out-grid', start: 'top 75%' } });
    },
    { scope: root },
  );

  return (
    <section id="outputs" ref={root} className="relative px-6 py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl text-[clamp(2.4rem,4.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.035em]">Every run keeps its own files.</h2>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed">
          Each job writes to its own folder, so the next run never overwrites the last. Sizes are from the Sep 29 Toledo run.
        </p>

        <div className="out-grid mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {OUTPUTS.map((g) => (
            <div key={g.group} className="out-group border-t border-line pt-6">
              <h3 className="text-sm text-fg-3">{g.group}</h3>
              <ul className="mt-5 grid gap-5">
                {g.files.map((f) => (
                  <li key={f.name} className="grid grid-cols-[1fr_auto] items-center gap-6">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[15px] text-fg">{f.name}</p>
                      <p className="mt-1 text-sm">{f.what}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 sm:w-28">
                        <div className="out-size h-1 rounded-r-full" style={{ width: `${(f.mb / OUTPUT_MAX_MB) * 100}%`, background: CHART.a }} />
                      </div>
                      <span className="w-16 text-right font-mono text-sm tabular-nums text-fg">{f.mb} MB</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <Link004 href="/runs" className="w-fit text-lg text-fg">
            Explore the runs in 3D
          </Link004>
        </div>
      </div>
    </section>
  );
}

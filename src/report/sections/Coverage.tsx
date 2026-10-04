import { useRef } from 'react';
import { gsap, useGSAP, reducedMotion } from '../../lib/gsap';
import { photo, PHOTOS } from '../../lib/media';
import { CHART, DSM, SPLAT, TEXTURE } from '../data';
import { PartBar } from '../chart';

function Cell({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <article className={`cov-cell relative overflow-hidden rounded-[28px] bg-surface ring-1 ring-inset ring-line ${className}`}>{children}</article>;
}

export function Coverage() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from('.cov-cell', { y: 50, autoAlpha: 0, scale: 0.97, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.cov-grid', start: 'top 80%' } });
      gsap.from('.part-fill', { scaleX: 0, transformOrigin: 'left center', duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.cov-grid', start: 'top 70%' } });
      gsap.from('.vram-fill', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.vram-fill', start: 'top 90%' } });
    },
    { scope: root },
  );

  const vramPct = (SPLAT.vramGb / SPLAT.gpuGb) * 100;

  return (
    <section id="coverage" ref={root} className="relative px-6 py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl text-[clamp(2.4rem,4.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.035em]">
          Measured, filled, or <span className="text-fg/45">neither.</span>
        </h2>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed">
          How much of each deliverable came straight from the cameras, and how much was filled in to close the gaps.
        </p>

        <div className="cov-grid mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <Cell className="p-8 md:col-span-2 md:p-10">
            <h3 className="text-xl font-medium">Surface model</h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed">Cells of the GeoTIFF DSM. Gaps under canopy and water are filled from the mesh.</p>
            <div className="mt-8">
              <PartBar parts={DSM} unit="of cells" />
            </div>
          </Cell>

          <Cell className="min-h-[340px] md:row-span-2">
            <img
              src={photo(PHOTOS.canopy, 800, 1100)}
              alt="Forest canopy seen from directly above"
              loading="lazy"
              className="absolute inset-0 size-full object-cover contrast-125 brightness-75 saturate-[0.85]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-8">
              <p className="text-[clamp(3rem,4vw,4rem)] leading-none font-light tracking-[-0.05em] text-fg">0</p>
              <p className="mt-2 text-lg text-fg">holes in the Toledo mesh</p>
              <p className="mt-3 text-sm leading-relaxed">Leftover loops are closed everywhere except the survey edge, so canopy and shadow never leave a gap.</p>
            </div>
          </Cell>

          <Cell className="p-8 md:col-span-2 md:p-10">
            <h3 className="text-xl font-medium">Texture</h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed">Faces of the 750k-face mesh, by which camera view painted them.</p>
            <div className="mt-8">
              <PartBar parts={TEXTURE} unit="faces" />
            </div>
          </Cell>

          <Cell className="p-8 md:col-span-3 md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
              <div>
                <h3 className="text-xl font-medium">Gaussian splat, off the clock</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed">
                  An optional showpiece trained after the job finishes. It is never part of the timed run or its deliverables.
                </p>
              </div>
              <div>
                <dl className="grid grid-cols-3 gap-6">
                  {[
                    [SPLAT.gaussians, 'Gaussians'],
                    [`${SPLAT.minutes} min`, 'training'],
                    [`${SPLAT.psnr} dB`, 'held-out PSNR'],
                  ].map(([v, l]) => (
                    <div key={l} className="flex flex-col-reverse gap-1">
                      <dt className="text-sm">{l}</dt>
                      <dd className="text-[clamp(1.6rem,2.4vw,2.25rem)] leading-none font-light tracking-[-0.04em] text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-8">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span>Peak VRAM, whole GPU</span>
                    <span className="font-mono text-fg">
                      {SPLAT.vramGb} of {SPLAT.gpuGb} GB
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label="Peak VRAM while training the splat"
                    aria-valuemin={0}
                    aria-valuemax={SPLAT.gpuGb}
                    aria-valuenow={SPLAT.vramGb}
                    className="mt-3 h-2 overflow-hidden rounded-full"
                    style={{ background: `${CHART.a}26` }}
                  >
                    <div className="vram-fill h-full rounded-full" style={{ width: `${vramPct}%`, background: CHART.a }} />
                  </div>
                </div>
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}

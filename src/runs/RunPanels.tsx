import { useRef, useState, type ReactNode } from 'react';
import { DownloadSimple, ArrowsHorizontal } from '@phosphor-icons/react';
import { CHART } from '../report/data';
import { formatBytes, formatDuration, formatInt } from './format';
import type { Run } from './types';

// Phase fills, run order. Text colour per fill keeps 4.5:1.
const PHASE_FILL = [
  { bg: '#3b4550', fg: '#eef1f4' },
  { bg: CHART.b, fg: '#06080b' },
  { bg: '#3ddcff', fg: '#021216' },
];

// Where the budget went: one wide ribbon, phases to scale, budget marked.
export function TimingRibbon({ run }: { run: Run }) {
  const t = run.timings;
  if (!t) return null;
  const axis = Math.max(t.total_s, t.budget_s) * 1.02;
  const fill = (i: number) => PHASE_FILL[i % PHASE_FILL.length];

  return (
    <div className="ribbon">
      <div className="relative">
        <div className="flex h-28 gap-1 md:h-36" style={{ width: `${(t.total_s / axis) * 100}%` }}>
          {t.phases.map((p, i) => {
            const share = p.seconds / t.total_s;
            return (
              <div
                key={p.phase}
                title={`${p.phase}: ${formatDuration(p.seconds)}`}
                className="ribbon-seg relative flex min-w-1.5 flex-col justify-end overflow-hidden rounded-xl p-4 md:p-5"
                style={{ flex: `${p.seconds} 1 0`, background: fill(i).bg, color: fill(i).fg }}
              >
                {share >= 0.15 && (
                  <span className="ribbon-label">
                    <span className="block text-lg leading-tight font-medium md:text-2xl">{p.phase}</span>
                    <span className="mt-1 block font-mono text-xs tabular-nums opacity-80">
                      {formatDuration(p.seconds)} · {Math.round(share * 100)}%
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span className="ribbon-budget pointer-events-none absolute -top-8 -bottom-3 w-px bg-fg/70" style={{ left: `${(t.budget_s / axis) * 100}%` }}>
          <span className="absolute -top-1 right-2 font-mono text-[11px] whitespace-nowrap text-fg">{t.budget_s / 60} min budget</span>
        </span>
      </div>
      <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm">
        {t.phases.map((p, i) => (
          <li key={p.phase} className="ribbon-label flex items-center gap-2.5">
            <i className="block size-2.5 rounded-[3px]" style={{ background: fill(i).bg }} />
            <span>{p.phase}</span>
            <span className="font-mono text-fg tabular-nums">{formatDuration(p.seconds)}</span>
          </li>
        ))}
        <li className="ribbon-label ml-auto font-mono text-xs text-fg-2">
          {formatInt(t.frames_used)} of {formatInt(t.frames_in)} frames used
        </li>
      </ul>
    </div>
  );
}

// Camera centres vs onboard GPS after alignment.
export function AccuracyPanel({ run }: { run: Run }) {
  const a = run.accuracy;
  if (!a) return null;
  const g = a.camera_vs_gps;
  const axes = [
    { k: 'East', v: g.east.rmse_m, max: g.east.max_abs_m },
    { k: 'North', v: g.north.rmse_m, max: g.north.max_abs_m },
    { k: 'Up', v: g.up.rmse_m, max: g.up.max_abs_m },
  ];
  const top = Math.max(...axes.map((x) => x.max));
  return (
    <Panel title="Agreement with GPS" big={`${g.horizontal_rmse_m.toFixed(2)} m`} sub="horizontal RMSE, camera centres vs onboard GPS">
      <ul className="mt-6 grid gap-4">
        {axes.map((x) => (
          <li key={x.k} title={`RMSE ${x.v.toFixed(2)} m, worst ${x.max.toFixed(2)} m`}>
            <div className="flex justify-between text-sm">
              <span>{x.k}</span>
              <span className="font-mono text-fg tabular-nums">
                {x.v.toFixed(2)} m <span className="text-fg-3">/ max {x.max.toFixed(1)}</span>
              </span>
            </div>
            <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.05]">
              <div className="run-bar absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${(x.max / top) * 100}%`, background: CHART.a }} />
              <div className="run-bar absolute inset-y-0 left-0 rounded-full shadow-[0_0_12px_rgba(20,162,198,0.6)]" style={{ width: `${(x.v / top) * 100}%`, background: CHART.a }} />
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
        <Stat k="Frames registered" v={`${a.frames_registered} / ${a.frames_input}`} />
        <Stat k="Reprojection error" v={`${a.mean_reprojection_error_px.toFixed(2)} px`} />
      </dl>
    </Panel>
  );
}

export function MeshPanel({ run }: { run: Run }) {
  const m = run.meshStats;
  const t = run.textureStats;
  if (!m) return null;
  return (
    <Panel title="Surface" big={`${(m.faces / 1e6).toFixed(1)}M`} sub={`faces from ${(m.points / 1e6).toFixed(1)}M dense points, Poisson depth ${m.poisson_depth}`}>
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
        <Stat k="Holes filled" v={`${m.holes_before_fill} to ${m.interior_holes}`} />
        <Stat k="Pieces" v={String(m.pieces)} />
        {t && <Stat k="Textured faces" v={formatInt(t.faces)} />}
        {t && <Stat k="Texel" v={`${(t.texel_m * 100).toFixed(1)} cm`} />}
        {t && <Stat k="Clear view" v={`${((t.faces_clear_view / t.faces) * 100).toFixed(1)}%`} />}
        {t && <Stat k="Views used" v={String(t.views_used)} />}
      </dl>
    </Panel>
  );
}

function Panel({ title, big, sub, children }: { title: string; big: string; sub: string; children: ReactNode }) {
  return (
    <section className="run-panel relative overflow-hidden rounded-[28px] bg-surface/70 p-7 ring-1 ring-inset ring-line md:p-10">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-signal/70 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-signal/[0.06] blur-3xl" />
      <h3 className="font-mono text-xs tracking-[0.2em] text-signal uppercase">{title}</h3>
      <p className="mt-5 text-[clamp(3rem,5vw,4.25rem)] leading-none font-extralight tracking-[-0.05em] text-fg tabular-nums">{big}</p>
      <p className="mt-3 text-sm">{sub}</p>
      {children}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-fg-3">{k}</dt>
      <dd className="mt-0.5 font-mono text-fg tabular-nums">{v}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------

const PREVIEWS = [
  { file: 'previews/orthophoto.jpg', label: 'Orthophoto' },
  { file: 'previews/dsm.jpg', label: 'Surface model' },
  { file: 'previews/mesh_top.jpg', label: 'Mesh, top' },
  { file: 'previews/mesh_obl.jpg', label: 'Mesh, oblique' },
];

// Two rendered layers with a draggable split: compare any pair of previews.
export function Previews({ run }: { run: Run }) {
  const have = PREVIEWS.filter((p) => run.files.some((f) => f.path === p.file));
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(Math.min(1, have.length - 1));
  const [split, setSplit] = useState(0.5);
  const box = useRef<HTMLDivElement>(null);
  if (have.length < 1) return null;

  const at = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setSplit(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Picker label="Left" items={have} value={left} onChange={setLeft} />
        <Picker label="Right" items={have} value={right} onChange={setRight} />
      </div>
      <div
        ref={box}
        className="relative mt-5 aspect-[4/3] w-full cursor-ew-resize touch-none overflow-hidden rounded-[24px] bg-surface ring-1 ring-inset ring-line select-none md:aspect-[16/10]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          at(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && at(e.clientX)}
      >
        <img src={run.base + have[right].file} alt={have[right].label} className="absolute inset-0 size-full object-contain" draggable={false} />
        <img
          src={run.base + have[left].file}
          alt={have[left].label}
          className="absolute inset-0 size-full object-contain"
          style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-y-0 w-px bg-signal shadow-[0_0_12px_1px_rgb(61_220_255/0.7)]" style={{ left: `${split * 100}%` }}>
          <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink/80 text-signal ring-1 ring-inset ring-signal/50 backdrop-blur">
            <ArrowsHorizontal size={18} weight="bold" />
          </span>
        </div>
        <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-ink/70 px-3 py-1 font-mono text-[11px] text-fg backdrop-blur">{have[left].label}</span>
        <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-ink/70 px-3 py-1 font-mono text-[11px] text-fg backdrop-blur">{have[right].label}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          aria-label="Comparison split"
          className="sr-only"
        />
      </div>
    </div>
  );
}

function Picker({ label, items, value, onChange }: { label: string; items: { label: string }[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-fg-3 uppercase">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-line">
        {items.map((p, i) => (
          <button
            key={p.label}
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${value === i ? 'bg-fg text-ink' : 'text-fg-2 hover:bg-white/[0.06] hover:text-fg'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const GROUPS: { dir: string; label: string; what: Record<string, string> }[] = [
  { dir: 'mesh', label: 'Mesh', what: { 'model.glb': 'GLB, textures embedded', 'model.obj': 'OBJ, two texture pages', 'model.fbx': 'FBX, textures embedded', 'model.mtl': 'OBJ materials', 'model_texture.jpg': 'Texture page 1', 'model_texture_1.jpg': 'Texture page 2', 'model_origin.json': 'ECEF offset and WGS84 origin', 'texture_stats.json': 'Texturing report' } },
  { dir: 'pointcloud', label: 'Point cloud', what: { 'dense.ply': 'PLY in ECEF, outlier-cleaned', 'dense.las': 'LAS for GIS tools' } },
  { dir: 'geotiff', label: 'Rasters', what: { 'orthophoto.tif': 'GeoTIFF true orthophoto', 'dsm.tif': 'GeoTIFF surface model', 'dsm_bounds.json': 'Raster bounds' } },
  { dir: '', label: 'Reports', what: { 'timings.json': 'Phase timings', 'accuracy_report.json': 'Camera vs GPS', 'mesh_stats.json': 'Meshing report', 'reconstruction_summary.json': 'Run summary' } },
];

export function Files({ run }: { run: Run }) {
  const max = Math.max(...run.files.map((f) => f.bytes));
  return (
    <div className="grid gap-x-16 gap-y-12 md:grid-cols-2">
      {GROUPS.map((g) => {
        const files = run.files.filter((f) => (g.dir ? f.path.startsWith(g.dir + '/') : !f.path.includes('/')));
        if (!files.length) return null;
        return (
          <div key={g.label} className="run-files border-t border-line pt-6">
            <h3 className="text-sm text-fg-3">{g.label}</h3>
            <ul className="mt-4 grid gap-1">
              {files.map((f) => {
                const name = f.path.split('/').pop()!;
                return (
                  <li key={f.path}>
                    <a
                      // Cross-origin (Blob) ignores the download attribute; ?download=1 makes Blob send it as an attachment.
                      href={run.base + f.path + (/^https?:/.test(run.base) ? '?download=1' : '')}
                      download={name}
                      className="group grid grid-cols-[1fr_auto_auto] items-center gap-5 rounded-xl px-3 py-2.5 -mx-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[14px] text-fg">{name}</span>
                        {g.what[name] && <span className="mt-0.5 block text-sm">{g.what[name]}</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="hidden w-24 sm:block">
                          <span className="block h-1 rounded-r-full" style={{ width: `${Math.max(2, (f.bytes / max) * 100)}%`, background: CHART.a }} />
                        </span>
                        <span className="w-16 text-right font-mono text-sm text-fg tabular-nums">{formatBytes(f.bytes)}</span>
                      </span>
                      <DownloadSimple size={18} className="text-fg-3 transition-colors group-hover:text-signal" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

import { Table } from '@phosphor-icons/react';
import { starts, tipAlign, useHover } from './hover';

// Shared chart pieces for the field report. Marks carry the series colour;
// every piece of text stays in the text tokens.

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2.5">
          <i className="block size-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

const ALIGN = { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' } as const;

export function Tip({ title, lines, align = 'center' }: { title: string; lines: string[]; align?: ReturnType<typeof tipAlign> }) {
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-xl bg-surface-2 px-3 py-2 text-xs shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-line-strong ${ALIGN[align]}`}
    >
      <p className="font-medium text-fg">{title}</p>
      {lines.map((l) => (
        <p key={l} className="mt-0.5 font-mono text-fg-2">
          {l}
        </p>
      ))}
    </div>
  );
}

export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-8">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-mono text-xs text-fg-3 transition-colors hover:text-fg-2">
        <Table size={14} />
        View as table
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full max-w-2xl text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line font-mono text-[11px] text-fg-3">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-2 pr-6 font-normal ${i ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r[0])}>
                {r.map((c, i) => (
                  <td key={i} className={`py-1.5 pr-6 ${i ? 'text-right font-mono tabular-nums text-fg' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

type Part = { label: string; value: number; display: string; color: string };

// One part-to-whole bar: 2px surface gaps between parts, values in the legend
// below so the tooltip never gates a number.
export function PartBar({ parts, unit }: { parts: Part[]; unit: string }) {
  const [hover, bind] = useHover<number>();
  const total = parts.reduce((s, p) => s + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  const at = starts(shown.map((p) => p.value));
  return (
    <div>
      <div className="flex h-10 items-center gap-[2px]">
        {shown.map((p, i) => {
          return (
            <div
              key={p.label}
              {...bind(i)}
              aria-label={`${p.label}: ${p.display} ${unit}`}
              className="relative flex h-full items-center outline-none"
              style={{ flexGrow: p.value, flexBasis: 0, minWidth: 3 }}
            >
              <div
                className={`part-fill h-6 w-full ${i === 0 ? 'rounded-l-[4px]' : ''} ${i === shown.length - 1 ? 'rounded-r-[4px]' : ''}`}
                style={{ background: p.color }}
              />
              {hover === i && (
                <Tip align={tipAlign(at[i] / total)} title={p.label} lines={[`${p.display} ${unit}`, `${((p.value / total) * 100).toFixed(1)}% of the total`]} />
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2.5">
            <i className="mt-1.5 block size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
            <span>
              <span className="block font-mono text-fg">{p.display}</span>
              <span className="text-sm">{p.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link000, Link001 } from '../../components/ui/skiper-ui/skiper40';
import { Mark } from '../../components/Mark';

const SOURCES = [
  { href: 'https://huggingface.co/datasets/zhiyundeng/AirLock-WACV2026', label: 'AirLock+ dataset' },
  { href: 'https://arxiv.org/abs/2607.24852', label: 'Asadi 2026 on GPS-only accuracy' },
  { href: 'https://github.com/nerfstudio-project/gsplat', label: 'gsplat' },
];
const CREDITS = [
  { href: 'https://skiper-ui.com', label: 'Link motion by Skiper UI' },
  { href: 'https://picsum.photos', label: 'Photos from Picsum' },
];

export function ReportFooter() {
  return (
    <footer className="border-t border-line px-6 py-16">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <a href="/" className="flex w-fit items-center gap-3 text-2xl font-semibold tracking-tight text-fg">
            <Mark size={28} className="text-signal" />
            Argus
          </a>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">Single-pass drone video to a georeferenced 3D model. Built for SIH 2026, National Technical Research Organisation.</p>
          <Link000 href="/" className="mt-6 w-fit text-sm text-fg">
            Back to the overview
          </Link000>
        </div>
        <nav aria-label="Sources">
          <h2 className="text-sm text-fg-3">Sources</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <Link001 href={s.href} className="w-fit transition-colors hover:text-fg">
                  {s.label}
                </Link001>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Credits">
          <h2 className="text-sm text-fg-3">Credits</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {CREDITS.map((s) => (
              <li key={s.href}>
                <Link001 href={s.href} className="w-fit transition-colors hover:text-fg">
                  {s.label}
                </Link001>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

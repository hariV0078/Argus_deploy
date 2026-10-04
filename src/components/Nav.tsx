import { useEffect, useState } from 'react';
import { Mark } from './Mark';

type Link = { href: string; label: string };

const LANDING: Link[] = [
  { href: '#outputs', label: 'Outputs' },
  { href: '#architecture', label: 'Architecture' },
  { href: '/report', label: 'Report' },
];

// Floating pill. Clear over the hero, glass once the page scrolls.
export function Nav({ links = LANDING, home = '#top', cta = { href: '/runs', label: 'Explore a run' } }: { links?: Link[]; home?: string; cta?: Link }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={`flex h-14 w-full max-w-2xl items-center gap-2 rounded-full pr-2 pl-5 ring-1 ring-inset backdrop-blur-xl backdrop-saturate-150 transition-colors duration-500 ${
          scrolled ? 'bg-ink/70 ring-white/12' : 'bg-white/[0.03] ring-white/8'
        }`}
        aria-label="Primary"
      >
        <a href={home} className="mr-auto flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-fg">
          <Mark className="text-signal" />
          Argus
        </a>
        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3.5 py-2 text-sm text-fg-2 transition-colors hover:bg-white/[0.06] hover:text-fg">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href={cta.href} className="ml-2 inline-flex h-10 items-center rounded-full bg-fg px-5 text-sm font-medium text-ink transition-colors hover:bg-white">
          {cta.label}
        </a>
      </nav>
    </header>
  );
}

import { useRef } from 'react';
import { Link003 } from '../components/ui/skiper-ui/skiper40';
import { Mark } from '../components/Mark';
import { BACKEND_URL } from '../lib/media';
import { ScrollTrigger, useGSAP } from '../lib/gsap';

const LINKS = [
  { href: '#timing', label: 'Timing' },
  { href: '#accuracy', label: 'Accuracy' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#outputs', label: 'Outputs' },
  { href: '/runs', label: 'Runs' },
];

export function ReportNav() {
  const nav = useRef<HTMLElement>(null);

  // Tint once the page moves; ScrollTrigger instead of a raw scroll listener.
  useGSAP(() => {
    ScrollTrigger.create({
      start: 40,
      end: 'max',
      onToggle: (self) => nav.current?.toggleAttribute('data-scrolled', self.isActive),
    });
  });

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        ref={nav}
        aria-label="Primary"
        className="flex h-14 w-full max-w-3xl items-center gap-2 rounded-full bg-white/[0.04] pl-5 pr-2 ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-500 data-[scrolled]:bg-ink/70 data-[scrolled]:ring-white/12"
      >
        <a href="/" className="mr-auto flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-fg">
          <Mark className="text-signal" />
          Argus
        </a>
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link003 href={l.href} className="text-sm text-fg-2 transition-colors hover:text-fg">
                {l.label}
              </Link003>
            </li>
          ))}
        </ul>
        <a
          href={`${BACKEND_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="ml-4 inline-flex h-10 items-center rounded-full bg-fg px-5 text-sm font-medium text-ink transition-colors hover:bg-white active:scale-[0.98]"
        >
          Run a survey
        </a>
      </nav>
    </header>
  );
}

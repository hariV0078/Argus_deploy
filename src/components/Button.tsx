import type { ReactNode } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

type Props = { href: string; children: ReactNode; variant?: 'light' | 'glass' | 'signal'; size?: 'md' | 'lg' };

// Light surfaces carry dark text; glass and dark surfaces carry white text.
const VARIANTS = {
  light: 'bg-fg text-ink hover:bg-white',
  signal: 'bg-signal text-signal-ink hover:bg-[#6be5ff]',
  glass: 'bg-white/[0.06] text-fg ring-1 ring-inset ring-white/15 backdrop-blur-md hover:bg-white/[0.12]',
};

export function Button({ href, children, variant = 'light', size = 'md' }: Props) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`group inline-flex items-center gap-3 rounded-full font-medium tracking-tight transition-colors duration-300 ${VARIANTS[variant]} ${
        size === 'lg' ? 'h-14 pl-7 pr-2 text-base' : 'h-12 pl-6 pr-1.5 text-[15px]'
      }`}
    >
      {children}
      <span
        className={`grid place-items-center rounded-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105 ${
          variant === 'glass' ? 'bg-white/10' : 'bg-black/10'
        } ${size === 'lg' ? 'size-10' : 'size-9'}`}
      >
        <ArrowUpRight size={size === 'lg' ? 18 : 16} weight="bold" />
      </span>
    </a>
  );
}

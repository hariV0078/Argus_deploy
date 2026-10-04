import { useState } from 'react';

// Keeps a tooltip inside the plot when its mark sits near either edge.
export const tipAlign = (at: number) => (at < 0.15 ? 'start' : at > 0.85 ? 'end' : 'center');

// Running start of each part, so marks can place their tooltip.
export const starts = (values: readonly number[]) => values.map((_, i) => values.slice(0, i).reduce((s, v) => s + v, 0));

// Hover and keyboard focus share one handler set, so focus shows what hover shows.
export function useHover<T>() {
  const [hover, setHover] = useState<T | null>(null);
  const bind = (key: T) => ({
    tabIndex: 0,
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(key),
    onBlur: () => setHover(null),
  });
  return [hover, bind] as const;
}

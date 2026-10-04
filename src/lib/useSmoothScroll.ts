import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, reducedMotion } from './gsap';

// Lenis drives the scroll; ScrollTrigger reads from it on every tick.
export function useSmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}

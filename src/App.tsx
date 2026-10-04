import { useSmoothScroll } from './lib/useSmoothScroll';
import { Nav } from './components/Nav';
import { Hero } from './sections/Hero';
import { Outputs } from './sections/Outputs';
import { Architecture } from './sections/Architecture';
import { Numbers } from './sections/Numbers';
import { Finale } from './sections/Finale';

export default function App() {
  useSmoothScroll();

  return (
    <div className="grain">
      <Nav />
      <main className="w-full max-w-full overflow-x-hidden">
        <Hero />
        <Outputs />
        <Architecture />
        <Numbers />
        <Finale />
      </main>
    </div>
  );
}

import { useEffect } from 'react';
import { useSmoothScroll } from '../lib/useSmoothScroll';
import { ReportNav } from './ReportNav';
import { ReportHero } from './sections/ReportHero';
import { Figures } from './sections/Figures';
import { Timing } from './sections/Timing';
import { Accuracy } from './sections/Accuracy';
import { Coverage } from './sections/Coverage';
import { Outputs } from './sections/Outputs';
import { ReportFooter } from './sections/ReportFooter';

export default function ReportPage() {
  useSmoothScroll();
  useEffect(() => {
    document.title = 'Argus field report';
  }, []);

  return (
    <div className="grain">
      <ReportNav />
      <main className="w-full max-w-full overflow-x-hidden">
        <ReportHero />
        <Figures />
        <Timing />
        <Accuracy />
        <Coverage />
        <Outputs />
      </main>
      <ReportFooter />
    </div>
  );
}

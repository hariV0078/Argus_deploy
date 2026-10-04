import { useState } from 'react';
import { Play } from '@phosphor-icons/react';

// The raw drone footage the run was reconstructed from. A poster with a play
// button until clicked, then the YouTube player (privacy-enhanced domain), so
// the page does not load YouTube's ~1 MB of player scripts up front.
export function FlightVideo({ id, title, fallback }: { id: string; title: string; fallback?: string }) {
  const [playing, setPlaying] = useState(false);
  // Poster is the run's own orthophoto: YouTube's thumbnail endpoint answers a
  // missing thumbnail with a grey placeholder image, which would cover it.
  const poster = fallback ? `url(${fallback})` : undefined;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[28px] bg-ink-2 ring-1 ring-inset ring-line">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${title}`}
          className="group absolute inset-0 grid place-items-center bg-cover bg-center"
          style={{ backgroundImage: poster }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_50%,rgba(6,8,11,0.25),rgba(6,8,11,0.8))] transition-opacity duration-500 group-hover:opacity-70" />
          <span className="relative grid size-20 place-items-center rounded-full bg-fg text-ink shadow-[0_0_60px_rgba(61,220,255,0.35)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110 md:size-24">
            <Play size={30} weight="fill" className="translate-x-0.5" />
          </span>
          <span className="absolute bottom-6 left-6 font-mono text-xs tracking-[0.2em] text-fg uppercase">Source footage · YouTube</span>
        </button>
      )}
    </div>
  );
}

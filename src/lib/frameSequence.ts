// Scroll-scrubbed image sequence (the Apple product-page technique).
//
// Why not <video> + currentTime: every scroll tick queues a seek, and the
// browser decodes H.264 on demand, so fast scrolling stalls and skips. Here
// each frame is a small WebP decoded once, off the main thread
// (createImageBitmap), and painting a frame is one drawImage into a canvas.

type Frame = ImageBitmap | HTMLImageElement;

export type Sequence = {
  count: number;
  frames: (Frame | null)[];
  /** Nearest frame that has finished decoding, searching outward from i. */
  nearest(i: number): number;
  dispose(): void;
};

export const frameUrl = (base: string, i: number) => `${base}/${String(i).padStart(3, '0')}.webp`;

// Coarse to fine: first and last, then every 16th, 8th, 4th, 2nd, then the
// rest. A fast scroller always has a frame close to where they are.
function loadOrder(count: number) {
  const seen = new Set<number>([0, count - 1]);
  const order = [0, count - 1];
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += step) {
      if (seen.has(i)) continue;
      seen.add(i);
      order.push(i);
    }
  }
  return order;
}

async function decode(url: string, signal: AbortSignal): Promise<Frame> {
  if ('createImageBitmap' in window) {
    const blob = await (await fetch(url, { signal })).blob();
    return createImageBitmap(blob);
  }
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export function loadSequence(base: string, count: number, opts: { only?: number[]; parallel?: number; onLoad?: (i: number) => void } = {}): Sequence {
  const frames: (Frame | null)[] = Array(count).fill(null);
  const ac = new AbortController();
  const queue = opts.only ?? loadOrder(count);

  const worker = async () => {
    while (queue.length && !ac.signal.aborted) {
      const i = queue.shift()!;
      try {
        frames[i] = await decode(frameUrl(base, i), ac.signal);
        opts.onLoad?.(i);
      } catch {
        /* aborted or missing: the nearest loaded frame stands in */
      }
    }
  };
  for (let k = 0; k < (opts.parallel ?? 6); k++) void worker();

  return {
    count,
    frames,
    nearest(i) {
      if (frames[i]) return i;
      for (let d = 1; d < count; d++) {
        if (i - d >= 0 && frames[i - d]) return i - d;
        if (i + d < count && frames[i + d]) return i + d;
      }
      return -1;
    },
    dispose() {
      ac.abort();
      frames.forEach((f) => f && 'close' in f && f.close());
    },
  };
}

// Paints the sequence into a canvas with object-fit: cover. Only draws when
// the frame index actually changes, so an idle tick costs one comparison.
export function createRenderer(canvas: HTMLCanvasElement, seq: Sequence) {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let drawn = -1;
  let cw = 0;
  let ch = 0;

  const resize = () => {
    // Cap the backing store: past ~1.75x the fill cost grows with no visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    cw = Math.round(canvas.clientWidth * dpr);
    ch = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    ctx.imageSmoothingQuality = 'high';
    drawn = -1; // a resize clears the canvas, so repaint next tick
  };

  const draw = (target: number) => {
    const i = seq.nearest(Math.max(0, Math.min(seq.count - 1, target)));
    if (i < 0 || i === drawn || !cw) return;
    const f = seq.frames[i]!;
    const fw = f.width;
    const fh = f.height;
    // Cover: crop the source rect so the scale is uniform and the canvas is filled.
    const s = Math.max(cw / fw, ch / fh);
    const sw = cw / s;
    const sh = ch / s;
    ctx.drawImage(f, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, cw, ch);
    drawn = i;
  };

  resize();
  return { resize, draw, invalidate: () => (drawn = -1) };
}

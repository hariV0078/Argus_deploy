// Every photo comes from the Picsum library by fixed id (hand-picked aerial /
// terrain shots), so the page always shows the same, on-topic imagery.
export const photo = (id: number, w: number, h: number) => `https://picsum.photos/id/${id}/${w}/${h}`;

export const PHOTOS = {
  valley: 960, // river valley topography
  coast: 162, // coastline from altitude
  traffic: 88, // top-down road with cars
  rooftops: 448, // dense town rooftops
  canopy: 924, // forest canopy from above
  shoreline: 1002, // satellite-like coast
  rows: 955, // crop rows, lawnmower pattern
  stadium: 1058, // pitch from directly above
  interchange: 576, // highway interchange over water
  tunnel: 1063, // road tunnel under forest
  city: 283, // city haze from altitude
} as const;

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:8000';

// Local media: renders from a real run (mesh background keyed to ink) and the
// hero clip, an aerial plate turning into a triangulated tile, as a WebP image
// sequence (144 frames at 24 fps, Real-ESRGAN upscaled) in two sizes. See lib/frameSequence.ts.
export const MEDIA = {
  heroPoster: '/media/hero-poster.jpg', // last frame of the clip: the finished mesh
  mesh: '/media/mesh.jpg',
  dsm: '/media/dsm.jpg',
  ortho: '/media/ortho.jpg',
} as const;

export const HERO_SEQ = { lg: '/media/hero-seq/lg', sm: '/media/hero-seq/sm', count: 144 } as const;

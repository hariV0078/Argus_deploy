# frontend_mk2

A scroll-driven showcase site for the Argus backend (single drone pass to a
georeferenced 3D model). All copy and numbers come from `backend/ARCHITECTURE.md`
and the FastAPI routes in `backend/src/viewer/`.

## Run

```bash
npm install
cp .env.example .env     # VITE_BACKEND_URL, default http://localhost:8000
npm run dev              # http://localhost:5175
npm run build            # typecheck + production build to dist/
```

The "Run a survey" and "Open the API" buttons open `$VITE_BACKEND_URL/docs`
(FastAPI's OpenAPI UI).

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, GSAP + ScrollTrigger (`@gsap/react`),
Lenis smooth scroll, Phosphor icons, Outfit + Geist Mono.

## Media

No local images or video. Photos are loaded from the Picsum library by fixed id
(`src/lib/media.ts`), hand-picked aerial and terrain shots, so the page always
shows the same imagery. Everything else is drawn in code: contour lines, scan
lines, the accuracy rings and the timing bars.

## Page

| Section | File | Motion |
|---|---|---|
| Floating glass nav | `components/Nav.tsx` | tints on scroll |
| Hero | `sections/Hero.tsx` | masked line rise, contour lines draw in, scan sweep, parallax out |
| Outputs and stack marquee | `sections/Marquee.tsx` | two infinite rows, speed follows scroll velocity |
| Proof bento (gapless, `grid-flow-dense`) | `sections/Proof.tsx` | 34.4 to 14.9 min counter, timing bars, ring build |
| Inline-image statement | `sections/Statement.tsx` | image pills open, words scrub from 0.1 to 1 |
| Pipeline | `sections/Pipeline.tsx` | stacking cards (tablet and up) |
| Field notes | `sections/FieldNotes.tsx` | fanned portrait carousel |
| API | `sections/Api.tsx` | route list and code reveal |
| Finale and footer | `sections/Finale.tsx` | image scales in, fades out |

`prefers-reduced-motion` turns off Lenis and every GSAP timeline.

## Field report (`/report`)

A second page, lazy-loaded from `src/main.tsx` (no router; the host needs an
SPA fallback to `index.html`, which `vite dev` and `vite preview` already do).
Every number is measured and lives in `src/report/data.ts` with its source.
Charts are plain HTML/CSS with hover and focus tooltips and a table view; link
animations come from Skiper UI (`src/components/ui/skiper-ui/skiper40.tsx`).

| Section | File | Chart |
|---|---|---|
| Hero | `report/sections/ReportHero.tsx` | |
| Headline figures | `report/sections/Figures.tsx` | count-up stat row |
| Timing | `report/sections/Timing.tsx` | stage timeline per run vs the 20 min budget |
| Accuracy | `report/sections/Accuracy.tsx` | horizontal / vertical RMSE by configuration |
| Coverage bento | `report/sections/Coverage.tsx` | DSM and texture part-to-whole, splat VRAM meter |
| Outputs | `report/sections/Outputs.tsx` | file sizes |

import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Finished pipeline runs live in ./Output/<RUN>/ exactly as the backend wrote
// them (mesh/, pointcloud/, geotiff/, previews/, *.json). There is no backend at
// demo time, so this plugin turns that folder into the site's data:
//   - `virtual:runs` is a manifest of every run: its files and sizes, plus the
//     small JSON reports inlined so the page needs no extra requests for them;
//   - dev and preview serve the files at /Output/...;
//   - build copies them into dist/Output/.
// Deployed, the files are too big for the host (Vercel Hobby caps a deploy at
// 100 MB), so they live in Vercel Blob instead: with RUNS_BASE_URL set (the
// store's origin), runs link there and nothing is copied. Output/ is not
// uploaded either, so every local manifest is also saved to runs-manifest.json
// and the remote build reads that.
const OUTPUT_DIR = path.resolve(import.meta.dirname, 'Output')
const SNAPSHOT = path.resolve(import.meta.dirname, 'runs-manifest.json')
const REMOTE = process.env.RUNS_BASE_URL?.replace(/\/+$/, '')
const URL_PREFIX = '/Output/'
const VIRTUAL_ID = 'virtual:runs'
const RESOLVED_ID = '\0' + VIRTUAL_ID

// Windows copies leave `file:Zone.Identifier` streams next to every download.
const isJunk = (name: string) => name.includes(':') || name.startsWith('.')

const REPORTS: Record<string, string> = {
  timings: 'timings.json',
  accuracy: 'accuracy_report.json',
  meshStats: 'mesh_stats.json',
  summary: 'reconstruction_summary.json',
  textureStats: 'mesh/texture_stats.json',
  origin: 'mesh/model_origin.json',
  bounds: 'geotiff/dsm_bounds.json',
}

const MIME: Record<string, string> = {
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.tif': 'image/tiff',
  '.mtl': 'text/plain',
}

function walk(dir: string, rel = ''): { path: string; bytes: number }[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (isJunk(e.name)) return []
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) return walk(path.join(dir, e.name), r)
    return [{ path: r, bytes: fs.statSync(path.join(dir, e.name)).size }]
  })
}

function readJson(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

type Manifest = { id: string; base: string; [k: string]: unknown }[]

function scanOutput(): Manifest {
  return fs
    .readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !isJunk(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((id) => {
      const dir = path.join(OUTPUT_DIR, id)
      const reports = Object.fromEntries(Object.entries(REPORTS).map(([k, f]) => [k, readJson(path.join(dir, f))]))
      return { id, base: `${URL_PREFIX}${encodeURIComponent(id)}/`, files: walk(dir), ...reports }
    })
}

function buildManifest(): Manifest {
  let runs: Manifest
  if (fs.existsSync(OUTPUT_DIR)) {
    runs = scanOutput()
    fs.writeFileSync(SNAPSHOT, JSON.stringify(runs, null, 1))
  } else {
    runs = (readJson(SNAPSHOT) as Manifest | null) ?? []
  }
  return REMOTE ? runs.map((r) => ({ ...r, base: REMOTE + r.base })) : runs
}

function serveOutput(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = decodeURIComponent((req.url ?? '').split('?')[0])
  if (!url.startsWith(URL_PREFIX)) return next()
  const file = path.resolve(OUTPUT_DIR, url.slice(URL_PREFIX.length))
  if (!file.startsWith(OUTPUT_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
  res.setHeader('Content-Length', fs.statSync(file).size)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  fs.createReadStream(file).pipe(res)
}

function runs(): Plugin {
  let outDir = 'dist'
  return {
    name: 'argus-runs',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
    },
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => (id === RESOLVED_ID ? `export default ${JSON.stringify(buildManifest())}` : undefined),
    configureServer(server) {
      server.middlewares.use(serveOutput)
      // A new run dropped into Output/ shows up on reload.
      server.watcher.add(OUTPUT_DIR)
      const refresh = (f: string) => {
        if (!f.startsWith(OUTPUT_DIR)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      server.watcher.on('add', refresh).on('unlink', refresh).on('addDir', refresh)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveOutput)
    },
    closeBundle() {
      if (process.env.VITE_SUPABASE_STORAGE_URL) return // Skip bundling heavy files into dist/ when serving from Supabase
      if (REMOTE || !fs.existsSync(OUTPUT_DIR)) return
      fs.cpSync(OUTPUT_DIR, path.join(outDir, 'Output'), { recursive: true, filter: (src) => !isJunk(path.basename(src)) })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), runs()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: { port: 5175 },
})

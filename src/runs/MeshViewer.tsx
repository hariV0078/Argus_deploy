import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import {
  ArrowsClockwise,
  ArrowsIn,
  ArrowsOut,
  Camera,
  Crosshair,
  Cube,
  Mountains,
  Ruler,
  Scissors,
  SquaresFour,
  Trash,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { gsap } from '../lib/gsap';
import { formatBytes } from './format';
import type { Run } from './types';

// 750k faces is too many to raycast linearly on every pointer move; a BVH makes
// the hover probe and the ruler instant.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree: typeof computeBoundsTree;
    disposeBoundsTree: typeof disposeBoundsTree;
  }
}

type Shading = 'texture' | 'clay' | 'height';
type View = 'oblique' | 'top' | 'side';
type Probe = { x: number; y: number; w: number; east: number; north: number; lat: number; lon: number; above: number };
type Measure = { a: THREE.Vector3; b: THREE.Vector3 | null };

const SIGNAL = new THREE.Color('#3ddcff');
const EMBER = new THREE.Color('#ff7a45');
const M_PER_DEG = 111_320;

// The GLB is ECEF minus an offset (model_origin.json), so "up" points away from
// the earth's centre, not along +Y. Rotate ECEF into local East-North-Up at the
// origin and map ENU onto three's axes: x = east, y = up, z = -north.
function ecefToScene(lat: number, lon: number) {
  const φ = THREE.MathUtils.degToRad(lat);
  const λ = THREE.MathUtils.degToRad(lon);
  const [sφ, cφ, sλ, cλ] = [Math.sin(φ), Math.cos(φ), Math.sin(λ), Math.cos(λ)];
  // prettier-ignore
  return new THREE.Matrix4().set(
    -sλ,       cλ,       0,   0, // east
    cφ * cλ,   cφ * sλ,  sφ,  0, // up
    sφ * cλ,   sφ * sλ,  -cφ, 0, // -north
    0,         0,        0,   1,
  );
}

// Elevation ramp from deep teal through the site's signal cyan to ember, with a
// little directional light so roofs and walls still read.
const heightMaterial = (min: number, max: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uMin: { value: min }, uMax: { value: max }, uLow: { value: new THREE.Color('#0b2a3a') }, uMid: { value: SIGNAL }, uHigh: { value: EMBER } },
    clipping: true,
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      varying float vH; varying vec3 vN;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vH = wp.y; vN = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      uniform float uMin, uMax; uniform vec3 uLow, uMid, uHigh;
      varying float vH; varying vec3 vN;
      void main() {
        #include <clipping_planes_fragment>
        float t = clamp((vH - uMin) / max(uMax - uMin, 1e-3), 0.0, 1.0);
        vec3 c = t < 0.5 ? mix(uLow, uMid, t * 2.0) : mix(uMid, uHigh, t * 2.0 - 1.0);
        float l = 0.55 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.4, 1.0, 0.3))), 0.0);
        gl_FragColor = vec4(c * l, 1.0);
      }`,
  });

async function fetchWithProgress(url: string, onProgress: (f: number) => void, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress(got / total);
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out.buffer;
}

type Stage = { name: 'download' | 'parse' | 'index' | 'ready' | 'error'; progress: number; error?: string };

export function MeshViewer({ run }: { run: Run }) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof createScene> | null>(null);

  const glb = run.files.find((f) => f.path === 'mesh/model.glb');
  const [stage, setStage] = useState<Stage>({ name: 'download', progress: 0 });
  const [shading, setShading] = useState<Shading>('texture');
  const [wire, setWire] = useState(false);
  const [spin, setSpin] = useState(false);
  const [tool, setTool] = useState<'probe' | 'ruler'>('probe');
  const [cut, setCut] = useState(1); // fraction of the height range kept
  const [probe, setProbe] = useState<Probe | null>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [full, setFull] = useState(false);
  const [extent, setExtent] = useState<{ w: number; d: number; h: number } | null>(null);

  // Scene lifetime follows the run.
  useEffect(() => {
    if (!host.current || !glb || !run.origin) return;
    const ac = new AbortController();
    const s = createScene(host.current);
    api.current = s;
    setStage({ name: 'download', progress: 0 });
    setProbe(null);
    setMeasure(null);

    (async () => {
      try {
        const buf = await fetchWithProgress(run.base + glb.path, (p) => setStage({ name: 'download', progress: p }), ac.signal);
        setStage({ name: 'parse', progress: 1 });
        const gltf = await new GLTFLoader().parseAsync(buf, '');
        if (ac.signal.aborted) return;
        setStage({ name: 'index', progress: 1 });
        // Let the label paint before the BVH build blocks the thread for a moment.
        await new Promise((r) => setTimeout(r, 30));
        const ext = s.setModel(gltf.scene, run.origin!.wgs84);
        setExtent(ext);
        setStage({ name: 'ready', progress: 1 });
      } catch (e) {
        if (!ac.signal.aborted) setStage({ name: 'error', progress: 0, error: (e as Error).message });
      }
    })();

    return () => {
      ac.abort();
      s.dispose();
      api.current = null;
    };
  }, [run, glb]);

  useEffect(() => api.current?.setShading(shading), [shading, stage.name]);
  const goTo = (v: View) => {
    setProbe(null);
    api.current?.view(v);
  };
  useEffect(() => api.current?.setWire(wire), [wire, stage.name]);
  useEffect(() => api.current?.setSpin(spin), [spin]);
  useEffect(() => api.current?.setCut(cut), [cut, stage.name]);
  useEffect(() => api.current?.setMeasure(measure), [measure]);

  // Pointer: hover probes the surface, click places ruler points.
  const onMove = useCallback(
    (e: PointerEvent) => {
      const s = api.current;
      if (!s || stage.name !== 'ready' || e.buttons) return;
      const hit = s.pick(e.clientX, e.clientY);
      if (!hit) return setProbe(null);
      const r = host.current!.getBoundingClientRect();
      setProbe({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, ...hit.geo });
      s.setCursor(hit.point);
    },
    [stage.name],
  );

  const down = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: PointerEvent) => (down.current = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    const s = api.current;
    const d = down.current;
    down.current = null;
    // A drag is an orbit, not a click.
    if (!s || !d || tool !== 'ruler' || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
    const hit = s.pick(e.clientX, e.clientY);
    if (!hit) return;
    setMeasure((m) => (!m || m.b ? { a: hit.local, b: null } : { a: m.a, b: hit.local }));
  };

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.current?.requestFullscreen();
  };
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // Keyboard shortcuts while the viewer has focus.
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      '1': () => setShading('texture'),
      '2': () => setShading('clay'),
      '3': () => setShading('height'),
      w: () => setWire((v) => !v),
      r: () => setSpin((v) => !v),
      m: () => setTool((t) => (t === 'ruler' ? 'probe' : 'ruler')),
      t: () => goTo('top'),
      o: () => goTo('oblique'),
      s: () => goTo('side'),
      f: toggleFull,
      escape: () => setMeasure(null),
    };
    if (map[k]) {
      e.preventDefault();
      map[k]();
    }
  };

  const dist = measure?.b ? measureOf(measure.a, measure.b) : null;
  const ready = stage.name === 'ready';

  if (!glb || !run.origin) {
    return <div className="grid aspect-video place-items-center rounded-[28px] bg-surface ring-1 ring-inset ring-line">This run has no mesh.</div>;
  }

  return (
    <div
      ref={frame}
      tabIndex={0}
      onKeyDown={onKey}
      data-lenis-prevent
      aria-label="3D mesh viewer. Drag to orbit, right-drag to pan, scroll to zoom."
      className="group/viewer relative h-[min(78dvh,820px)] min-h-[480px] w-full overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_50%_0%,#13202b_0%,#06080b_70%)] ring-1 ring-inset ring-line outline-none focus-visible:ring-signal/60 [&:fullscreen]:h-full [&:fullscreen]:rounded-none"
    >
      <div
        ref={host}
        className={`absolute inset-0 ${tool === 'ruler' && ready ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onPointerMove={onMove}
        onPointerLeave={() => setProbe(null)}
        onPointerDown={onDown}
        onPointerUp={onUp}
      />

      {/* Loading */}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-72 text-center">
            {stage.name === 'error' ? (
              <p className="text-sm text-ember">Could not load the mesh: {stage.error}</p>
            ) : (
              <>
                <p className="font-mono text-xs tracking-[0.2em] text-signal uppercase">
                  {stage.name === 'download' ? `Streaming ${formatBytes(glb.bytes)}` : stage.name === 'parse' ? 'Decoding mesh' : 'Indexing 750k faces'}
                </p>
                <div className="mt-4 h-px w-full bg-line">
                  <div className="scanline h-px transition-[width] duration-200" style={{ width: `${Math.round(stage.progress * 100)}%` }} />
                </div>
                <p className="mt-3 font-mono text-sm tabular-nums text-fg">{Math.round(stage.progress * 100)}%</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-left: run caption and extent */}
      <div className="pointer-events-none absolute top-5 left-5 max-w-[60%]">
        <p className="font-mono text-[11px] tracking-[0.2em] text-signal uppercase">{run.id.replace('_', ' ')} / {shading === 'texture' ? 'textured mesh' : shading === 'clay' ? 'clay geometry' : 'height map'}</p>
        {extent && (
          <p className="mt-1.5 font-mono text-xs text-fg-2 tabular-nums">
            {extent.w.toFixed(0)} x {extent.d.toFixed(0)} m footprint, {extent.h.toFixed(0)} m relief
          </p>
        )}
      </div>

      {/* Top-right: view presets */}
      <div className="absolute top-4 right-4 flex gap-1 rounded-full bg-ink/60 p-1 ring-1 ring-inset ring-white/10 backdrop-blur-xl">
        {(['oblique', 'top', 'side'] as View[]).map((v) => (
          <button
            key={v}
            disabled={!ready}
            onClick={() => goTo(v)}
            className="rounded-full px-3.5 py-1.5 text-xs text-fg-2 capitalize transition-colors hover:bg-white/10 hover:text-fg disabled:opacity-40"
          >
            {v}
          </button>
        ))}
      </div>

      {/* Hover probe */}
      {probe && tool === 'probe' && (
        <div
          className="pointer-events-none absolute z-10 w-52 rounded-2xl bg-ink/85 p-3 font-mono text-[11px] leading-5 text-fg-2 ring-1 ring-inset ring-white/10 backdrop-blur-xl tabular-nums"
          style={{ left: Math.min(probe.x + 18, probe.w - 220), top: Math.max(probe.y - 110, 8) }}
        >
          <Row k="Lat" v={`${probe.lat.toFixed(6)}°`} />
          <Row k="Lon" v={`${probe.lon.toFixed(6)}°`} />
          <Row k="Above low" v={`${probe.above.toFixed(1)} m`} />
          <div className="my-1.5 h-px bg-line" />
          <Row k="E / N" v={`${probe.east.toFixed(1)} / ${probe.north.toFixed(1)}`} />
        </div>
      )}

      {/* Ruler readout */}
      {tool === 'ruler' && ready && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-4 py-2 text-center font-mono text-xs text-fg ring-1 ring-inset ring-white/10 backdrop-blur-xl tabular-nums">
          {!measure ? (
            'Click a first point on the surface'
          ) : !dist ? (
            'Click a second point'
          ) : (
            <span className="flex items-center gap-4">
              <span>
                <span className="text-signal">{dist.d3.toFixed(2)} m</span> span
              </span>
              <span>{dist.h.toFixed(2)} m ground</span>
              <span>{dist.dz >= 0 ? '+' : ''}{dist.dz.toFixed(2)} m rise</span>
            </span>
          )}
        </div>
      )}

      {/* Bottom-left: section slider */}
      <div className="absolute bottom-20 left-4 flex items-center gap-3 rounded-full bg-ink/60 py-2 pr-4 pl-3 ring-1 ring-inset ring-white/10 backdrop-blur-xl sm:bottom-4">
        <Scissors size={16} className="text-fg-2" />
        <label className="font-mono text-[11px] text-fg-2" htmlFor="cut">
          Section
        </label>
        <input
          id="cut"
          type="range"
          min={0.02}
          max={1}
          step={0.005}
          value={cut}
          disabled={!ready}
          onChange={(e) => setCut(Number(e.target.value))}
          className="h-1 w-28 cursor-pointer accent-[#3ddcff] sm:w-40"
        />
        <span className="w-9 text-right font-mono text-[11px] text-fg tabular-nums">{Math.round(cut * 100)}%</span>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute right-4 bottom-4 flex flex-wrap items-center justify-end gap-1 rounded-full bg-ink/60 p-1 ring-1 ring-inset ring-white/10 backdrop-blur-xl">
        <Tool label="Photo texture (1)" on={shading === 'texture'} disabled={!ready} onClick={() => setShading('texture')}>
          <ImageIcon size={17} />
        </Tool>
        <Tool label="Clay shading (2)" on={shading === 'clay'} disabled={!ready} onClick={() => setShading('clay')}>
          <Cube size={17} />
        </Tool>
        <Tool label="Height map (3)" on={shading === 'height'} disabled={!ready} onClick={() => setShading('height')}>
          <Mountains size={17} />
        </Tool>
        <Tool label="Wireframe (W)" on={wire} disabled={!ready} onClick={() => setWire((v) => !v)}>
          <SquaresFour size={17} />
        </Tool>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Tool label="Surface probe" on={tool === 'probe'} disabled={!ready} onClick={() => setTool('probe')}>
          <Crosshair size={17} />
        </Tool>
        <Tool label="Measure distance (M)" on={tool === 'ruler'} disabled={!ready} onClick={() => setTool((t) => (t === 'ruler' ? 'probe' : 'ruler'))}>
          <Ruler size={17} />
        </Tool>
        {measure && (
          <Tool label="Clear measurement (Esc)" disabled={!ready} onClick={() => setMeasure(null)}>
            <Trash size={17} />
          </Tool>
        )}
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Tool label="Auto-rotate (R)" on={spin} disabled={!ready} onClick={() => setSpin((v) => !v)}>
          <ArrowsClockwise size={17} />
        </Tool>
        <Tool label="Save screenshot" disabled={!ready} onClick={() => api.current?.screenshot(`${run.id}.png`)}>
          <Camera size={17} />
        </Tool>
        <Tool label={full ? 'Exit full screen (F)' : 'Full screen (F)'} onClick={toggleFull}>
          {full ? <ArrowsIn size={17} /> : <ArrowsOut size={17} />}
        </Tool>
      </div>

      {/* Height legend */}
      {shading === 'height' && ready && extent && (
        <div className="pointer-events-none absolute top-16 right-5 flex items-stretch gap-2 font-mono text-[10px] text-fg-2 tabular-nums">
          <div className="w-2 rounded-full" style={{ background: 'linear-gradient(to top, #0b2a3a, #3ddcff, #ff7a45)' }} />
          <div className="flex h-36 flex-col justify-between">
            <span>+{extent.h.toFixed(0)} m</span>
            <span>0 m</span>
          </div>
        </div>
      )}

      {/* Hint, fades once the viewer is touched */}
      {ready && (
        <p className="pointer-events-none absolute bottom-[4.75rem] left-1/2 hidden -translate-x-1/2 font-mono text-[11px] text-fg-3 transition-opacity duration-500 group-focus-within/viewer:opacity-0 group-hover/viewer:opacity-0 md:block">
          Drag to orbit / right-drag to pan / scroll to zoom / keys 1 2 3 W M R T O S F
        </p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-fg-3">{k}</span>
      <span className="text-fg">{v}</span>
    </div>
  );
}

function Tool({ label, on, disabled, onClick, children }: { label: string; on?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-[0.92] disabled:opacity-40 ${
        on ? 'bg-signal text-signal-ink' : 'text-fg-2 hover:bg-white/10 hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function measureOf(a: THREE.Vector3, b: THREE.Vector3) {
  // Scene-local axes are ENU metres: x = east, y = up, z = -north.
  const d = b.clone().sub(a);
  return { d3: d.length(), h: Math.hypot(d.x, d.z), dz: d.y };
}

// ---------------------------------------------------------------------------
// Imperative three.js scene, kept out of React's render path.

function createScene(el: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 1, 20000);
  camera.position.set(900, 700, 900);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.6;
  controls.zoomToCursor = true;

  scene.add(new THREE.HemisphereLight(0xdfefff, 0x1a1410, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(600, 1200, 400);
  scene.add(sun);

  // Model sits in "site" space: ENU metres, centred on x/z, ground at y = 0.
  const site = new THREE.Group();
  scene.add(site);
  const overlay = new THREE.Group(); // ruler, cursor; drawn over the mesh
  site.add(overlay);

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  let meshes: THREE.Mesh[] = [];
  let textured: THREE.Material[] = [];
  let clay: THREE.Material | null = null;
  let height: THREE.ShaderMaterial | null = null;
  let wire: THREE.LineSegments[] = [];
  let box = new THREE.Box3();
  let originGeo = { lat: 0, lon: 0 };
  let siteShift = new THREE.Vector3(); // site-local + shift = ENU from the origin

  const cursor = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 1, 40),
    new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }),
  );
  cursor.rotation.x = -Math.PI / 2;
  cursor.renderOrder = 10;
  cursor.visible = false;
  overlay.add(cursor);

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    controls.update();
    // Overlay markers keep a constant on-screen size.
    const s = camera.position.distanceTo(controls.target) / 120;
    overlay.children.forEach((c) => c.userData.scaleWithView && c.scale.setScalar(s));
    renderer.render(scene, camera);
  };
  loop();

  const ro = new ResizeObserver(() => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(el);

  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  const ndc = new THREE.Vector2();

  function setModel(root: THREE.Object3D, origin: { lat: number; lon: number }) {
    originGeo = { lat: origin.lat, lon: origin.lon };
    const enu = new THREE.Group();
    enu.matrixAutoUpdate = false;
    enu.matrix.copy(ecefToScene(origin.lat, origin.lon));
    enu.add(root);
    site.add(enu);
    site.updateMatrixWorld(true);

    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const g = o.geometry as THREE.BufferGeometry;
      g.computeVertexNormals();
      g.computeBoundsTree();
      // Photogrammetry textures already carry the scene's light; unlit shows them as captured.
      const src = o.material as THREE.MeshStandardMaterial;
      const m = new THREE.MeshBasicMaterial({ map: src.map, clippingPlanes: [clip], side: THREE.DoubleSide });
      src.dispose();
      o.material = m;
      textured.push(m);
      meshes.push(o);
    });

    box = new THREE.Box3().setFromObject(enu, true);
    const c = box.getCenter(new THREE.Vector3());
    siteShift = new THREE.Vector3(c.x, box.min.y, c.z);
    site.position.copy(siteShift).negate();
    site.updateMatrixWorld(true);
    box.translate(site.position);

    clay = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.85, metalness: 0, flatShading: true, clippingPlanes: [clip], side: THREE.DoubleSide });
    height = heightMaterial(box.min.y, box.max.y);
    height.clippingPlanes = [clip];
    height.side = THREE.DoubleSide;

    const size = box.getSize(new THREE.Vector3());
    grid(size);
    view('oblique', false);
    return { w: size.x, d: size.z, h: size.y };
  }

  function grid(size: THREE.Vector3) {
    const span = Math.ceil(Math.max(size.x, size.z) * 1.3 / 100) * 100;
    const g = new THREE.GridHelper(span, span / 50, 0x1d3a46, 0x121b23);
    g.position.y = -0.5;
    (g.material as THREE.Material).transparent = true;
    (g.material as THREE.Material).opacity = 0.7;
    scene.add(g);
  }

  function setShading(s: Shading) {
    if (!meshes.length) return;
    meshes.forEach((m, i) => (m.material = s === 'texture' ? textured[i] : s === 'clay' ? clay! : height!));
  }

  function setWire(on: boolean) {
    if (!meshes.length) return;
    if (on && !wire.length) {
      // Edges of a 750k-face mesh are a lot of lines; build them once, on demand.
      wire = meshes.map((m) => {
        const l = new THREE.LineSegments(
          new THREE.WireframeGeometry(m.geometry),
          new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.18, clippingPlanes: [clip], depthWrite: false }),
        );
        l.raycast = () => {};
        m.add(l);
        return l;
      });
    }
    wire.forEach((l) => (l.visible = on));
  }

  function setCut(f: number) {
    if (box.isEmpty()) return;
    clip.constant = box.min.y + (box.max.y - box.min.y) * f + (f >= 1 ? 1e6 : 0);
  }

  function setSpin(on: boolean) {
    controls.autoRotate = on;
  }

  function view(v: View, animate = true) {
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.z);
    const target = new THREE.Vector3(0, size.y * 0.15, 0);
    const pos =
      v === 'top' ? new THREE.Vector3(0, r * 1.25, 0.01) : v === 'side' ? new THREE.Vector3(0, size.y * 0.6 + 40, r * 1.05) : new THREE.Vector3(r * 0.55, r * 0.55, r * 0.7);
    controls.maxDistance = r * 4;
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(pos);
      controls.target.copy(target);
      return;
    }
    gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: 1.4, ease: 'expo.inOut', overwrite: true });
    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.4, ease: 'expo.inOut', overwrite: true });
  }

  function pick(cx: number, cy: number) {
    if (!meshes.length) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    // Respect the section cut: hits above it are invisible.
    const hit = raycaster.intersectObjects(meshes, false).find((h) => clip.distanceToPoint(h.point) >= 0);
    if (!hit) return null;
    const local = site.worldToLocal(hit.point.clone());
    const enu = local.clone().add(siteShift); // relative to model_origin
    const east = enu.x;
    const north = -enu.z;
    const geo = {
      east,
      north,
      lat: originGeo.lat + north / M_PER_DEG,
      lon: originGeo.lon + east / (M_PER_DEG * Math.cos(THREE.MathUtils.degToRad(originGeo.lat))),
      // Absolute height is only as good as the drone's barometer; height above
      // the lowest surface point is what a viewer can actually check.
      above: hit.point.y - box.min.y,
    };
    return { point: hit.point, local: hit.point.clone(), geo };
  }

  function setCursor(p: THREE.Vector3) {
    cursor.visible = true;
    cursor.userData.scaleWithView = true;
    cursor.position.copy(site.worldToLocal(p.clone())).y += 0.3;
  }

  let ruler: THREE.Object3D[] = [];
  function setMeasure(m: Measure | null) {
    ruler.forEach((o) => {
      overlay.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    ruler = [];
    if (!m) return;
    const toSite = (p: THREE.Vector3) => site.worldToLocal(p.clone());
    const dot = (p: THREE.Vector3) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 12), new THREE.MeshBasicMaterial({ color: EMBER, depthTest: false }));
      s.position.copy(toSite(p));
      s.renderOrder = 11;
      s.userData.scaleWithView = true;
      return s;
    };
    ruler.push(dot(m.a));
    if (m.b) {
      ruler.push(dot(m.b));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([toSite(m.a), toSite(m.b)]),
        new THREE.LineBasicMaterial({ color: EMBER, depthTest: false }),
      );
      line.renderOrder = 11;
      ruler.push(line);
    }
    ruler.forEach((o) => overlay.add(o));
  }

  function screenshot(name: string) {
    renderer.render(scene, camera);
    const a = document.createElement('a');
    a.href = renderer.domElement.toDataURL('image/png');
    a.download = name;
    a.click();
  }

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line) {
        o.geometry.disposeBoundsTree?.();
        o.geometry.dispose();
      }
    });
    [...textured, clay, height].forEach((m) => {
      if (m && 'map' in m) (m as THREE.MeshBasicMaterial).map?.dispose();
      m?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
    meshes = [];
    textured = [];
    wire = [];
  }

  return { setModel, setShading, setWire, setCut, setSpin, view, pick, setCursor, setMeasure, screenshot, dispose };
}

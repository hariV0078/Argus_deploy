// Every number on the field report is measured, taken from backend/ARCHITECTURE.md:
// the Toledo, Ohio runs (86 frames, Sep 27 timings, Sep 29 sizes) and the
// AirLock+ DJI_1003 run over downtown Austin (Sep 29).

// Chart hues: stepped-down signal and ember so both sit in the dark-mode
// lightness band. Validated against the #10151c surface (dataviz validate_palette:
// CVD ΔE 19.5, normal-vision ΔE 28.6, contrast >= 3:1).
export const CHART = {
  a: '#14a2c6',
  b: '#e5683a',
  rest: '#3b4550',
} as const;

export const STAGES = ['Ingest', 'Masking', 'SfM', 'Dense stereo', 'Mesh and GPS align', 'Export', 'Other'] as const;
export const STEREO = STAGES.indexOf('Dense stereo');

// Minutes per stage. Toledo SfM = SIFT 15 s + matching 9 s + SfM 102 s; "Other"
// is undistortion plus whatever the per-phase table does not account for.
export const RUNS = [
  {
    id: 'toledo',
    name: 'Toledo, Ohio',
    detail: '86 frames, 3840 x 2880',
    minutes: [0.17, 0.73, 2.1, 8.5, 2.53, 0.55, 0.32],
    total: 14.9,
  },
  {
    id: 'austin',
    name: 'Austin, Texas',
    detail: '150 frames, 1920 x 1080',
    minutes: [1.7, 0.7, 4.3, 8.5, 3.3, 2.5, 0.8],
    total: 21.8,
  },
] as const;

export const BUDGET_MIN = 20; // POST /api/pipeline/run default time_budget_min

// Camera centres vs onboard GPS after alignment, metres.
export const ACCURACY = [
  { label: 'Spatial matching, incremental SfM', note: 'Toledo, shipped', h: 1.34, v: 1.22 },
  { label: 'Sequential matching, global SfM', note: 'Toledo', h: 1.26, v: 4.12 },
  { label: 'Two cameras, one calibration', note: 'Toledo, FC300X + FC350', h: 2.43, v: 2.14 },
  { label: 'Global SfM, GPS-validated', note: 'Austin', h: 1.84, v: 1.03 },
] as const;

export const FIGURES = [
  { value: 14.9, digits: 1, unit: 'min', label: 'Footage to exported model on the Toledo set' },
  { value: 1.34, digits: 2, unit: 'm', label: 'Horizontal agreement with the onboard GPS' },
  { value: 4.9, digits: 1, unit: 'cm', label: 'Ground sample distance at survey altitude' },
  { value: 5.7, digits: 1, unit: 'M', label: 'Points in the cleaned dense cloud' },
] as const;

// Surface model: 76% measured, 21% filled from the mesh; the rest is not broken down.
export const DSM = [
  { label: 'Measured', value: 76, display: '76%', color: CHART.a },
  { label: 'Filled from the mesh', value: 21, display: '21%', color: CHART.b },
  { label: 'Remainder', value: 3, display: '3%', color: CHART.rest },
];

export const TEXTURE = [
  { label: 'Unoccluded view', value: 722_698, display: '722,698', color: CHART.a },
  { label: 'Best in-frame view', value: 27_302, display: '27,302', color: CHART.b },
  { label: 'Untextured', value: 0, display: '0', color: CHART.rest },
];

export const SPLAT = { gaussians: '500k', minutes: 9.5, psnr: 20.1, vramGb: 1.87, gpuGb: 8 };

// Sizes in MB from the Sep 29 Toledo run.
export const OUTPUTS = [
  {
    group: 'Mesh',
    files: [
      { name: 'model.obj', what: 'OBJ with 2 texture pages of 4096 px', mb: 173 },
      { name: 'model.glb', what: 'GLB, textures embedded, 750k faces', mb: 64 },
      { name: 'model.fbx', what: 'FBX, textures embedded', mb: 62 },
    ],
  },
  {
    group: 'Point cloud',
    files: [
      { name: 'dense.ply', what: 'PLY in ECEF, outlier-cleaned', mb: 154 },
      { name: 'dense.las', what: 'LAS, 5.7M points', mb: 148 },
    ],
  },
  {
    group: 'Rasters',
    files: [
      { name: 'orthophoto.tif', what: 'GeoTIFF true orthophoto at 4.7 cm', mb: 46 },
      { name: 'dsm.tif', what: 'GeoTIFF surface model in UTM', mb: 12 },
    ],
  },
  {
    group: 'Gaussian splat, off the clock',
    files: [{ name: 'splat/scene.ply', what: 'INRIA 3DGS layout, 500k Gaussians', mb: 124 }],
  },
] as const;
export const OUTPUT_MAX_MB = 173;

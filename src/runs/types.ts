// Shapes of the reports the backend writes next to each run's outputs
// (see vite.config.ts, which inlines them into `virtual:runs`).

export type Phase = { phase: string; seconds: number; rc: number; timed_out: boolean };
export type Axis = { mean_m: number; sigma_m: number; rmse_m: number; max_abs_m: number };

export type Run = {
  id: string;
  base: string;
  files: { path: string; bytes: number }[];
  timings: { total_s: number; budget_s: number; frames_in: number; frames_used: number; phases: Phase[] } | null;
  accuracy: {
    frames_registered: number;
    frames_input: number;
    mean_reprojection_error_px: number;
    gsd_m_estimate: number;
    camera_vs_gps: { east: Axis; north: Axis; up: Axis; horizontal_rmse_m: number };
  } | null;
  meshStats: {
    points: number;
    vertices: number;
    faces: number;
    poisson_depth: number;
    interior_holes: number;
    holes_before_fill: number;
    pieces: number;
    t_total_s: number;
  } | null;
  textureStats: {
    faces: number;
    pages: number;
    texel_m: number;
    views_used: number;
    faces_clear_view: number;
    faces_fallback_view: number;
    faces_vertex_colour: number;
  } | null;
  summary: { elapsed_min: number } | null;
  origin: { ecef_offset: { x: number; y: number; z: number }; wgs84: { lat: number; lon: number; alt_m: number } } | null;
  bounds: { epsg: number; sw: { lat: number; lon: number }; ne: { lat: number; lon: number } } | null;
};


export type Shape = "circle" | "rectangle" | "heart";
export type Locale = "uz" | "ru" | "en";
export interface RegionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface PortraitSettings {
  enabled: boolean;
  face: RegionBox;
  background: number;
  localContrast: number;
}
export interface Pin {
  id: number;
  x: number;
  y: number;
}
export interface MaterialProfile {
  id: string;
  version: number;
  provisional: boolean;
  shape: Shape;
  widthMm: number;
  heightMm: number;
  pins: Pin[];
  shaftMm: number;
  threadMm: number;
  opacity: number;
  maxLines: number;
  minPinGap: number;
  stockMeters: number;
  baseColor: string;
  colors: string[];
  wrapAllowanceMm: number;
  wasteFraction: number;
}
export interface EditParams {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  brightness: number;
  contrast: number;
}
export interface Segment {
  color: string;
  path: number[];
}
export interface Instruction {
  schema: "iprasm.instruction/1";
  algorithm:
    | "greedy-optical/1"
    | "greedy-optical/2"
    | "greedy-optical/3"
    | "greedy-optical/4"
    | "density-optical/5";
  id: string;
  createdAt: string;
  imageHash: string;
  sequenceHash: string;
  profile: MaterialProfile;
  segments: Segment[];
  params: {
    resolution: number;
    requestedLines: number;
    mode: "dark" | "light" | "color";
    portrait?: PortraitSettings;
    stockPolicy?: "estimate";
    parentSequenceHash?: string;
    refinementStage?: number;
    optimization?: {
      kind?: "density-coordinate" | "optical-coordinate";
      order?: "dispersed-v1";
      overshoot?: "target-luminance-v1";
      pairLimit?: 32;
      pinDegreeLimit?: 160;
      edgeWeight?: number;
      sweeps?: number;
      lookahead: number;
      coarseScale: number;
      minimumRelativeGain: number;
    };
  };
  metrics: {
    densityFit?: {
      removedConnections?: number;
      sweeps: number;
      evaluations: number;
      fittedConnections: number;
      routingConnections: number;
    };
    baselineMse: number;
    reconstructionMse: number;
    estimatedMeters: number;
    perColorMeters: Record<string, number>;
    lines: number;
    stoppedReason:
      | "requested"
      | "no-improvement"
      | "stock"
      | "compute-limit"
      | "quality-plateau";
    stockShortfallMeters?: number;
    weightedError?: { baseline: number; final: number };
    regions?: {
      baseline: Record<
        string,
        { mse: number; edgeMse: number; pixels: number }
      >;
      final: Record<string, { mse: number; edgeMse: number; pixels: number }>;
    };
    durationMs?: number;
    lookaheadPairs?: number;
    peakCacheBytes?: number;
    refinement?: {
      nextAt: number;
      evaluations: number;
      replacements: number;
      gain: number;
      reason: "plateau" | "compute-limit";
    };
  };
}
export interface Step {
  index: number;
  from: number;
  to: number;
  color: string;
  segment: number;
  segmentStart: boolean;
}
export interface Progress {
  sequenceHash: string;
  confirmed: number;
  revision: number;
  updatedAt: string;
}
export interface Project {
  id: string;
  name: string;
  instruction: Instruction;
  progress: Progress;
  edits: EditParams;
  deletedAt?: string;
}
export interface ProjectFile {
  schema: "iprasm.project/1";
  project: Project;
}
export const DEFAULT_EDITS: EditParams = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  brightness: 0,
  contrast: 1,
};

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
  detailStyle?: "contour-preparation/1" | "contour-preparation/2";
  backgroundMode?: "soften" | "manual-light";
  // 64×64 one-bit erase mask, hexadecimal. Contains selections, never photo pixels.
  backgroundMask?: string;
  // Recover source grayscale/contrast beneath explicitly restored subject.
  foregroundMask?: string;
  // Independent manual boxes on the processed target. 0 and 1 are the first/last sample centers.
  regions?: {
    reference: "processed-target/sample-centers-v1";
    placement?: "manual" | "proportional-estimate";
    eyes: RegionBox;
    nose: RegionBox;
    mouth: RegionBox;
  };
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
  // Optional for legacy compatibility. Board top is y=0; IDs increase clockwise.
  pinLayout?: CircleLayout;
  pinBasis?: import("./pin-basis").PinBasis;
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
export interface CircleLayout {
  version: "circle-phase/1";
  phaseDegreesClockwise: number;
  reference: "board-top/y-down/clockwise";
  radiusNormalized: 0.48;
  templateVersion: "radial-leaders/1";
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
    | "density-optical/5"
    | "continuous-guarded/6"
    | "density-multiscale/7"
    | "density-physical/8"
    | "assembly-prune/9"
    | "density-anatomy/10"
    | "density-pin-basis/11";
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
    simplification?: import("./simplify").SimplificationSettings;
    optimization?: {
      kind?: "density-coordinate" | "optical-coordinate";
      order?: "dispersed-v1";
      overshoot?: "target-luminance-v1";
      pairLimit?: 32;
      pinDegreeLimit?: 160;
      contrastScales?: [1, 2, 4];
      contrastPhysical?: import("./physical-contrast").PhysicalContrastSettings;
      anatomy?: import("./anatomical-importance").AnatomicalImportance;
      edgeWeight?: number;
      sweeps?: number;
      convergence?: {
        version: "density-convergence/1";
        rootSequenceHash: string;
        originalCheckpointChecksum: string;
        priorSweeps: number;
        priorSweepLimit: number;
        plannedTotalSweeps: number;
        additionalSweeps: number;
        snapshot: boolean;
      };
      exchange?: import("./density").ChordExchangeSettings;
      lookahead: number;
      coarseScale: number;
      minimumRelativeGain: number;
    };
  };
  metrics: {
    exchange?: {
      evaluations: number;
      accepted: number;
      proposals: number;
      poolEvaluations: number;
      proposalEvaluations: number;
      stop: "evaluation-limit" | "candidate-pool-exhausted";
    };
    densityFit?: {
      removedConnections?: number;
      routingPairs?: { from: number; to: number; count: number }[];
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
    physicalContrastBytes?: number;
    simplificationDifferences?: Record<
      string,
      import("./simplify").RegionDifference
    >;
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
  folder?: string;
  bookmarks?: { step: number; label: string }[];
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

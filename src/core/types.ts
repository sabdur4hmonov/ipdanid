export type Shape = "circle" | "rectangle" | "heart";
export type Locale = "uz" | "ru" | "en";
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
  algorithm: "greedy-optical/1" | "greedy-optical/2";
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
  };
  metrics: {
    baselineMse: number;
    reconstructionMse: number;
    estimatedMeters: number;
    perColorMeters: Record<string, number>;
    lines: number;
    stoppedReason: "requested" | "no-improvement" | "stock";
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

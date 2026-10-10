import { generatePaint, type PaintColor } from "./core/paint";
self.onmessage = async ({
  data,
}: MessageEvent<{
  pixels: Uint8Array;
  columns: number;
  rows: number;
  pitch: number;
  minimum: number;
  palette: PaintColor[];
}>) => {
  try {
    self.postMessage({
      guide: await generatePaint(
        data.pixels,
        data.columns,
        data.rows,
        data.pitch,
        data.minimum,
        data.palette,
      ),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

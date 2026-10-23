import { useEffect, useState } from "react";
import type { PersonMask } from "./core/person-mask";
// Keep the reference arithmetic, but never run the full-resolution CLAHE/unsharp
// inside React render. A stale worker cannot replace a newer edited cutout.
export function usePhotoTone(
  source: HTMLCanvasElement | undefined,
  mask: PersonMask | undefined,
  enabled: boolean,
) {
  const [value, setValue] = useState<{
    source: HTMLCanvasElement;
    mask: PersonMask;
    canvas?: HTMLCanvasElement;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!source || !mask || !enabled) return;
    let live = true;
    const worker = new Worker(
      new URL("./photo-tone.worker.ts", import.meta.url),
      { type: "module" },
    );
    const fail = () => {
      if (live) setValue({ source, mask, failed: true });
      worker.terminate();
    };
    worker.onmessage = ({ data }) => {
      if (!live) return;
      if (
        data.error ||
        !(data.rgba instanceof Uint8ClampedArray) ||
        data.rgba.length !== source.width * source.height * 4
      ) {
        fail();
        return;
      }
      const c = document.createElement("canvas");
      c.width = source.width;
      c.height = source.height;
      c.getContext("2d")!.putImageData(
        new ImageData(data.rgba, c.width, c.height),
        0,
        0,
      );
      setValue({ source, mask, canvas: c });
      worker.terminate();
    };
    worker.onerror = fail;
    const rgba = source
      .getContext("2d")!
      .getImageData(0, 0, source.width, source.height).data;
    worker.postMessage(
      { rgba, width: source.width, height: source.height, mask },
      [rgba.buffer],
    );
    return () => {
      live = false;
      worker.terminate();
    };
  }, [source, mask, enabled]);
  return value?.source === source && value?.mask === mask && enabled
    ? value
    : undefined;
}

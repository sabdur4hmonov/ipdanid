import { segmentPeople } from "./person-background";
import { detectSourceFaces } from "./face-detection";
import { cleanupBackground } from "./background-cleanup";
import type { SourceFace } from "./core/face-features";
const scope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
let latest = 0;
self.onmessage = async (
  e: MessageEvent<{ id: number; image?: ImageBitmap; cancel?: boolean }>,
) => {
  const { id, image, cancel } = e.data;
  if (cancel) {
    if (latest === id) latest = 0;
    return;
  }
  latest = id;
  if (!image) return;
  try {
    let mask = await segmentPeople(image, () => latest === id);
    if (latest !== id) return;
    let cleanupUnavailable = false;
    try {
      mask = await cleanupBackground(image, mask, () => latest === id);
    } catch {
      cleanupUnavailable = true;
    }
    if (latest !== id) return;
    let faces: SourceFace[] = [];
    let faceUnavailable = false;
    try {
      faces = await detectSourceFaces(image);
    } catch {
      faces = [];
      faceUnavailable = true;
    }
    if (latest !== id) return;
    scope.postMessage(
      { id, mask, faces, faceUnavailable, cleanupUnavailable },
      [mask.values.buffer as ArrayBuffer],
    );
  } catch (error) {
    if (latest === id)
      scope.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
  } finally {
    image.close();
  }
};

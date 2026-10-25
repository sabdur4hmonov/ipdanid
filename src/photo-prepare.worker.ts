import { segmentPeople } from "./person-background";
import { detectSourceFaces, closeFaceDetector } from "./face-detection";
import { cleanupBackground, segmentPhotoSubject } from "./background-cleanup";
import type { CutoutChoice } from "./core/semantic-cutout";
import type { SourceFace } from "./core/face-features";
import { unturnMask, type QuarterTurn } from "./core/photo-orientation";
const scope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
let latest = 0;
self.onmessage = async (
  e: MessageEvent<{
    id: number;
    image?: ImageBitmap;
    cancel?: boolean;
    dispose?: boolean;
    choice?: CutoutChoice;
  }>,
) => {
  const { id, image, cancel, dispose } = e.data;
  if (dispose) {
    latest = 0;
    await closeFaceDetector();
    self.close();
    return;
  }
  if (cancel) {
    if (latest === id) latest = 0;
    return;
  }
  latest = id;
  if (!image) return;
  try {
    let faces: SourceFace[] = [],
      faceUnavailable = false;
    const orientation: { turn: QuarterTurn } = { turn: 0 };
    const choice = e.data.choice ?? "people";
    try {
      if (choice === "people" || choice === "auto")
        faces = await detectSourceFaces(
          image,
          () => latest === id,
          orientation,
        );
    } catch {
      faceUnavailable = true;
    }
    if (latest !== id) return;
    if (choice !== "people") {
      const semantic = await segmentPhotoSubject(
        image,
        choice,
        () => latest === id,
      );
      if (latest !== id) return;
      // A face detector alone cannot decide that a pet is a human. Use the
      // semantic class first; refine actual human foreground with the selfie model.
      if (choice !== "auto" || !semantic.refinePeople) {
        scope.postMessage(
          {
            id,
            mask: semantic.mask,
            subjectKind: semantic.subjectKind,
            faces:
              choice === "auto" && semantic.subjectKind === "people" ? faces : [],
            faceUnavailable,
            cleanupUnavailable: false,
            analysisTurn: 0,
          },
          [semantic.mask.values.buffer as ArrayBuffer],
        );
        return;
      }
    }
    let input: ImageBitmap | OffscreenCanvas = image;
    if (orientation.turn) {
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const w = Math.max(1, Math.round(image.width * scale)),
        h = Math.max(1, Math.round(image.height * scale));
      const canvas = new OffscreenCanvas(
        orientation.turn % 2 ? h : w,
        orientation.turn % 2 ? w : h,
      );
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((orientation.turn * Math.PI) / 2);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      input = canvas;
    }
    let mask = await segmentPeople(input, () => latest === id);
    if (latest !== id) return;
    let cleanupUnavailable = false;
    try {
      mask = await cleanupBackground(input, mask, () => latest === id);
    } catch {
      cleanupUnavailable = true;
    }
    if (latest !== id) return;
    mask = unturnMask(mask, orientation.turn);
    if (latest !== id) return;
    scope.postMessage(
      {
        id,
        mask,
        faces,
        faceUnavailable,
        cleanupUnavailable,
        analysisTurn: orientation.turn,
        ...(choice === "auto" ? { subjectKind: "people" } : {}),
      },
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

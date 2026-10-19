import { hash } from "./engine";
import { tutorialIds, type TutorialId } from "./tutorials";
export type TutorialMedia = {
  tutorial: TutorialId;
  step: number;
  path: string;
  bytes: number;
  sha256: string;
  type: "image/png" | "image/jpeg" | "video/mp4" | "video/webm";
  credit: string;
  license: string;
};
export function tutorialMediaManifest(value: unknown): TutorialMedia[] {
  const root = value as { schema: string; assets: TutorialMedia[] };
  if (
    !root ||
    root.schema !== "iprasm.tutorial-media/1" ||
    !Array.isArray(root.assets) ||
    root.assets.length > 20
  )
    throw Error("tutorial/media");
  const paths = new Set<string>(),
    slots = new Set<string>();
  for (const a of root.assets) {
    const ext = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "video/mp4": "mp4",
      "video/webm": "webm",
    }[a?.type];
    if (
      !a ||
      !tutorialIds.includes(a.tutorial) ||
      !Number.isInteger(a.step) ||
      a.step < 1 ||
      a.step > (a.tutorial === "ebru" ? 7 : 6) ||
      typeof a.path !== "string" ||
      !/^\/tutorials\/owned\/[a-z0-9-]{1,60}\.(png|jpg|mp4|webm)$/.test(
        a.path,
      ) ||
      !ext ||
      !a.path.endsWith("." + ext) ||
      !Number.isSafeInteger(a.bytes) ||
      a.bytes < 1 ||
      a.bytes > 10_000_000 ||
      !/^[a-f0-9]{64}$/.test(a.sha256) ||
      typeof a.credit !== "string" ||
      !a.credit.trim() ||
      a.credit.length > 160 ||
      typeof a.license !== "string" ||
      !a.license.trim() ||
      a.license.length > 240 ||
      paths.has(a.path) ||
      slots.has(a.tutorial + ":" + a.step)
    )
      throw Error("tutorial/media");
    paths.add(a.path);
    slots.add(a.tutorial + ":" + a.step);
  }
  if (root.assets.reduce((s, a) => s + a.bytes, 0) > 30_000_000)
    throw Error("tutorial/media");
  return root.assets;
}
export async function tutorialMediaBlob(
  asset: TutorialMedia,
  signal: AbortSignal,
) {
  tutorialMediaManifest({ schema: "iprasm.tutorial-media/1", assets: [asset] });
  const response = await fetch(asset.path, {
    signal,
    redirect: "error",
    credentials: "omit",
  });
  if (!response.ok) throw Error("tutorial/media");
  const reader = response.body?.getReader();
  if (!reader) throw Error("tutorial/media");
  const bytes = new Uint8Array(asset.bytes);
  let used = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (used + value.length > bytes.length) throw Error("tutorial/media");
      bytes.set(value, used);
      used += value.length;
    }
    if (
      used !== bytes.length ||
      (await hash(bytes)) !== asset.sha256 ||
      signal.aborted
    )
      throw Error("tutorial/media");
    return new Blob([bytes], { type: asset.type });
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

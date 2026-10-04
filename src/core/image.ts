import type { EditParams } from "./types";
export const MAX_FILE_BYTES = 15 * 1024 * 1024,
  MAX_PIXELS = 24_000_000;
export function imageDimensions(b: Uint8Array): {
  width: number;
  height: number;
  type: "image/png" | "image/jpeg";
} {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (
    b.length >= 24 &&
    b.slice(0, 8).every((n, i) => n === [137, 80, 78, 71, 13, 10, 26, 10][i])
  )
    return {
      width: v.getUint32(16),
      height: v.getUint32(20),
      type: "image/png",
    };
  if (b[0] === 255 && b[1] === 216) {
    let p = 2;
    while (p + 4 <= b.length) {
      if (b[p++] !== 255) continue;
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const len = v.getUint16(p);
      if (len < 2 || p + len > b.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        len >= 8
      )
        return {
          width: v.getUint16(p + 5),
          height: v.getUint16(p + 3),
          type: "image/jpeg",
        };
      p += len;
    }
  }
  throw new Error("Use a valid JPEG or PNG image.");
}
export async function loadPhoto(file: File): Promise<ImageBitmap> {
  if (!file.size || file.size > MAX_FILE_BYTES)
    throw new Error("Maximum file size is 15 MB.");
  const dimensions = imageDimensions(new Uint8Array(await file.arrayBuffer()));
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width * dimensions.height > MAX_PIXELS ||
    dimensions.width > 12000 ||
    dimensions.height > 12000
  )
    throw new Error(
      "Image exceeds safe decoded dimensions (24 MP / 12,000 px).",
    );
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    bitmap.close();
    throw new Error("Decoded image limit exceeded");
  }
  return bitmap;
}
export function prepare(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  e: EditParams,
  aspect = 1,
) {
  const n = ctx.canvas.width;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, n, n);
  ctx.scale(1, aspect);
  ctx.translate(n / 2, n / aspect / 2);
  ctx.rotate((e.rotation * Math.PI) / 180);
  const scale = Math.max(n / image.width, n / aspect / image.height) * e.zoom;
  ctx.drawImage(
    image,
    (-image.width * scale) / 2 + e.panX * n,
    (-image.height * scale) / 2 + (e.panY * n) / aspect,
    image.width * scale,
    image.height * scale,
  );
  ctx.restore();
  const data = ctx.getImageData(0, 0, n, n);
  for (let k = 0; k < data.data.length; k += 4)
    for (let c = 0; c < 3; c++)
      data.data[k + c] = Math.max(
        0,
        Math.min(
          255,
          (data.data[k + c] - 128) * e.contrast + 128 + e.brightness,
        ),
      );
  ctx.putImageData(data, 0, 0);
  return Uint8Array.from(
    { length: n * n * 3 },
    (_, i) => data.data[Math.floor(i / 3) * 4 + (i % 3)],
  );
}
export function suitability(pixels: Uint8Array, n: number) {
  let sum = 0,
    sum2 = 0,
    gradient = 0,
    shadow = 0;
  const gray = Float32Array.from(
    { length: n * n },
    (_, i) =>
      0.2126 * pixels[i * 3] +
      0.7152 * pixels[i * 3 + 1] +
      0.0722 * pixels[i * 3 + 2],
  );
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    sum2 += gray[i] ** 2;
    if (gray[i] < 25) shadow++;
    if (i % n) gradient += Math.abs(gray[i] - gray[i - 1]);
  }
  return {
    contrast: Math.sqrt(sum2 / gray.length - (sum / gray.length) ** 2),
    edgeVariation: gradient / gray.length,
    shadowFraction: shadow / gray.length,
  };
}
export function sampleCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#f5eedb";
  x.fillRect(0, 0, 512, 512);
  x.fillStyle = "#bcb4a0";
  x.beginPath();
  x.ellipse(256, 500, 175, 165, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#32352e";
  x.beginPath();
  x.ellipse(250, 226, 120, 165, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#ddd0b6";
  x.beginPath();
  x.ellipse(261, 247, 92, 130, -0.1, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#3c3a32";
  x.beginPath();
  x.ellipse(226, 212, 11, 8, 0, 0, 7);
  x.ellipse(296, 207, 11, 8, 0, 0, 7);
  x.fill();
  x.strokeStyle = "#554d42";
  x.lineWidth = 8;
  x.beginPath();
  x.moveTo(260, 220);
  x.lineTo(246, 270);
  x.lineTo(267, 272);
  x.moveTo(226, 306);
  x.quadraticCurveTo(262, 322, 298, 300);
  x.stroke();
  x.fillStyle = "#30342d";
  x.beginPath();
  x.ellipse(245, 119, 105, 74, -0.15, 0, 7);
  x.fill();
  return c;
}

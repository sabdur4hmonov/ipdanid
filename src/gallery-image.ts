import { loadPhoto } from "./core/image";
export async function prepareGalleryImage(file: File) {
  const image = await loadPhoto(file);
  try {
    const scale = Math.min(1, 768 / Math.max(image.width, image.height)),
      width = Math.round(image.width * scale),
      height = Math.round(image.height * scale);
    if (width < 96 || height < 96) throw Error("gallery/image");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw Error("gallery/image");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);
    const value = canvas.toDataURL("image/png").split(",")[1];
    if (!value || value.length > 3_333_336) throw Error("gallery/image");
    return value;
  } finally {
    image.close();
  }
}

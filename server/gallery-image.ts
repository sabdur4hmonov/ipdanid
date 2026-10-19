import { deflateSync, inflateSync } from "node:zlib";
import { DomainError } from "./store";
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function pngCrc(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
function chunk(type: string, bytes: Buffer) {
  const b = Buffer.alloc(bytes.length + 12);
  b.writeUInt32BE(bytes.length);
  b.write(type, 4, "ascii");
  bytes.copy(b, 8);
  b.writeUInt32BE(pngCrc(b.subarray(4, b.length - 4)), b.length - 4);
  return b;
}
export function galleryPng(rgb: Uint8Array, w: number, h: number) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w * h > 1_048_576 ||
    rgb.length !== w * h * 3
  )
    throw new DomainError("gallery/image");
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w);
  header.writeUInt32BE(h, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++)
    rows.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c,
    pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
export function decodeGalleryPng(bytes: Buffer) {
  const invalid = () => {
    throw new DomainError("gallery/image");
  };
  if (
    bytes.length < 45 ||
    bytes.length > 2_500_000 ||
    !bytes.subarray(0, 8).equals(signature)
  )
    return invalid();
  let at = 8,
    w = 0,
    h = 0,
    channels = 0,
    ended = false,
    seenData = false,
    closedData = false;
  const data: Buffer[] = [];
  while (at < bytes.length) {
    if (at + 12 > bytes.length) return invalid();
    const n = bytes.readUInt32BE(at),
      type = bytes.toString("ascii", at + 4, at + 8);
    if (
      n > 2_500_000 ||
      at + n + 12 > bytes.length ||
      !/^[A-Za-z]{4}$/.test(type) ||
      type[2] !== type[2].toUpperCase() ||
      pngCrc(bytes.subarray(at + 4, at + n + 8)) !==
        bytes.readUInt32BE(at + n + 8)
    )
      return invalid();
    const value = bytes.subarray(at + 8, at + 8 + n);
    if (at === 8 && type !== "IHDR") return invalid();
    if (type === "IHDR") {
      if (at !== 8 || n !== 13) return invalid();
      w = value.readUInt32BE(0);
      h = value.readUInt32BE(4);
      channels = value[9] === 2 ? 3 : value[9] === 6 ? 4 : 0;
      if (
        w < 96 ||
        h < 96 ||
        w > 1024 ||
        h > 1024 ||
        w * h > 1_048_576 ||
        value[8] !== 8 ||
        !channels ||
        value[10] ||
        value[11] ||
        value[12]
      )
        return invalid();
    } else if (type === "IDAT") {
      if (closedData) return invalid();
      seenData = true;
      data.push(value);
    } else if (type === "IEND") {
      if (n || !seenData || at + n + 12 !== bytes.length) return invalid();
      ended = true;
      break;
    } else {
      if (seenData) closedData = true;
      if (
        type[0] === type[0].toUpperCase() ||
        ["acTL", "fcTL", "fdAT", "tRNS"].includes(type)
      )
        return invalid();
      // Ancillary metadata is CRC-checked, then discarded on re-encoding.
    }
    at += n + 12;
  }
  if (!ended) return invalid();
  const stride = w * channels,
    expected = h * (stride + 1);
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(data), { maxOutputLength: expected });
  } catch {
    return invalid();
  }
  if (raw.length !== expected) return invalid();
  const decoded = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) return invalid();
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? decoded[y * stride + x - channels] : 0,
        b = y ? decoded[(y - 1) * stride + x] : 0,
        c = y && x >= channels ? decoded[(y - 1) * stride + x - channels] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? a
            : filter === 2
              ? b
              : filter === 3
                ? Math.floor((a + b) / 2)
                : paeth(a, b, c);
      decoded[y * stride + x] =
        (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++)
    for (let c = 0; c < 3; c++) {
      const alpha = channels === 4 ? decoded[i * 4 + 3] / 255 : 1;
      rgb[i * 3 + c] = Math.round(
        decoded[i * channels + c] * alpha + 255 * (1 - alpha),
      );
    }
  return { rgb, width: w, height: h };
}
function downsample(rgb: Uint8Array, w: number, h: number, edge: number) {
  const scale = Math.min(1, edge / Math.max(w, h)),
    width = Math.max(1, Math.round(w * scale)),
    height = Math.max(1, Math.round(h * scale)),
    out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const x0 = (x * w) / width,
        x1 = ((x + 1) * w) / width,
        y0 = (y * h) / height,
        y1 = ((y + 1) * h) / height,
        area = (x1 - x0) * (y1 - y0),
        sum = [0, 0, 0];
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++)
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const a =
            (Math.min(x1, sx + 1) - Math.max(x0, sx)) *
            (Math.min(y1, sy + 1) - Math.max(y0, sy));
          for (let c = 0; c < 3; c++) sum[c] += rgb[(sy * w + sx) * 3 + c] * a;
        }
      for (let c = 0; c < 3; c++)
        out[(y * width + x) * 3 + c] = Math.round(sum[c] / area);
    }
  return { bytes: galleryPng(out, width, height), width, height };
}
export function normalizeGalleryImage(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 3_333_336 ||
    !value.length ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    throw new DomainError("gallery/image");
  const source = Buffer.from(value, "base64");
  if (source.toString("base64") !== value)
    throw new DomainError("gallery/image");
  const d = decodeGalleryPng(source),
    full = downsample(d.rgb, d.width, d.height, 768),
    thumb = downsample(d.rgb, d.width, d.height, 240);
  return {
    image: full.bytes,
    thumbnail: thumb.bytes,
    width: full.width,
    height: full.height,
  };
}

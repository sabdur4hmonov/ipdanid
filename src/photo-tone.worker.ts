import { referenceTones } from "./core/reference-preparation";
import type { PersonMask } from "./core/person-mask";
self.onmessage = ({
  data,
}: {
  data: {
    rgba: Uint8ClampedArray;
    width: number;
    height: number;
    mask: PersonMask;
  };
}) => {
  try {
    const { rgba, width, height, mask } = data;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 1536 ||
      height > 1536 ||
      rgba.length !== width * height * 4
    )
      throw Error("tone/dimensions");
    const { gray } = referenceTones(rgba, width, height, mask);
    const output = new Uint8ClampedArray(width * height * 4);
    for (let k = 0; k < gray.length; k++) {
      output[k * 4] =
        output[k * 4 + 1] =
        output[k * 4 + 2] =
          Math.floor(gray[k] * 255);
      output[k * 4 + 3] = 255;
    }
    self.postMessage({ rgba: output }, { transfer: [output.buffer] });
  } catch {
    self.postMessage({ error: true });
  }
};

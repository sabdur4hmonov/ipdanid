export function voiceWavDuration(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    ascii = (at: number, n: number) =>
      String.fromCharCode(...bytes.slice(at, at + n));
  if (
    bytes.length < 44 ||
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 4) !== "WAVE" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw Error("Voice clips must be complete RIFF WAV files");
  let fmt = false,
    data = 0;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = ascii(at, 4),
      size = view.getUint32(at + 4, true);
    if (at + 8 + size > bytes.length) throw Error("Invalid WAV chunk");
    if (id === "fmt ") {
      if (
        fmt ||
        size < 16 ||
        view.getUint16(at + 8, true) !== 1 ||
        view.getUint16(at + 10, true) !== 1 ||
        view.getUint32(at + 12, true) !== 24000 ||
        view.getUint32(at + 16, true) !== 48000 ||
        view.getUint16(at + 20, true) !== 2 ||
        view.getUint16(at + 22, true) !== 16
      )
        throw Error("Voice WAV requires PCM16 mono 24000 Hz");
      fmt = true;
    }
    if (id === "data") {
      if (data) throw Error("Duplicate WAV data");
      data = size;
    }
    at += 8 + size + (size % 2);
  }
  const durationMs = data / 48;
  if (
    !fmt ||
    !data ||
    data % 2 ||
    durationMs < 20 ||
    durationMs > 30000 ||
    bytes.length > 1_500_000
  )
    throw Error("Voice clip must last20ms–30s");
  return durationMs;
}

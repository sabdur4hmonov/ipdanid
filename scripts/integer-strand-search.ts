// Private research helper, not a shipped portrait engine or global optimum proof.
export function integerStrandMove(
  minimum: number,
  maximum: number,
  gain: (delta: number) => number,
  cancelled?: () => boolean,
) {
  if (
    !Number.isSafeInteger(minimum) ||
    !Number.isSafeInteger(maximum) ||
    minimum < -32 ||
    maximum > 32 ||
    minimum > 0 ||
    maximum < 0
  )
    throw Error("Invalid bounded strand search");
  let best = { delta: 0, gain: 0 };
  for (let delta = minimum; delta <= maximum; delta++) {
    if (cancelled?.())
      throw new DOMException("Generation cancelled", "AbortError");
    if (!delta) continue;
    const value = gain(delta);
    if (!Number.isFinite(value)) throw Error("Invalid strand objective");
    if (
      value > best.gain ||
      (value === best.gain &&
        value > 0 &&
        (Math.abs(delta) < Math.abs(best.delta) ||
          (Math.abs(delta) === Math.abs(best.delta) && delta < best.delta)))
    )
      best = { delta, gain: value };
  }
  return best;
}

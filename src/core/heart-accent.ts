import type { Instruction, MaterialProfile, Segment } from "./types";
import { Distribution } from "./distribution";
import { connectionAllowed, insideProfile } from "./geometry";
import { hash, sequencePayload, deepFreeze } from "./engine";
import { rasterSequence } from "./optical";
import { standardProfiles, validateStandardProfile } from "./standard-kit";
import { MAX_LINES } from "./limits";
import { referenceProfile } from "./classic-reference";

// Visit the actual perimeter pins in order. Any concave-notch detour is a real
// visible bridge and is counted; never draw an idealized red silhouette overlay.
function accentPath(p: MaterialProfile, body: Segment[]) {
  const guards = new Distribution(p.pins.length, body),
    path = [0];
  const legal = new Map<string, boolean>();
  const allowed = (a: number, b: number) => {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (!legal.has(key)) legal.set(key, connectionAllowed(p, a, b));
    return legal.get(key)!;
  };
  const distance = (a: number, b: number) =>
    Math.hypot(
      (p.pins[a].x - p.pins[b].x) * p.widthMm,
      (p.pins[a].y - p.pins[b].y) * p.heightMm,
    );
  for (let j = 1; j <= p.pins.length; j++) {
    const from = path.at(-1)!,
      to = j % p.pins.length;
    let route = [to];
    if (!allowed(from, to) || !guards.canChange([[from, to]])) {
      let bridge = -1,
        best = Infinity;
      for (let mid = 0; mid < p.pins.length; mid++)
        if (
          allowed(from, mid) &&
          allowed(mid, to) &&
          guards.canChange([
            [from, mid],
            [mid, to],
          ])
        ) {
          const d = distance(from, mid) + distance(mid, to);
          if (d < best) {
            bridge = mid;
            best = d;
          }
        }
      if (bridge < 0) throw Error("kit/accent-no-legal-route");
      route = [bridge, to];
    }
    for (const next of route) {
      guards.apply([[path.at(-1)!, next]]);
      path.push(next);
    }
  }
  return path;
}
export async function addHeartAccent(
  body: Instruction,
  pixels: Uint8Array,
  colour: string,
): Promise<Instruction> {
  if (
    !["classic-greedy/1", "classic-greedy/2"].includes(body.algorithm) ||
    body.profile.shape !== "heart" ||
    !body.profile.standardKit ||
    body.profile.standardKit.accessory ||
    !/^#[0-9a-f]{6}$/i.test(colour) ||
    colour === body.profile.colors[0]
  )
    throw Error("kit/accent-configuration");
  const i = structuredClone(body),
    p = i.profile;
  p.standardKit!.accessory = { version: "legal-heart-accent/1", colour };
  p.version = body.algorithm === "classic-greedy/2" ? 12 : 10;
  p.id += `-accent-${colour.slice(1)}`;
  p.minPinGap = 1;
  p.colors.push(colour);
  validateStandardProfile(p);
  const path = accentPath(p, body.segments),
    extra = path.length - 1;
  if (body.metrics.lines + extra > MAX_LINES)
    throw Error("kit/accent-line-limit");
  i.algorithm =
    body.algorithm === "classic-greedy/2"
      ? "standard-accent/21"
      : "standard-accent/20";
  i.id = crypto.randomUUID();
  i.createdAt = new Date().toISOString();
  i.segments.push({ color: colour, path });
  i.params = {
    ...i.params,
    requestedLines: Math.min(MAX_LINES, body.params.requestedLines + extra),
    accent: {
      version: "legal-heart-accent/1",
      bodySequenceHash: body.sequenceHash,
      bodyParams: structuredClone(body.params),
      bodyConnections: body.metrics.lines,
      redConnections: extra,
    },
    optimization: {
      kind: "standard-accent",
      lookahead: 0,
      coarseScale: 1,
      minimumRelativeGain: 0,
      pairLimit: 32,
      pinDegreeLimit: 160,
    },
  };
  i.metrics.lines += extra;
  let meters = 0.5;
  for (let j = 1; j < path.length; j++) {
    const a = p.pins[path[j - 1]],
      b = p.pins[path[j]];
    meters +=
      ((Math.hypot((b.x - a.x) * p.widthMm, (b.y - a.y) * p.heightMm) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction);
  }
  i.metrics.perColorMeters[colour] = meters;
  i.metrics.estimatedMeters += meters;
  i.metrics.stockShortfallMeters = Math.max(
    0,
    i.metrics.estimatedMeters - p.stockMeters,
  );
  delete i.metrics.weightedError;
  const n = i.params.resolution;
  if (pixels.length !== n * n * 3 || (await hash(pixels)) !== i.imageHash)
    throw Error("kit/accent-source");
  const raster = rasterSequence(i);
  let mse = 0,
    count = 0;
  for (let k = 0; k < n * n; k++)
    if (
      i.algorithm === "standard-accent/21" ||
      insideProfile(p, (k % n) / (n - 1), Math.floor(k / n) / (n - 1))
    )
      for (let c = 0; c < 3; c++) {
        mse += (raster[k * 3 + c] - pixels[k * 3 + c] / 255) ** 2;
        count++;
      }
  i.metrics.reconstructionMse = mse / count;
  i.sequenceHash = await hash(sequencePayload(i));
  return deepFreeze(i);
}
export async function validateHeartAccent(i: Instruction) {
  const a = i.params.accent,
    p = i.profile;
  const route = i.segments[1]?.path;
  let cursor = 0,
    ordered = Boolean(route?.[0] === 0);
  if (route)
    for (let j = 1; j <= p.pins.length && ordered; j++) {
      const expected = j % p.pins.length;
      if (route[cursor + 1] === expected) cursor++;
      else if (route[cursor + 2] === expected) cursor += 2;
      else ordered = false;
    }
  if (
    !a ||
    a.version !== "legal-heart-accent/1" ||
    a.bodyParams.accent ||
    i.params.optimization?.kind !== "standard-accent" ||
    i.segments.length !== 2 ||
    !p.standardKit?.accessory ||
    i.segments[0].path.length - 1 !== a.bodyConnections ||
    i.segments[1].path.length - 1 !== a.redConnections ||
    i.segments[1].color !== p.standardKit.accessory.colour ||
    !ordered ||
    cursor !== (route?.length ?? 0) - 1
  )
    throw Error("kit/accent-contract");
  const originalProfile = structuredClone(p);
  delete originalProfile.standardKit!.accessory;
  let standard = standardProfiles(p.standardKit.config).find(
    (p) => p.shape === "heart",
  )!;
  if (i.algorithm === "standard-accent/21")
    standard = referenceProfile(standard);
  originalProfile.id = standard.id;
  originalProfile.version = standard.version;
  originalProfile.minPinGap = standard.minPinGap;
  originalProfile.colors = [p.colors[0]];
  const original = {
    ...i,
    algorithm:
      i.algorithm === "standard-accent/21"
        ? ("classic-greedy/2" as const)
        : ("classic-greedy/1" as const),
    profile: originalProfile,
    params: a.bodyParams,
    segments: [i.segments[0]],
  };
  if ((await hash(sequencePayload(original))) !== a.bodySequenceHash)
    throw Error("kit/accent-body-identity");
}

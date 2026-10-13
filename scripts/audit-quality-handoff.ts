// Read-only engine probes for the 2026-10-13 review. Personal fixtures stay local.
// Writes new audit evidence only; never changes a guide or a saved checkpoint.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { generateDensity, type DensityCheckpoint } from '../src/core/density';
import { createProfile } from '../src/core/geometry';
import { withPinBasis } from '../src/core/pin-basis';
import { DEFAULT_PORTRAIT } from '../src/core/portrait';
import { defaultPhysicalContrast } from '../src/core/physical-contrast';
import { validateInstruction } from '../src/core/validation';
import { hash } from '../src/core/engine';

const out = 'output/architecture-audit';
mkdirSync(out, { recursive: true });
const rows: Record<string, unknown>[] = [];
for (const mode of ['dark', 'light'] as const) {
  for (const basis of [false, true]) {
    let profile = createProfile('circle', basis ? 240 : 32, mode);
    profile.threadMm = .1;
    if (basis) profile = withPinBasis(profile, 240, 7.5);
    let checkpoint: DensityCheckpoint | undefined;
    const options = {
      profile, mode, resolution: 32, lines: 200,
      portrait: { ...DEFAULT_PORTRAIT, enabled: true },
      pixels: new Uint8Array(32 * 32 * 3).fill(170),
    };
    const tuning = { edgeWeight: 2, sweeps: 1, physical: defaultPhysicalContrast() };
    const result = await generateDensity(options, {
      ...tuning, onCheckpoint: value => { checkpoint = value; },
    });
    await validateInstruction(result);
    let replay: Record<string, unknown>;
    try {
      const resumed = await generateDensity(options, {
        ...tuning, resume: checkpoint, materializeOnly: true,
      });
      replay = { accepted: true, identicalHash: resumed.sequenceHash === result.sequenceHash };
    } catch (error) {
      replay = { accepted: false, error: String(error) };
    }
    rows.push({ mode, basis, seed: 'fresh-empty-graph', hash: result.sequenceHash,
      checkpointSweeps: checkpoint?.sweeps, lines: result.metrics.lines, replay });
  }
}

const f = 'output/portrait-dispatch';
const guide = JSON.parse(readFileSync(`${f}/resolved240.json`, 'utf8')).project.instruction;
const checkpoint = JSON.parse(readFileSync(`${f}/resolved240-fit.json`, 'utf8'));
const pixels = new Uint8Array(readFileSync(`${f}/target-320.bin`));
await validateInstruction(guide);
const { checksum, ...payload } = checkpoint;
const options = {
  profile: guide.profile, mode: guide.params.mode, resolution: 320,
  lines: guide.params.requestedLines, portrait: guide.params.portrait, pixels,
};
const tuning = {
  edgeWeight: 2, sweeps: 8, resolved: true,
  physical: defaultPhysicalContrast(), resume: checkpoint, materializeOnly: true,
};
const start = performance.now();
const replay = await generateDensity(options, tuning);
let extensionError = '';
try {
  await generateDensity(options, {
    ...tuning, resume: undefined, materializeOnly: false, sweeps: 24,
    extension: { checkpoint, priorSweepLimit: 8, reference: guide },
  });
} catch (error) { extensionError = String(error); }
const evidence = {
  schema: 'iprasm.audit/1', purpose: 'Analysis only; no new optimization or physical quality claim',
  syntheticRecovery: rows,
  preservedReference: {
    targetHashMatches: await hash(pixels) === guide.imageHash,
    checkpointChecksumMatches: await hash(JSON.stringify(payload)) === checksum,
    guideHash: guide.sequenceHash, materializedHash: replay.sequenceHash,
    materializationMatches: replay.sequenceHash === guide.sequenceHash,
    priorSweeps: checkpoint.sweeps, plateau: checkpoint.plateau,
    replayAndRejectionMs: performance.now() - start, extensionError,
  },
};
writeFileSync(`${out}/engine-probes.json`, JSON.stringify(evidence, null, 2), { flag: 'wx' });
console.log(JSON.stringify(evidence, null, 2));

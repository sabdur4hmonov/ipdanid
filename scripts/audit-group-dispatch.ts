import { writeFileSync } from 'node:fs';
import { generate } from '../src/core/engine';
import { createProfile } from '../src/core/geometry';
import { DEFAULT_PORTRAIT } from '../src/core/portrait';
import { estimatedPairPortrait } from '../src/core/face-features';
import { validateInstruction } from '../src/core/validation';

const portrait = estimatedPairPortrait(DEFAULT_PORTRAIT);
portrait.people!.faces.forEach(f => { f.regions.placement = 'manual'; });
portrait.regions!.placement = 'manual';
const options = {
  profile: { ...createProfile('rectangle', 24), threadMm: .1 },
  pixels: Uint8Array.from({ length: 48 * 48 * 3 }, (_, k) => 100 + Math.floor(k / 3) % 130),
  resolution: 48, lines: 120, mode: 'dark' as const, portrait,
};
const seed = await generate(options);
await validateInstruction(seed);
// Execute the real worker handler locally. This is not a browser or device test.
const messages: any[] = [];
const workerScope: any = { postMessage: (value: unknown) => messages.push(value) };
(globalThis as any).self = workerScope;
await import('../src/core/generator.worker');
const outcomes = [];
for (const strategy of ['global', 'guarded']) {
  messages.length = 0;
  await workerScope.onmessage({ data: { ...options, jobId: 1, seed, strategy } });
  const terminal = messages.find(value => ['done', 'error'].includes(value.type));
  if (terminal?.instruction) await validateInstruction(terminal.instruction);
  outcomes.push({ strategy, terminal: terminal?.type, message: terminal?.message,
    algorithm: terminal?.instruction?.algorithm,
    parent: terminal?.instruction?.params.parentSequenceHash });
}
const report = { source: 'synthetic two-person regions; no personal photo',
  uiTrace: 'App.tsx continuation fallback selects global for group-optical/15',
  browserReproduced: false, seed: seed.sequenceHash, seedAlgorithm: seed.algorithm, outcomes };
writeFileSync('output/architecture-audit/group-dispatch.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));

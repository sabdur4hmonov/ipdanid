import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
// @ts-expect-error existing deployment helper is an executable JavaScript module
import { releaseClientConfig } from '../scripts/release-runtime.mjs';

test('release client requires HTTPS and forces protected mode without a debug override', () => {
  expect(releaseClientConfig('https://example.invalid/api')).toEqual({
    VITE_NATIVE_API_BASE: 'https://example.invalid/api',
    VITE_NATIVE_DEBUG_SETTINGS: '0',
    VITE_SERVER_GENERATION: '1',
  });
  for (const value of ['', undefined, 'http://127.0.0.1:4657/api', 'https://user:password@example.invalid/api', 'https://example.invalid/api?secret=1'])
    expect(() => releaseClientConfig(value)).toThrow();
});

test('actual production entry points bind web/API/release to the same protected configuration', () => {
  const docker = readFileSync('Dockerfile', 'utf8');
  const compose = readFileSync('docker-compose.yml', 'utf8');
  const release = readFileSync('scripts/Release-Android.ps1', 'utf8');
  expect(docker.indexOf('ENV VITE_SERVER_GENERATION=1')).toBeLessThan(docker.indexOf('npx vite build'));
  expect(docker).toContain('ENV VITE_SERVER_GENERATION=1');
  expect(compose).toMatch(/NODE_ENV: production\s+SERVER_GENERATION: "1"/);
  expect(release).toContain("import {releaseClientConfig} from './scripts/release-runtime.mjs'");
  expect(release).toContain('$env:VITE_SERVER_GENERATION = $runtime.VITE_SERVER_GENERATION');
  expect(release).toContain('$env:VITE_NATIVE_DEBUG_SETTINGS = $runtime.VITE_NATIVE_DEBUG_SETTINGS');
  expect(release).toContain('Keep the owner keystore outside the repository');
});

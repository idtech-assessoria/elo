import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export async function runCheck(entry) {
  // Keep external packages resolvable without bundling pg or its optional native driver.
  const cache = join(process.cwd(), 'node_modules', '.cache');
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, 'elo-check-'));
  try {
    const file = join(dir, 'check.mjs');
    await build({ entryPoints: [entry], outfile: file, bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node22' });
    const result = spawnSync(process.execPath, [file], { stdio: 'inherit', env: { ...process.env, APP_URL: 'https://elo.example' } });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

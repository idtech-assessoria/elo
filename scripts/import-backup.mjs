import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const cache = join(process.cwd(), 'node_modules', '.cache');
mkdirSync(cache, { recursive: true });
const folder = mkdtempSync(join(cache, 'elo-import-'));
try {
  const file = join(folder, 'import.mjs');
  await build({ entryPoints: ['scripts/import-backup.ts'], outfile: file, bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node22' });
  const result = spawnSync(process.execPath, [file, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { rmSync(folder, { recursive: true, force: true }); }

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL em .env.local com uma conexão de migração autorizada.');
const args = process.argv.slice(2);
if (args.some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('Opções aceitas: --dry-run (padrão) ou --apply.');
const apply = args.includes('--apply');
// Do not print the connection string. The CLI maintains supabase_migrations.
const result = spawnSync(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'), 'db', 'push', '--db-url', process.env.DATABASE_URL, ...(apply ? [] : ['--dry-run'])], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;

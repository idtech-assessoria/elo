import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { poolConfig } from '../server/postgres';
import { bootstrapOwner } from '../server/config';
import { importInitialWorkspace, readVerifiedBackup } from './initial-import';

const [file, option = '--dry-run', ...extra] = process.argv.slice(2);
assert.ok(file && ['--dry-run', '--apply'].includes(option) && !extra.length, 'Uso: npm run db:import -- /caminho/dados/estado-operacional.json [--dry-run|--apply]');
const source = readVerifiedBackup(readFileSync(file));
const identity = bootstrapOwner();
assert.ok(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(identity.id), 'Defina ELO_OWNER_USER_ID com o UUID real do Supabase Auth, nunca o identificador do Sites.');
assert.ok(process.env.DATABASE_URL, 'Configure a conexão de importação autorizada em DATABASE_URL.');
const pool = new Pool(poolConfig(process.env.DATABASE_URL));
try {
  await importInitialWorkspace(pool, source, identity, option === '--apply');
  if (option === '--apply') {
    console.log('Assistência original importada e vinculada a ' + identity.email + ' e ao UUID verificado. Nenhuma peça, movimentação ou credencial foi criada. Nenhum e-mail foi enviado.');
  } else {
    console.log('Conferência concluída com rollback. Destino: ' + identity.email + '. A importação preserva a assistência e a data original, atualizando o vínculo e o contato associado à antiga proprietária. Use --apply para executar.');
  }
} finally { await pool.end(); }

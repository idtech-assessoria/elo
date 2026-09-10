import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'elo-check-bundle-'));const file=join(dir,'check.mjs');
try{for(const entry of ['scripts/database-check.ts','scripts/messaging-check.ts','scripts/gmail-check.ts']){await build({entryPoints:[entry],outfile:file,bundle:true,platform:'node',format:'esm',target:'node22'});const r=spawnSync(process.execPath,[file],{stdio:'inherit'});if(r.status!==0){process.exitCode=r.status??1;break}}}finally{rmSync(dir,{recursive:true,force:true})}

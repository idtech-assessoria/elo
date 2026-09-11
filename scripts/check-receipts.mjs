import { runCheck } from './run-check.mjs';
await runCheck('tests/receipt-check.ts');
await runCheck('tests/receipt-components-check.mjs', { banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }, packages: 'bundle', external: ['react', 'react-dom', 'react-dom/*', 'jsdom', 'next/link.js'], alias: { 'next/link': 'next/link.js' } });

# Checkpoint — 10/09/2026

## Origem comprovada

- Backup: `elo-backup-completo-2026-09-10.zip`, SHA-256 `6f14d01974aeefb6b40e6cd22cb82f0bf84f7c3fa3428789eb6dd59eacc0574c`.
- Os 138 arquivos do manifesto foram verificados sem divergência; as 139 linhas de SHA256SUMS também conferiram. O código tem 133 arquivos, relacionados em `ORIGEM-BACKUP.json`.
- Importação no GitHub: `82e20fe45385ec8f993aa18c9e8bf6b5f1258c55`, preservada na `main`.
- O ZIP `elo-github-supabase-foundation.zip` e o pacote final descrito na conversa anterior não foram encontrados nesta sessão. O commit local informado `179a62e2ce3471022dd9ca577ee223a53b6bf75d` não foi recuperado. As correções relatadas naquela conversa não foram presumidas como presentes: esta branch aplica novamente a migração sobre o backup comprovado, preservando as funcionalidades.

## Verificações desta branch

- Lint com zero erros/avisos, TypeScript e build Next.js passaram localmente.
- A auditoria de dependências detectou alertas na versão herdada Next.js 16.2.6. O framework e o lint foram atualizados para 16.3.4 e dependências transitivas foram corrigidas. A dependência esbuild do loader legado do Drizzle recebeu override específico para 0.28.2; a geração PostgreSQL continuou sem diferenças de esquema. `npm audit` completo retornou zero vulnerabilidades conhecidas. Referências: [release oficial](https://github.com/vercel/next.js/releases/tag/v16.3.4) e [aviso de segurança](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- As três suítes legadas SQLite/Resend/Gmail passaram com provedores simulados.
- O importador conferiu o hash do JSON original e recusou prosseguir sem o UUID real da proprietária; a importação no banco permanece pendente.
- PostgreSQL embarcado: 14 tabelas, RLS/grants, UUIDs, datas, rollback, idempotência, estoque/financeiro, isolamento e desabilitação do portal, sessão expirada/revogada e fila Resend simulada.
- Autenticação: identidade verificada, dono explicitamente configurado, metadados manipulados ignorados e sessões inválidas recusadas.
- HTTP do build: PKCE, cookies HttpOnly/Secure, callback interno, CSRF e cache. Auth foi simulado em servidor local; nenhum e-mail enviado.
- O ambiente local executa como root sem outro UID disponível e não inicia PostgreSQL nativo. PGlite tem uma conexão serializada. O workflow exige PostgreSQL 17 real para validar conexões concorrentes e leitura consistente.

## Estado externo verificado

- GitHub: `idtech-assessoria/elo`, privado, administração/gravação confirmadas.
- Código de migração publicado no commit `ffddfb864e032ccfbcf41e7c529f1afd686f7e61`. O [Quality Gates dessa versão](https://github.com/idtech-assessoria/elo/actions/runs/34539946363) passou integralmente, incluindo PostgreSQL 17 real com várias conexões, instalação limpa, auditoria de produção, lint, TypeScript, domínio, Auth, regressão SQLite/e-mail, build e HTTP. O [workflow da branch](https://github.com/idtech-assessoria/elo/actions/workflows/quality-gates.yml) acompanha as revisões seguintes.
- Supabase ELO: migrações `20260910230036_elo_postgres_foundation` e `20260910230426_restrict_rls_event_trigger` aplicadas. Os nomes locais foram alinhados às versões efetivamente registradas pelo Supabase MCP; o SQL da fundação não mudou.
- As 14 tabelas têm RLS; `anon` e `authenticated` não possuem SELECT/INSERT/UPDATE/DELETE. O papel do servidor lê apenas as colunas `id`, `user_id` e `not_after` de `auth.sessions`, sem acesso de leitura à tabela inteira.
- O projeto já tinha a função administrativa `rls_auto_enable()` com execução pública. A segunda migração revogou EXECUTE de PUBLIC/anon/authenticated, mantendo o event trigger `ensure_rls` ativo. Foi acrescentado teste de regressão para essa permissão. [Orientação do Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- Após a correção, o Security Advisor retornou zero alertas. O Performance Advisor retornou 18 informações de índices ainda não utilizados; o banco está vazio, portanto ainda não há carga operacional para avaliar seu uso. Os índices foram mantidos por atenderem às consultas e chaves estrangeiras. [Orientação sobre índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Todas as 14 tabelas continuam vazias e Auth continua sem usuários. Nenhuma assistência foi inicializada ou importada; o vínculo com a proprietária real permanece pendente.
- Não foram criados usuários, dados fictícios, credenciais de envio, hospedagem ou contratação. Nenhum e-mail real foi enviado.
- Pendem configuração segura de conexão/servidor, UUID real da proprietária, importação da assistência inicial, SMTP/Resend, hospedagem e validação integrada final.

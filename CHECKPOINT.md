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

## Estado externo antes da publicação desta branch

- GitHub: `idtech-assessoria/elo`, privado, administração/gravação confirmadas.
- Supabase ELO: acesso confirmado, inicialmente zero tabelas públicas e zero usuários. SQL preparado e testado; aplicação remota e resultado do CI serão registrados após a execução.
- Não foram criados usuários, dados fictícios, credenciais de envio, hospedagem ou contratação. Nenhum e-mail real foi enviado.
- Pendem configuração segura de conexão/servidor, UUID real da proprietária, importação da assistência inicial, SMTP/Resend, hospedagem e validação integrada final.

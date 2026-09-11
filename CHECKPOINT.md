# Checkpoint — 11/09/2026

## Origem comprovada

- Backup: `elo-backup-completo-2026-09-10.zip`, SHA-256 `6f14d01974aeefb6b40e6cd22cb82f0bf84f7c3fa3428789eb6dd59eacc0574c`.
- Os 138 arquivos do manifesto foram verificados sem divergência; as 139 linhas de SHA256SUMS também conferiram. O código tem 133 arquivos, relacionados em `docs/ORIGEM-BACKUP.json`.
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

## Continuação — proprietária e configuração de hospedagem

- O usuário definiu `idtech.assessoria@gmail.com` como proprietária. `.env.example`, a proposta Render e `config/owner-migration.json` usam esse destino. O e-mail antigo continua registrado como origem, sem modificar o ZIP ou seu JSON operacional.
- O importador agora confere o mapeamento autorizado, exige UUID e e-mail confirmado no Auth, bloqueia todas as tabelas de destino na transação e testa a inserção também no modo de conferência, com rollback. Preserva a data e as configurações da assistência, atualizando o contato que acompanhava o e-mail da antiga proprietária. Recusa repetição ou importação sobre dados existentes.
- Os testes locais de importação passaram em PGlite: usuário inexistente, não confirmado, anônimo e identidade incorreta são recusados; conferência faz rollback, somente uma tentativa simultânea pode importar e contas de outro UUID não recebem acesso de proprietária. Um contato configurado separadamente é preservado. A mesma suíte roda no PostgreSQL 17 real exigido pelo CI.
- Lint, TypeScript, PostgreSQL local, build Next.js e HTTP passaram. A execução do importador com o JSON original passou pela verificação de hash e parou no UUID ausente, como esperado; não tentou restaurar em produção.
- `render.yaml` e `ATIVACAO.md` preparam a hospedagem Node.js 24 para validação, no plano gratuito, sem publicação automática nem criação de banco/disco/cron adicionais. O Blueprint passou pela validação contra o esquema JSON oficial do Render. Custos de produção e de eventual domínio ainda precisam ser apresentados antes da contratação. O servidor não foi criado.
- Resend e Render foram conectados pelo usuário e passaram a aparecer instalados. As operações desses dois plugins ainda não constavam nas ferramentas disponíveis desta execução; domínios e serviços não foram consultados e nenhuma credencial foi inventada. O Supabase conectado continua sem operações administrativas de Auth/SMTP.
- Uma consulta à Cloudflare foi bloqueada pela revisão automática porque a conexão disponível estava identificada com outra conta, sem vínculo comprovado com o Elo. Não houve nova tentativa ou alteração nessa conta; a alternativa preparada usa Render.
- A reconferência do ELO confirmou 14 tabelas públicas com RLS, nenhuma assistência importada e nenhum usuário Auth para `idtech.assessoria@gmail.com`. Não houve envio real, publicação externa da aplicação ou contratação.

## Continuação — servidor autorizado em 11/09/2026

- Render agora responde. O usuário confirmou o workspace `tea-dahjohu1egvs738arhcg` da conta informada e a criação de `elo-validacao`, Node.js 24, Free, Virginia, na branch de migração. Não foi autorizado plano pago.
- A migração `20260911001722_elo_runtime_credentials` foi aplicada ao ELO. Criou `elo_app` com associação a `elo_backend`, sem privilégios administrativos ou bypass de RLS. O login não lê `auth.users`, a tabela inteira de sessões ou o Vault. Lê somente as colunas de sessão já autorizadas.
- A senha aleatória e a chave estável de cifragem foram geradas dentro do PostgreSQL e guardadas no Vault. Valores não estão no Git, em migrações ou neste documento. Nenhuma senha administrativa foi reutilizada.
- O comando de inicialização agora verifica a conexão, o papel restrito, as 14 tabelas com RLS e permissões de sessão. Falhas bloqueiam o início do servidor; a verificação não cria dados nem solicita e-mails.
- PostgreSQL local/PGlite, lint e TypeScript passaram após a alteração. O CI continua exigindo PostgreSQL 17 real; suas operações de domínio passam a usar `elo_app` por associação, conferindo a herança das permissões.
- O destino segue com zero assistências e zero usuários Auth. Criação do serviço, conexão a partir do Render e URL pública ainda serão verificadas. A última versão anterior tem [Quality Gates aprovado](https://github.com/idtech-assessoria/elo/actions/runs/34542780539), commit `997360571388f765dc32426129191a2b1d6f7b9e`.

### Bloqueio encontrado na tentativa de publicação

- A chamada de criação no Render usou o workspace confirmado, plano `free`, Virginia, branch correta, deploy automático desabilitado e credenciais exclusivas. Retornou HTTP 400, `passed in repository URL is invalid or unfetchable`, para a URL privada válida `https://github.com/idtech-assessoria/elo`.
- A consulta posterior ao workspace continuou sem serviços. Nenhum serviço, deploy ou endereço público foi criado; as variáveis não foram persistidas em um serviço Render. As credenciais permanecem recuperáveis no Vault do ELO.
- É necessário liberar `idtech-assessoria/elo` na conexão GitHub do próprio Render. A integração GitHub desta conversa acessa o repositório, mas isso não concede ao Render a mesma permissão. [Procedimento oficial](https://render.com/docs/git-provider).
- O Security Advisor do Supabase foi consultado após a migração do login e retornou zero alertas. Nenhum usuário Auth, assistência ou e-mail real foi criado/enviado.
- O código do servidor está no commit `4ae3e93df037f3667e1fdf83048092f1cca64e37`. O [Quality Gates dessa versão](https://github.com/idtech-assessoria/elo/actions/runs/34546117198) passou integralmente, incluindo operações sob `elo_app` no PostgreSQL 17 real, lint, TypeScript, auditoria, build e HTTP. A revisão seguinte apenas registra este bloqueio nos documentos.

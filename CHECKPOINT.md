# Checkpoint — 11/09/2026

Estado mais recente: o login com e-mail e senha está publicado no deploy `dep-daho0i4s728c73crm0cg`, commit `8f2f00f8d18eb688064fddfc75bd86442a007f3c`, **live às 04:17:05 UTC de 11/09/2026**, após CI completo. Esta revisão acrescenta a ativação da primeira senha por código nativo do Supabase para resolver a falta de entrega de e-mail; sua publicação ainda será verificada. O ciclo de sair e entrar novamente com senha foi testado com Auth local simulado. A assistência original continua vinculada à conta confirmada de `idtech.assessoria@gmail.com`; canais de avisos operacionais seguem pendentes. Não repetir a importação, criar outro servidor ou regenerar segredos.

## Login com senha e ativação sem envio de e-mail

- A pedido do titular, `/login` usa `signInWithPassword` do Supabase Auth. O acesso por link tornou-se opcional. Senhas são enviadas somente no corpo do POST, preservadas sem trim e nunca retornadas em JSON, URL ou logs.
- `/account/password` e `POST /auth/password/update` permitem escolher/alterar somente a senha da sessão confirmada e não revogada, via `auth.updateUser`. Não aceitam e-mail/UUID de destino. A senha atual é opcional e pode ser exigida pelas configurações Auth do projeto. O Elo exige confirmação da nova senha, 10–64 caracteres e no máximo 72 bytes UTF-8.
- A conta real permanece confirmada e não anônima. A presença de hash de senha não comprova uma senha conhecida pelo titular: o fluxo nativo inicial por link pode gerar senha temporária aleatória. Nenhuma senha real foi alterada pelo assistente e nenhum e-mail foi enviado nesta implementação.
- `/password-setup` verifica e-mail e código nativo do Supabase com `verifyOtp(type: recovery)`. Aceita somente a identidade confirmada correspondente e direciona à página protegida de escolha da senha. O código deve ser emitido por administrador autorizado, expira e só pode ser utilizado uma vez. A aplicação usa somente a chave publishable e não expõe geração administrativa de códigos.
- O [CI do login por senha](https://github.com/idtech-assessoria/elo/actions/runs/34561290217) passou integralmente, incluindo PostgreSQL 17 real, concorrência, lint, TypeScript, build e HTTP. O Render marcou `dep-daho0i4s728c73crm0cg` como live às 04:17:05 UTC.
- Lint, TypeScript, Auth e HTTP da ativação passaram localmente. Os testes Auth/HTTP são simulados: cobrem senha incorreta, conta desconhecida, 429, identidade não confirmada/anônima, e-mail divergente, código inválido/reutilizado, sessão revogada, CSRF, cookies seguros, login público com cookie antigo e ausência de pedidos de e-mail. Nenhuma credencial operacional foi usada para esses testes.
- Publicação da tela de ativação, emissão controlada de um código para a proprietária e escolha privada da senha ainda precisam ser registradas. Nunca incluir códigos, senhas ou capacidades administrativas neste checkpoint.

O titular descartou `idtech.com.br`, cadastrado no Resend por engano. Após a confirmação explícita do aviso de remoção, a exclusão foi concluída e a listagem do Resend retornou zero domínios. Essa pendência está encerrada. Não recriar esse cadastro ou retomar as instruções de DNS retiradas do projeto.

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

## Continuação — Render criado em 11/09/2026

- O titular tornou o repositório público e liberou o acesso do aplicativo Render. A API GitHub confirmou `private=false`, `disabled=false` e a branch correta. O [CI do checkpoint anterior](https://github.com/idtech-assessoria/elo/actions/runs/34546338086) passou.
- Criado `elo-validacao`, ID `srv-dahlmoqd0e5s73fu2s70`, no workspace já confirmado, Free, Virginia, Node.js 24, uma instância, sem publicação automática ou previews. URL atribuída: `https://elo-validacao.onrender.com`. [Painel](https://dashboard.render.com/web/srv-dahlmoqd0e5s73fu2s70).
- As variáveis privadas usam os dois segredos existentes no Vault e a chave publishable habilitada do ELO. `DATABASE_URL` inicialmente usa o host direto IPv6 com login `elo_app`. O UUID da proprietária permanece ausente. Nenhuma chave foi regenerada ou publicada no GitHub.
- Primeiro deploy `dep-dahlmpad0e5s73fu3240`: build Next.js/TypeScript bem-sucedido; inicialização falhou com `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` no Node 24.21.0 do Render. A falha foi reproduzida localmente, corrigida com propriedades explícitas nos construtores e coberta por uma nova etapa de CI que executa `check:runtime` contra PostgreSQL 17.
- A importação nativa do adaptador no Node 24 passou após a correção, assim como PostgreSQL/PGlite, lint e TypeScript. A verificação do novo deploy e da conexão externa ao banco permanece pendente.

### Resultado do segundo deploy e próximo passo

- Commit corrigido: `09293b8cc0bdb0c3de03a69525296686640efedb`. [CI aprovado](https://github.com/idtech-assessoria/elo/actions/runs/34551786861), inclusive a nova etapa que executa `npm run check:runtime` com Node 24 e PostgreSQL 17 real. Build, HTTP, lint e demais gates também passaram.
- Segundo deploy: `dep-dahlq91594qs73fid4s0`, iniciado em `2026-09-11T01:45:08Z`, terminou `update_failed` em `2026-09-11T01:46:43Z`. A compilação passou. O log de inicialização registra `Elo database preflight failed: ENETUNREACH`, sem o erro TypeScript anterior.
- O host direto do Supabase exige IPv6; o Render não alcançou essa rede. O Supabase conectado não fornece o hostname do pooler. A pessoa titular precisa copiar somente esse hostname em **ELO > Connect > Session pooler**, sem senha. O hostname não deve ser deduzido da região ou testado por tentativa de índices.
- Após receber o hostname, atualizar `DATABASE_URL` no serviço `srv-dahlmoqd0e5s73fu2s70`, usando porta `5432`, banco `postgres`, usuário `elo_app.jrfmakgafcybhinjkalc` e a senha já guardada no Vault. Preservar verificação TLS. Como o serviço tem auto-deploy desligado, disparar um deploy após a alteração e acompanhar até o resultado. Não reiniciar a migração ou criar duplicata.
- A URL `https://elo-validacao.onrender.com` foi atribuída pelo Render, mas ainda não foi validada servindo a aplicação: nenhum deploy ficou ativo. O login e a restauração original continuam pendentes.
- Reconferência do Supabase: zero usuários Auth para a proprietária, zero assistências, `elo_app` com login habilitado. Nenhum dado fictício ou e-mail real foi criado/enviado.
- Resend agora está acessível: o domínio existente `idtech.com.br` está com verificação `failed`; três registros DNS exigidos também falharam. Consulta e valores registrados em `docs/RESEND-DNS.md`. O provedor DNS do titular ainda precisa ser identificado antes de qualquer alteração. Não houve modificação DNS/SMTP.

## Domínio descartado pelo titular

- O pedido posterior esclareceu que `idtech.com.br` foi adicionado por engano. A primeira tentativa de remover o cadastro Resend `09c1425d-9ebe-42ad-9aef-ed5c9f6a12b8` foi rejeitada pela revisão automática: o usuário ainda não havia confirmado após receber o aviso explícito de que a remoção é irreversível e interrompe envios/recebimentos desse domínio. Não foi usado caminho alternativo.
- A orientação anterior `docs/RESEND-DNS.md` foi removida e substituída por `docs/EMAIL-ATIVACAO.md`. Não configurar o DNS desse domínio nem usar seus remetentes. Nenhuma alteração ocorreu na zona DNS.
- O Supabase ELO permanece `ACTIVE_HEALTHY`; o conector retorna somente o host direto e não fornece o Session pooler. Não há arquivo local com esse endereço. A publicação continua aguardando o hostname real, sem senha.
- Consulta de produção: zero assistências, zero conexões Resend, zero conexões Gmail e zero contas Auth para `idtech.assessoria@gmail.com`.
- A configuração do acesso está preparada com a URL Render e o callback exato. O SMTP padrão do Supabase pode atender somente a validação inicial de e-mails de membros da equipe, dependendo da configuração atual; não foi presumido configurado ou testado com envio real. E-mails de lojistas pelo Resend continuam exigindo domínio próprio verificado. Nenhum plano ou domínio pago foi contratado.

### Exclusão confirmada e concluída

- O usuário respondeu `confirmo` após o aviso explícito sobre a exclusão definitiva de `idtech.com.br` no Resend. A nova chamada de remoção retornou `Domain removed successfully`.
- A listagem imediatamente posterior retornou `No domains found`. O cadastro foi excluído; não existe outra confirmação ou remoção pendente para esse domínio. Nenhum DNS externo, registro de domínio ou dado do aplicativo foi alterado.
- A publicação permanece aguardando o hostname do **Session pooler** do Supabase. Essa informação ainda não foi fornecida e não está exposta no conector. O serviço Render, as credenciais e o código validado foram preservados, sem novo deploy ou envio de e-mail.

## Session pooler fornecido pelo titular

- Captura do painel ELO com `connectTab=direct&method=session`: host `aws-0-sa-east-1.pooler.supabase.com`, porta `5432`, banco `postgres`, usuário administrativo com o sufixo do projeto. O login da aplicação permanece `elo_app`, portanto usa `elo_app.jrfmakgafcybhinjkalc` no pooler.
- A revisão automática rejeitou a primeira atualização de `DATABASE_URL` por envolver retransmissão da senha ao Render. Nenhuma alteração ocorreu nessa chamada. A alternativa transmite somente `DATABASE_POOLER_HOST` e `DATABASE_POOLER_USER`, campos públicos, e mantém a credencial já instalada no ambiente do serviço.
- O Render aceitou a atualização dos dois campos públicos no serviço `srv-dahlmoqd0e5s73fu2s70`. O adaptador exige a configuração completa, limita o host ao domínio oficial do pooler, fixa porta `5432`, preserva senha/banco e exige TLS verificado. Os testes cobrem senha inalterada, ativação de TLS mesmo sobre uma URL local, campos incompletos, destino externo e usuário inválido.
- Auth com provedores simulados, PostgreSQL/PGlite, lint e TypeScript passaram localmente após a alteração. O CI e o deploy dessa revisão ainda serão acompanhados. Nenhum e-mail real foi enviado ou registro operacional criado.

## Pooler, certificados e consulta privada de sessão

- O commit `3a2b501c33558a2d3ab531f076db58d7bc1be186` passou em todos os gates do [CI PostgreSQL 17](https://github.com/idtech-assessoria/elo/actions/runs/34555351023). O deploy `dep-dahmjnid0e5s7381k18g` compilou, mas retornou `SELF_SIGNED_CERT_IN_CHAIN`.
- Os certificados oficiais de produção 2021/2025 foram verificados e instalados como `DATABASE_SSL_CA`, mantendo a verificação TLS. A origem e os fingerprints estão em `docs/DATABASE-TLS.md`. Essa atualização gerou o deploy `dep-dahmm52d0e5s7381t28g`, que avançou até o PostgreSQL e retornou `42501`.
- A consulta de privilégios confirmou `public_usage=true`, grants nas três colunas de sessão, mas `auth_usage=false`. O schema Auth pertence a `supabase_admin`; `postgres` tem USAGE sem opção de delegação. O GRANT antigo não basta nesse ambiente gerenciado.
- A migração privada cria `elo_private.session_active(uuid,uuid)` com SQL fixo, `SECURITY DEFINER`, `search_path` vazio, retorno booleano e EXECUTE apenas para `elo_backend`. Remove o acesso direto às três colunas de `auth.sessions`. Não altera o schema Auth, proprietários gerenciados, RLS nem a identidade da aplicação.
- A inicialização e o verificador de sessão passam a chamar essa função. Os testes reproduzem a falta de USAGE em Auth, bloqueiam acesso por clientes, validam sessão de outro usuário, expiração, revogação e prazo ilimitado. Auth simulado, PostgreSQL/PGlite, lint e TypeScript passaram localmente. CI, aplicação da migração e novo deploy ainda pendentes.

## Publicação confirmada pelo Render

- O commit `c2b5d9567f192971452b556296cd18641cc5c09a` passou em todos os gates do [CI](https://github.com/idtech-assessoria/elo/actions/runs/34556360184), incluindo PostgreSQL 17, inicialização real, build e HTTP com Auth simulado.
- A migração `elo_private_session_check` foi aplicada como `20260911025535`. O arquivo local foi renomeado para coincidir com esse registro, sem alterar o SQL validado. O login do aplicativo pode executar a função privada e não tem acesso direto ao schema Auth nem às antigas colunas de sessão. `anon`, `authenticated` e `service_role` não podem executar a função. O advisor de segurança retornou zero alertas.
- A consulta administrativa não pode fazer `SET ROLE elo_app` nesse projeto. Esse teste foi recusado e não foram alteradas associações de papéis para realizá-lo. A verificação real foi feita pelo login já configurado no Render.
- O deploy `dep-dahmrvnqj5pc739m2hf0` iniciou às 02:57:02 UTC. Às 02:58:29, o log confirmou: `Elo database ready: connection, restricted elo_app role, 14 tables with RLS, session permissions verified.` Next.js ficou pronto na porta 10000 e o Render marcou o deploy **live** às 02:58:38 UTC.
- A ferramenta web não abriu `/login`, `/`, `/api/workspace` ou `/api/portal`; a tentativa HTTP local terminou com aprovação de rede cancelada antes da decisão. Portanto, não afirmar que os status HTTP externos, redirecionamentos ou tela pública foram verificados nesta sessão. O CI HTTP aprovado usa ambiente e Auth simulados.
- O próximo passo exige o painel do titular, pois o conector Supabase não oferece configuração Auth: salvar Site URL `https://elo-validacao.onrender.com` e Redirect URL `https://elo-validacao.onrender.com/auth/callback`. Conferir o provedor de e-mail e a participação de `idtech.assessoria@gmail.com` na equipe antes de usar o SMTP padrão.
- A última consulta da base confirmou zero assistências e zero contas Auth da proprietária. `ELO_OWNER_USER_ID` permanece ausente. A importação não foi executada e nenhum e-mail real ou dado operacional foi criado. A remoção do domínio incorreto está concluída, sem contratação de plano pago.

## Confirmação real da proprietária e restauração

- O titular informou que solicitou o link, recebeu o e-mail do Supabase e confirmou. A conta `idtech.assessoria@gmail.com` tem `email_confirmed_at=2026-09-11T03:11:15.624381Z`, `is_anonymous=false` e login registrado em seguida. O UUID foi consultado diretamente no Auth e usado no vínculo; nenhuma confirmação de e-mail ou conta fictícia foi criada por SQL.
- A captura enviada mostra a tela autenticada do Elo com a mensagem de assistência ainda não configurada. A base confirmou zero assistências: o bloqueio era a restauração e o vínculo pendentes.
- O JSON original foi conferido novamente pelo SHA-256 `51d37ae8fa8c00b8cdc2ecb166848f23dbccbe2feca1c3fbe99930f2eccd79c1`. O destino autorizado permanece registrado em `config/owner-migration.json`.
- A restauração foi executada pelo conector SQL administrativo do Supabase, sem transportar uma senha administrativa. Foi preparada uma única transação equivalente às proteções do importador: isolamento serializável, bloqueio exclusivo das 14 tabelas, bloqueio compartilhado da conta Auth, UUID/e-mail confirmado e verificação de todas as tabelas vazias. Primeiro o INSERT foi validado com ROLLBACK; uma consulta separada confirmou zero assistências. Depois a mesma transação foi executada com COMMIT.
- A conferência após o COMMIT mostrou `primary`, proprietária confirmada, contato `idtech.assessoria@gmail.com`, revisão zero e data original `2026-09-10T03:12:08.759Z`. Nome, demais configurações e backup original foram preservados. Havia zero peças, lojistas, empréstimos, pagamentos e e-mails na fila. Não executar nova importação nesse destino.
- Só depois dessa conferência, o Render aceitou a atualização de `ELO_OWNER_USER_ID`, utilizando o UUID real. A atualização iniciou o deploy `dep-dahn5uafngtc73d7if40`, commit `10135336a24efb3cf9df5305c7653efaab3f159d`; esse commit passou no [CI](https://github.com/idtech-assessoria/elo/actions/runs/34556958998).
- O deploy terminou com status `live` em `2026-09-11T03:20:04.203426Z`. Os logs registraram novamente `Elo database ready: connection, restricted elo_app role, 14 tables with RLS, session permissions verified.`, o Next.js iniciou na porta 10000 e o Render confirmou a URL pública. A verificação visual do painel administrativo após a restauração permanece a cargo do titular; usar `/` ou o botão “Voltar à assistência” na tela anterior, no mesmo navegador da sessão.
- Nenhum e-mail adicional foi disparado pelo assistente. Resend/Gmail e o envio operacional para lojistas continuam pendentes; o domínio descartado não foi recriado e nenhum plano pago foi contratado.

## Retorno ao login após sair da conta

- O titular relatou não conseguir entrar novamente depois de sair. A página pública `/login` e o retorno da raiz sem sessão foram observados no navegador; o fluxo então publicado exibia “Seu próximo passo começa aqui.”. Não foi utilizada a sessão pessoal do titular nem enviado um e-mail para reproduzir a reclamação.
- A suíte HTTP local reproduziu um caminho sem saída: uma falha simulada do provedor durante o logout retornava JSON com HTTP 503, sem formulário ou navegação. O teste falhou antes da correção e passou depois. Não há evidência suficiente para atribuir a experiência específica do titular exclusivamente a essa falha do provedor.
- O commit `ee2f2481f246eb6290918ecdad425b8968096761` retorna à tela “Entrar no Elo” após a saída, distingue confirmação de saída de erro do provedor e permite revisitar `/auth/logout` por GET sem encerrar sessões. O POST mantém a proteção de origem e usa somente o escopo de sessão atual.
- Login e rotas Auth não dependem da renovação de uma sessão antiga no proxy. As verificações de identidade, sessão revogada, confirmação de e-mail, autorização no banco e PKCE permanecem nos pontos responsáveis. Nenhuma tabela, política RLS, credencial ou configuração Auth externa foi alterada nesta correção.
- O portal agora oferece “Entrar novamente” em sua tela de erro. Uma resposta 401 na atualização do painel deixa de ser silenciosa. O formulário permite reenvio manual depois de um minuto, respeita erros 429 do provedor, esclarece que o link é de uso único e utiliza fonte de 16px no campo de e-mail para o celular.
- Lint sem avisos, TypeScript, Auth, build e testes HTTP passaram localmente. A suíte HTTP usa servidor Auth local simulado e cobre cookies expirados no login público, saída repetida, limpeza de cookies, novo desafio PKCE após sair e erro do provedor sem bloquear o formulário.
- O [CI do commit](https://github.com/idtech-assessoria/elo/actions/runs/34559164993) passou integralmente, incluindo auditoria de dependências, regras de negócio, suítes legadas, PostgreSQL 17, preflight de inicialização, build e HTTP. Só depois foi iniciado o deploy `dep-dahnfv7qj5pc739olra0`, no serviço gratuito já existente, com publicação automática ainda desabilitada.
- O Render marcou o deploy `live` em `2026-09-11T03:41:17.772651Z`. Os logs confirmaram novamente a conexão com o banco, papel `elo_app` restrito, 14 tabelas com RLS e função de sessão. O navegador público mostrou o título “Entrar no Elo”, campo “Seu e-mail” e botão “Entrar com e-mail”; um GET em `/auth/logout` retornou à mesma tela de login. Nenhum login ou logout da sessão pessoal do titular foi executado pelo assistente.

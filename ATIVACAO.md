# Ativação do Elo

Proprietária solicitada: **idtech.assessoria@gmail.com**. Repositório: **idtech-assessoria/elo**, branch **migration/github-supabase-resend**. Projeto Supabase: **ELO**, referência **jrfmakgafcybhinjkalc**.

O Render confirmou o serviço **live** em 11/09/2026 às 02:58:38 UTC, no deploy `dep-dahmrvnqj5pc739m2hf0`, commit `c2b5d9567f192971452b556296cd18641cc5c09a`. O servidor iniciou após verificar conexão PostgreSQL com TLS, papel restrito, 14 tabelas com RLS e função privada de sessão. A abertura externa da URL não pôde ser conferida pelas ferramentas desta sessão. Ainda faltam configurar as URLs do Auth, confirmar a conta da proprietária, importar a assistência original e configurar os e-mails; o uso operacional não está liberado.

## Hospedagem preparada

`render.yaml` define um único Web Service Node.js 24, `elo-validacao`, no plano `free`, região Virginia. Usa a branch de migração, instala pelo lockfile, compila Next.js e executa uma verificação de banco antes de `npm start`, na porta fornecida pelo Render. Publicação automática e previews estão desabilitados. Não cria PostgreSQL, disco ou cron no Render.

O serviço `srv-dahlmoqd0e5s73fu2s70` está publicado em [https://elo-validacao.onrender.com](https://elo-validacao.onrender.com). O comando de inicialização define `APP_URL` com `RENDER_EXTERNAL_URL` quando não houver domínio próprio configurado. `npm run check:runtime` exige conexão com o banco, o papel restrito `elo_app`, as 14 tabelas com RLS e execução da função privada de sessão. A verificação é somente de leitura e bloqueia a inicialização quando falha; passou no deploy publicado. O `/login` verifica que o servidor responde; não comprova SMTP ou login completo.

O plano gratuito é destinado à validação: pode hibernar, reiniciar e ser suspenso por cotas. O próprio Render não o recomenda para produção. O titular confirmou o workspace e o plano Free; o serviço foi criado sem contratar plano pago, banco ou disco adicionais. Um plano de produção ou domínio pago depende de escolha e autorização de custo.

Referências: [Next.js no Render](https://render.com/docs/deploy-nextjs-app), [limites gratuitos](https://render.com/docs/free), [configuração Blueprint](https://render.com/docs/blueprint-spec), [variáveis fornecidas pelo Render](https://render.com/docs/environment-variables).

## Valores do servidor

| Configuração | Valor ou origem |
|---|---|
| `APP_URL` | URL real do servidor; o comando do Render usa automaticamente sua URL HTTPS se não houver valor explícito |
| `SUPABASE_URL` | `https://jrfmakgafcybhinjkalc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable habilitada do projeto ELO; nunca `service_role` |
| `DATABASE_URL` | Conexão privada de um login exclusivo que herde `elo_backend` |
| `DATABASE_POOLER_HOST` | `aws-0-sa-east-1.pooler.supabase.com`, confirmado na captura do titular |
| `DATABASE_POOLER_USER` | `elo_app.jrfmakgafcybhinjkalc` |
| `DATABASE_SSL_CA` | Certificados públicos oficiais Supabase 2021/2025, já instalados; origem e fingerprints em [docs/DATABASE-TLS.md](docs/DATABASE-TLS.md) |
| `ELO_OWNER_EMAIL` | `idtech.assessoria@gmail.com` |
| `ELO_OWNER_USER_ID` | UUID real, apenas depois de confirmar o e-mail e importar a assistência |
| `MESSAGING_ENCRYPTION_KEY` | 32 bytes aleatórios codificados como **64 caracteres hexadecimais**, guardados no gerenciador de segredos |

As variáveis com `sync: false` no Blueprint precisam ser inseridas no servidor. Não coloque senhas, API keys privadas ou chave de cifragem no GitHub, no backup ou em logs. O gerador de segredo padrão do Render produz Base64 e não deve ser usado diretamente para a chave hexadecimal exigida pelo Elo. Gere a chave uma única vez e mantenha cópia segura; não gere outra a cada deploy.

A migração `20260911001722_elo_runtime_credentials` criou `elo_app` com `LOGIN INHERIT`, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE` ou `BYPASSRLS`, limite de dez conexões e somente associação a `elo_backend`. A senha SCRAM e a chave de cifragem são geradas no servidor e preservadas no Vault, nos nomes `elo_app_database_password` e `elo_messaging_encryption_key`. O papel da aplicação não pode ler o Vault nem `auth.users`. Ambientes PostgreSQL sem Vault deixam o papel sem login e não geram credenciais. A migração recusa substituir segredos existentes.

Os segredos já estão nas variáveis privadas da hospedagem. Para a troca de rede, manter `DATABASE_URL` e sua senha; configurar somente `DATABASE_POOLER_HOST` e `DATABASE_POOLER_USER`. O adaptador aplica esses dois valores, usa a porta de sessão `5432`, preserva a senha e o banco, exige ambos os campos e mantém a verificação TLS. Hosts externos ao domínio oficial do pooler são recusados. Sem essas variáveis opcionais, a conexão original é usada. Em migrações/importações administrativas fora do Render, deixar essas duas variáveis ausentes.

O endereço do pooler foi obtido da captura do painel, sem tentativa de índices. No pooler, o usuário é `elo_app.jrfmakgafcybhinjkalc`; na conexão direta, `elo_app`. A conexão administrativa fica reservada às migrações e à importação. Referências: [conexões PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vault](https://supabase.com/docs/guides/database/vault).

## Supabase Auth e Resend

O titular descartou `idtech.com.br`, cadastrado por engano. As instruções de configuração desse domínio foram removidas. Para validar inicialmente o acesso da proprietária sem domínio de envio próprio, conferir as condições do SMTP padrão do Supabase em [docs/EMAIL-ATIVACAO.md](docs/EMAIL-ATIVACAO.md). Essa opção limitada não atende aos e-mails de lojistas em produção.

1. Para operação pelo Resend, selecionar um domínio que o titular efetivamente controle e verificar sua posse. `gmail.com` não pertence à proprietária e não pode ser usado como domínio remetente no Resend. O Gmail informado permanece como login e contato da proprietária. Não comprar domínio sem autorização de custo.
2. No Supabase Auth do ELO, definir a **Site URL** como `https://elo-validacao.onrender.com` e permitir o callback exato `https://elo-validacao.onrender.com/auth/callback`. Manter confirmação de e-mail ativa e contas anônimas desabilitadas. A aplicação usa link mágico com PKCE. A integração disponível não aplicou essas configurações.
3. Configurar o SMTP do Auth: host `smtp.resend.com`, porta `465`, usuário `resend`, senha igual à API key privada do Resend; remetente em domínio verificado e nome `Elo — Peças & Empréstimos`. Manter rastreamento de links de autenticação desabilitado.
4. Após autorização de envio real, a proprietária solicita o link em `/login`, abre-o no mesmo navegador e confirma a conta. Não marcar e-mail como confirmado por SQL e não criar uma identidade fictícia. Consultar o UUID da conta verificada de `idtech.assessoria@gmail.com`.
5. Executar a conferência e a importação conforme [MIGRACAO.md](MIGRACAO.md), usando o backup original e a conexão administrativa em ambiente privado. O UUID permanece ausente do servidor durante essa etapa. Configurá-lo na hospedagem somente após a importação bem-sucedida.
6. Configurar separadamente o canal de avisos na central de mensagens do Elo. O canal usa uma API key com as permissões exigidas para verificar domínios e acompanhar envios, cifrada com a chave do servidor. Configurar SMTP no Auth não configura automaticamente essa central. Evitar qualquer envio durante a configuração; executar o teste real somente com autorização.

Referências: [domínios verificados](https://resend.com/docs/dashboard/domains/introduction), [SMTP Resend no Supabase](https://resend.com/docs/send-with-supabase-smtp), [SMTP próprio no Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Conferência após ativar

Validar HTTPS, login, logout/revogação, assistência original e contato atualizado. Conferir isolamento e concorrência com dados de teste em banco isolado; a base operacional não deve receber dados fictícios. Só concluir a validação integrada de e-mail quando o remetente, destinatário e envio real estiverem autorizados. O CI valida PostgreSQL 17 real e usa provedores Auth/Resend/Gmail simulados.

## Acesso observado nesta continuação

Em 11/09/2026, o usuário confirmou a publicação gratuita no workspace **My Workspace**, da conta `idtech.assessoria@gmail.com`, ID `tea-dahjohu1egvs738arhcg`. O bloqueio inicial HTTP 400 foi resolvido após a liberação do repositório no GitHub do Render. A criação do serviço `srv-dahlmoqd0e5s73fu2s70` foi concluída e suas variáveis privadas foram configuradas. [Painel do serviço](https://dashboard.render.com/web/srv-dahlmoqd0e5s73fu2s70).

O primeiro deploy, `dep-dahlmpad0e5s73fu3240`, compilou o commit `7b3b4be6b2eec8cfcef7c3cd80b73b6a99ed82b5`, mas falhou na inicialização com `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. A correção está no commit `09293b8cc0bdb0c3de03a69525296686640efedb`, com [CI integralmente aprovado](https://github.com/idtech-assessoria/elo/actions/runs/34551786861), incluindo o comando real de inicialização contra PostgreSQL 17. Os construtores agora usam propriedades explícitas compatíveis com o Node.

O segundo deploy, `dep-dahlq91594qs73fid4s0`, compilou essa correção com sucesso, mas retornou `Elo database preflight failed: ENETUNREACH`. Naquela tentativa, o servidor Next.js não iniciou. Esse bloqueio foi resolvido com o Session pooler; os bloqueios posteriores de certificado e acesso direto ao Auth foram resolvidos antes do deploy publicado.

Usar o serviço existente nos próximos deploys; não criar duplicata nem gerar novas chaves. Verificar o deploy e a conexão PostgreSQL antes de anunciar que está no ar. A API de criação não expõe `healthCheckPath`; o caminho `/login` do Blueprint ainda precisa ser configurado pelo painel se necessário. O serviço criado usa a verificação TCP padrão.

A integração Supabase não expôs o endereço do pooler; o titular forneceu a captura correspondente. A revisão automática recusou retransmitir a senha em uma atualização de `DATABASE_URL`. A alternativa aplicada transmite apenas os dois campos públicos do pooler e utiliza a senha previamente instalada no servidor, sem novo envio de segredo. A atualização foi aceita, os certificados oficiais foram instalados e a conexão final passou no Render. A migração aplicada `20260911025535_elo_private_session_check` substitui a leitura direta de sessões pela função privada; os papéis de API não podem executá-la. O advisor de segurança retornou zero alertas.

O próximo passo é conferir a abertura de `/login` e salvar as duas URLs em [Supabase Auth > URL Configuration](https://supabase.com/dashboard/project/jrfmakgafcybhinjkalc/auth/url-configuration). O conector atual não permite alterar essa configuração; os valores exatos estão em `docs/EMAIL-ATIVACAO.md`. Não solicitar link real antes de conferir o provedor de e-mail e a autorização de envio.

O titular confirmou a exclusão de `idtech.com.br` após receber o aviso exigido. O cadastro foi removido do Resend e a listagem posterior retornou zero domínios. Não há pendência de confirmação ou remoção desse cadastro. O domínio permanece descartado das instruções de ativação e nenhum DNS foi alterado. A última conferência da base mostrou zero conexões Resend/Gmail, zero contas Auth da proprietária e zero assistências.

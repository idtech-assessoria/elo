# Ativação do Elo

Proprietária solicitada: **idtech.assessoria@gmail.com**. Repositório: **idtech-assessoria/elo**, branch **migration/github-supabase-resend**. Projeto Supabase: **ELO**, referência **jrfmakgafcybhinjkalc**.

O código e o esquema PostgreSQL já estão nos destinos. O login privado `elo_app` e a chave de cifragem foram criados no Supabase em 11/09/2026. Ainda faltam concluir e verificar a publicação do servidor, confirmar a conta Auth, importar a assistência original e configurar o domínio/remetente de e-mail. Esta preparação não significa que o aplicativo esteja pronto para uso operacional.

## Hospedagem preparada

`render.yaml` define um único Web Service Node.js 24, `elo-validacao`, no plano `free`, região Virginia. Usa a branch de migração, instala pelo lockfile, compila Next.js e executa uma verificação de banco antes de `npm start`, na porta fornecida pelo Render. Publicação automática e previews estão desabilitados. Não cria PostgreSQL, disco ou cron no Render.

O endereço será o HTTPS atribuído pelo Render. O comando de inicialização define `APP_URL` com `RENDER_EXTERNAL_URL` quando não houver domínio próprio configurado. `npm run check:runtime` exige conexão com o banco, o papel restrito `elo_app`, as 14 tabelas com RLS e leitura das colunas de sessão autorizadas. A verificação é somente de leitura e bloqueia a inicialização quando falha. O `/login` verifica que o servidor responde; não comprova SMTP ou login completo.

O plano gratuito é destinado à validação: pode hibernar, reiniciar e ser suspenso por cotas. O próprio Render não o recomenda para produção. Antes de criar o serviço, conferir o workspace, cobrança de excedentes e limites de gastos. Um plano de produção ou domínio pago depende de escolha e autorização de custo; nada foi contratado.

Referências: [Next.js no Render](https://render.com/docs/deploy-nextjs-app), [limites gratuitos](https://render.com/docs/free), [configuração Blueprint](https://render.com/docs/blueprint-spec), [variáveis fornecidas pelo Render](https://render.com/docs/environment-variables).

## Valores do servidor

| Configuração | Valor ou origem |
|---|---|
| `APP_URL` | URL real do servidor; o comando do Render usa automaticamente sua URL HTTPS se não houver valor explícito |
| `SUPABASE_URL` | `https://jrfmakgafcybhinjkalc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable habilitada do projeto ELO; nunca `service_role` |
| `DATABASE_URL` | Conexão privada de um login exclusivo que herde `elo_backend` |
| `DATABASE_SSL_CA` | Certificado CA confiável, caso a conexão exija; nunca desabilitar a verificação TLS |
| `ELO_OWNER_EMAIL` | `idtech.assessoria@gmail.com` |
| `ELO_OWNER_USER_ID` | UUID real, apenas depois de confirmar o e-mail e importar a assistência |
| `MESSAGING_ENCRYPTION_KEY` | 32 bytes aleatórios codificados como **64 caracteres hexadecimais**, guardados no gerenciador de segredos |

As variáveis com `sync: false` no Blueprint precisam ser inseridas no servidor. Não coloque senhas, API keys privadas ou chave de cifragem no GitHub, no backup ou em logs. O gerador de segredo padrão do Render produz Base64 e não deve ser usado diretamente para a chave hexadecimal exigida pelo Elo. Gere a chave uma única vez e mantenha cópia segura; não gere outra a cada deploy.

A migração `20260911001722_elo_runtime_credentials` criou `elo_app` com `LOGIN INHERIT`, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE` ou `BYPASSRLS`, limite de dez conexões e somente associação a `elo_backend`. A senha SCRAM e a chave de cifragem são geradas no servidor e preservadas no Vault, nos nomes `elo_app_database_password` e `elo_messaging_encryption_key`. O papel da aplicação não pode ler o Vault nem `auth.users`. Ambientes PostgreSQL sem Vault deixam o papel sem login e não geram credenciais. A migração recusa substituir segredos existentes.

Transfira os valores somente para as variáveis privadas da hospedagem. Escolha em **Supabase > Connect** a conexão compatível com a rede do servidor: conexão direta para IPv6 ou **Session pooler** para IPv4. O hostname do pooler deve ser copiado do painel; não pode ser deduzido da região. No pooler, o usuário é `elo_app.jrfmakgafcybhinjkalc`; na conexão direta, `elo_app`. A conexão administrativa fica reservada às migrações e à importação. Referências: [conexões PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vault](https://supabase.com/docs/guides/database/vault).

## Supabase Auth e Resend

1. Consultar os domínios existentes no Resend e selecionar um domínio próprio verificado. `gmail.com` não pertence à proprietária e não pode ser usado como domínio remetente no Resend. O Gmail informado permanece como login e contato da proprietária. Não comprar domínio sem autorização de custo.
2. No Supabase Auth do ELO, definir a **Site URL** com a origem real e permitir o callback exato `https://ENDERECO-REAL/auth/callback`. Manter confirmação de e-mail ativa e contas anônimas desabilitadas. A aplicação usa link mágico com PKCE.
3. Configurar o SMTP do Auth: host `smtp.resend.com`, porta `465`, usuário `resend`, senha igual à API key privada do Resend; remetente em domínio verificado e nome `Elo — Peças & Empréstimos`. Manter rastreamento de links de autenticação desabilitado.
4. Após autorização de envio real, a proprietária solicita o link em `/login`, abre-o no mesmo navegador e confirma a conta. Não marcar e-mail como confirmado por SQL e não criar uma identidade fictícia. Consultar o UUID da conta verificada de `idtech.assessoria@gmail.com`.
5. Executar a conferência e a importação conforme [MIGRACAO.md](MIGRACAO.md), usando o backup original e a conexão administrativa em ambiente privado. O UUID permanece ausente do servidor durante essa etapa. Configurá-lo na hospedagem somente após a importação bem-sucedida.
6. Configurar separadamente o canal de avisos na central de mensagens do Elo. O canal usa uma API key com as permissões exigidas para verificar domínios e acompanhar envios, cifrada com a chave do servidor. Configurar SMTP no Auth não configura automaticamente essa central. Evitar qualquer envio durante a configuração; executar o teste real somente com autorização.

Referências: [domínios verificados](https://resend.com/docs/dashboard/domains/introduction), [SMTP Resend no Supabase](https://resend.com/docs/send-with-supabase-smtp), [SMTP próprio no Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Conferência após ativar

Validar HTTPS, login, logout/revogação, assistência original e contato atualizado. Conferir isolamento e concorrência com dados de teste em banco isolado; a base operacional não deve receber dados fictícios. Só concluir a validação integrada de e-mail quando o remetente, destinatário e envio real estiverem autorizados. O CI valida PostgreSQL 17 real e usa provedores Auth/Resend/Gmail simulados.

## Acesso observado nesta continuação

Em 11/09/2026, as operações do Render passaram a responder. O usuário confirmou a publicação gratuita no workspace **My Workspace**, da conta `idtech.assessoria@gmail.com`, ID `tea-dahjohu1egvs738arhcg`. A tentativa de criação retornou HTTP 400: o repositório privado `https://github.com/idtech-assessoria/elo` estava inacessível ao Render. A listagem posterior confirmou que nenhum serviço foi criado. Não há URL pública dessa migração nem conexão a partir do Render validada.

Para liberar esse bloqueio, a pessoa titular deve conectar GitHub em **Render > Account Settings > Account Security > Git Deployment Credentials > Add credential** e incluir `idtech-assessoria/elo` no acesso do aplicativo Render. Para instalação existente, [configurar as permissões do Render no GitHub](https://github.com/apps/render/installations/new). [Instruções oficiais](https://render.com/docs/git-provider). A autorização do workspace Free já foi concedida e não precisa ser solicitada novamente.

Após a liberação, conferir se há algum serviço criado manualmente para evitar duplicação. Se o workspace continuar vazio, criar `elo-validacao` com as opções do Blueprint e os segredos existentes no Vault; não gerar novas chaves. Verificar o deploy e a conexão PostgreSQL antes de anunciar que está no ar. A API de criação não expõe `healthCheckPath`; caso usado o MCP, o caminho `/login` do Blueprint ainda precisa ser configurado pelo painel se necessário.

A integração Supabase acessa banco e projeto, mas não expôs administração de usuários, configurações Auth/SMTP ou o endereço do pooler. Se a rede do Render exigir IPv4, obter o hostname real de **Connect > Session pooler**. Não desabilitar TLS ou comprar o adicional IPv4 para contornar essa pendência. Resend ainda precisa ser consultado na etapa de e-mail.

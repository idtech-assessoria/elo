# Ativação do Elo

Proprietária solicitada: **idtech.assessoria@gmail.com**. Repositório: **idtech-assessoria/elo**, branch **migration/github-supabase-resend**. Projeto Supabase: **ELO**, referência **jrfmakgafcybhinjkalc**.

A proprietária confirmou `idtech.assessoria@gmail.com` pelo e-mail do Supabase em 11/09/2026 às 03:11:15 UTC. A assistência original foi restaurada e vinculada ao UUID real dessa conta; o contato foi atualizado para o e-mail autorizado e a data/configurações originais foram preservadas. `ELO_OWNER_USER_ID` foi instalado no Render somente depois da restauração. O login com senha está **live às 04:17:05 UTC**, no deploy `dep-daho0i4s728c73crm0cg`, commit `8f2f00f8d18eb688064fddfc75bd86442a007f3c`, após CI completo. A ativação por código da primeira senha está em validação nesta revisão. O acesso administrativo fica na raiz `https://elo-validacao.onrender.com/`; o canal de avisos operacionais ainda não está configurado.

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
| `ELO_OWNER_USER_ID` | UUID real da conta confirmada de `idtech.assessoria@gmail.com`, já instalado após a restauração |
| `MESSAGING_ENCRYPTION_KEY` | 32 bytes aleatórios codificados como **64 caracteres hexadecimais**, guardados no gerenciador de segredos |

As variáveis com `sync: false` no Blueprint precisam ser inseridas no servidor. Não coloque senhas, API keys privadas ou chave de cifragem no GitHub, no backup ou em logs. O gerador de segredo padrão do Render produz Base64 e não deve ser usado diretamente para a chave hexadecimal exigida pelo Elo. Gere a chave uma única vez e mantenha cópia segura; não gere outra a cada deploy.

A migração `20260911001722_elo_runtime_credentials` criou `elo_app` com `LOGIN INHERIT`, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE` ou `BYPASSRLS`, limite de dez conexões e somente associação a `elo_backend`. A senha SCRAM e a chave de cifragem são geradas no servidor e preservadas no Vault, nos nomes `elo_app_database_password` e `elo_messaging_encryption_key`. O papel da aplicação não pode ler o Vault nem `auth.users`. Ambientes PostgreSQL sem Vault deixam o papel sem login e não geram credenciais. A migração recusa substituir segredos existentes.

Os segredos já estão nas variáveis privadas da hospedagem. Para a troca de rede, manter `DATABASE_URL` e sua senha; configurar somente `DATABASE_POOLER_HOST` e `DATABASE_POOLER_USER`. O adaptador aplica esses dois valores, usa a porta de sessão `5432`, preserva a senha e o banco, exige ambos os campos e mantém a verificação TLS. Hosts externos ao domínio oficial do pooler são recusados. Sem essas variáveis opcionais, a conexão original é usada. Em migrações/importações administrativas fora do Render, deixar essas duas variáveis ausentes.

O endereço do pooler foi obtido da captura do painel, sem tentativa de índices. No pooler, o usuário é `elo_app.jrfmakgafcybhinjkalc`; na conexão direta, `elo_app`. A conexão administrativa fica reservada às migrações e à importação. Referências: [conexões PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vault](https://supabase.com/docs/guides/database/vault).

## Supabase Auth e Resend

O titular descartou `idtech.com.br`, cadastrado por engano. As instruções de configuração desse domínio foram removidas. Para validar inicialmente o acesso da proprietária sem domínio de envio próprio, conferir as condições do SMTP padrão do Supabase em [docs/EMAIL-ATIVACAO.md](docs/EMAIL-ATIVACAO.md). Essa opção limitada não atende aos e-mails de lojistas em produção.

1. Para operação pelo Resend, selecionar um domínio que o titular efetivamente controle e verificar sua posse. `gmail.com` não pertence à proprietária e não pode ser usado como domínio remetente no Resend. O Gmail informado permanece como login e contato da proprietária. Não comprar domínio sem autorização de custo.
2. Na configuração do Supabase Auth, manter a **Site URL** `https://elo-validacao.onrender.com` e o callback exato `https://elo-validacao.onrender.com/auth/callback`. A proprietária recebeu o link e retornou ao Elo; o fluxo utilizado funcionou. Os valores completos do painel não foram inspecionados pela integração. Manter confirmação de e-mail ativa e contas anônimas desabilitadas.
3. Configurar o SMTP do Auth: host `smtp.resend.com`, porta `465`, usuário `resend`, senha igual à API key privada do Resend; remetente em domínio verificado e nome `Elo — Peças & Empréstimos`. Manter rastreamento de links de autenticação desabilitado.
4. **Concluído:** a proprietária solicitou e abriu o link, e sua conta real foi confirmada pelo Supabase. Nenhuma confirmação foi atribuída por SQL e nenhum e-mail adicional foi enviado pelo assistente.
5. **Concluído:** restauração da única assistência original em transação serializável, com bloqueio das 14 tabelas, identidade confirmada e recusa de destino com dados. A conferência com rollback passou antes do COMMIT. Data original `2026-09-10T03:12:08.759Z`, revisão zero e configurações preservadas; somente vínculo e contato associado ao e-mail antigo foram atualizados. Não repetir a importação: o destino já possui a assistência. `ELO_OWNER_USER_ID` foi configurado após essa etapa.
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

O painel da assistência fica em [https://elo-validacao.onrender.com/](https://elo-validacao.onrender.com/). Para voltar depois de sair, abrir [Entrar no Elo](https://elo-validacao.onrender.com/login) com `idtech.assessoria@gmail.com` e a senha escolhida pela titular. A primeira senha pode ser definida por uma sessão já aberta em **Minha senha de acesso** ou após validar um código nativo de recuperação em `/password-setup`, emitido por administrador autorizado. Não confundir a senha da conta administrativa do painel Supabase com a senha do usuário Auth do Elo. A opção por link permanece disponível; o assistente não deve solicitar e-mails reais automaticamente.

O titular confirmou a exclusão de `idtech.com.br` após receber o aviso exigido. O cadastro foi removido do Resend e a listagem posterior retornou zero domínios. Não há pendência de confirmação ou remoção desse cadastro. A base agora possui a conta Auth confirmada e uma assistência vinculada, sem peças, lojistas, empréstimos, pagamentos ou e-mails na fila na conferência após a importação. O canal Resend/Gmail permanece sem configuração.

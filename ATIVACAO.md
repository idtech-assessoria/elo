# Ativação do Elo

Proprietária solicitada: **idtech.assessoria@gmail.com**. Repositório: **idtech-assessoria/elo**, branch **migration/github-supabase-resend**. Projeto Supabase: **ELO**, referência **jrfmakgafcybhinjkalc**.

O código e o esquema PostgreSQL já estão nos destinos. Ainda faltam o servidor, suas credenciais privadas, a confirmação da conta Auth, a importação original e o domínio/remetente de e-mail. Esta preparação não significa que o aplicativo está publicado ou pronto para uso operacional.

## Hospedagem preparada

`render.yaml` define um único Web Service Node.js 24, `elo-validacao`, no plano `free`, região Virginia. Usa a branch de migração, instala pelo lockfile, compila Next.js e executa `npm start` na porta fornecida pelo Render. Publicação automática e previews estão desabilitados. Não cria PostgreSQL, disco ou cron no Render.

O endereço será o HTTPS atribuído pelo Render. O comando de inicialização define `APP_URL` com `RENDER_EXTERNAL_URL` quando não houver domínio próprio configurado. Não se presume que um subdomínio específico esteja disponível. O `/login` verifica que o servidor responde; esse health check não comprova conexão com banco, SMTP ou login completo.

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

A conexão da aplicação não deve usar o login administrativo `postgres`. A administração cria um login exclusivo com `LOGIN INHERIT`, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE` ou `BYPASSRLS`, e concede somente a associação a `elo_backend`. Guarde a senha diretamente no ambiente da hospedagem. Escolha em **Supabase > Connect** a conexão compatível com a rede do servidor; use pooler quando necessário. A conexão administrativa fica reservada às migrações e à importação.

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

O usuário conectou Resend e Render, e ambos passaram a aparecer instalados. Suas operações ainda não estavam expostas ao executor ao concluir esta preparação; nenhum domínio ou serviço dessas contas foi presumido como acessível. Não é necessário reinstalar as integrações por causa desse registro. A integração Supabase acessa banco e projeto, mas não expôs administração de usuários ou das configurações Auth/SMTP. Nenhum segredo foi obtido por caminhos alternativos.

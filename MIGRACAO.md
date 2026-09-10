# Implantação e preservação dos dados

Destino confirmado: Supabase **ELO**, referência `jrfmakgafcybhinjkalc`, São Paulo, PostgreSQL 17.6. O estado aplicado está em `CHECKPOINT.md`.

## Banco

1. Confirme o projeto e obtenha a conexão PostgreSQL em **Connect**. Use uma conexão de migração com permissão de DDL e guarde a senha somente em `.env.local` ignorado ou no gerenciador de segredos da hospedagem.
2. `npm run db:migrate` confere sem aplicar; `npm run db:migrate -- --apply` executa as migrações pendentes com o Supabase CLI. Confira o histórico remoto antes: uma migração aplicada via MCP não deve ser reaplicada sob outra versão. Alinhe o histórico local com a versão remota após conferir o SQL; não ignore erros de histórico.
3. O SQL cria `elo_backend` sem login, com acesso às tabelas do Elo e às colunas necessárias de `auth.sessions`. Configure um login exclusivo do servidor que herde esse papel. Não use permanentemente na aplicação a credencial administrativa de migração.
4. Escolha a conexão direta ou pooler compatível com a hospedagem. O driver não cria prepared statements nomeados; cada lote usa a mesma conexão até o commit. Configure `DATABASE_SSL_CA` se a conexão exigir CA específica; nunca desative a verificação TLS.

Crie futuras migrações com `supabase migration new nome_da_migracao`. O diff gerado por `npm run db:generate` precisa de revisão, incluindo grants e policies em `supabase/migrations/`.

## Identidade e assistência original

O backup original tem uma assistência de revisão zero, sem peças, lojas, empréstimos, pagamentos ou mensagens operacionais, e não contém credenciais Gmail/Resend. Preserve o ZIP.

1. Configure a URL final no Supabase Auth e o callback exato `https://SEU-ENDERECO/auth/callback`. Localhost serve somente ao desenvolvimento.
2. Configure SMTP próprio no Supabase, por exemplo Resend com domínio verificado. O SMTP do login é separado do canal de avisos dentro do Elo.
3. A proprietária do backup é `lopesleticia297@gmail.com`. Obtenha o UUID de uma conta Supabase Auth cujo e-mail tenha sido confirmado pela titular. Envio real de convite/link depende da autorização correspondente; não crie usuário fictício nem marque o e-mail como confirmado sem verificação.
4. Defina `ELO_OWNER_EMAIL` e `ELO_OWNER_USER_ID`. A conta do GitHub não substitui esse vínculo.
5. Antes do primeiro acesso ao aplicativo, use `npm run db:import -- /caminho/dados/estado-operacional.json` para conferir o hash, o UUID/e-mail real e o banco vazio. Acrescente `--apply` para importar a única assistência, preservando configurações e data original e trocando somente o vínculo de identidade. A conexão de importação precisa consultar `auth.users`. O importador recusa banco com dados, não grava credenciais e não envia e-mails.

## Hospedagem e ativação

GitHub guarda o código; Supabase fornece Auth e banco. Falta escolher um serviço que execute Next.js/Node.js e eventual domínio. A escolha e os custos precisam ser apresentados antes de contratar ou publicar. Nenhuma hospedagem paga é criada pelo código ou pelo workflow.

Configure `APP_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `ELO_OWNER_EMAIL`, `ELO_OWNER_USER_ID` e `MESSAGING_ENCRYPTION_KEY` como variáveis do servidor. Gere uma chave de cifragem de 32 bytes para esta instalação e mantenha cópia segura. Trocar essa chave sem migração impede decifrar credenciais salvas.

Após o CI passar, valide no endereço final o link mágico, logout/revogação, proprietária, dois lojistas isolados e operações concorrentes em ambiente de teste. Valide remetente, conteúdo, links e retorno do provedor com envio real somente quando autorizado. Não crie dados fictícios na base operacional. A migração de código não declara o sistema pronto para produção.

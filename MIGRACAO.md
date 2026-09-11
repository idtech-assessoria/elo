# Implantação e preservação dos dados

Destino confirmado: Supabase **ELO**, referência `jrfmakgafcybhinjkalc`, São Paulo, PostgreSQL 17.6. O estado aplicado está em `CHECKPOINT.md`.

## Banco

1. Confirme o projeto e obtenha a conexão PostgreSQL em **Connect**. Use uma conexão de migração com permissão de DDL e guarde a senha somente em `.env.local` ignorado ou no gerenciador de segredos da hospedagem.
2. `npm run db:migrate` confere sem aplicar; `npm run db:migrate -- --apply` executa as migrações pendentes com o Supabase CLI. As duas migrações desta branch já estão aplicadas no ELO e seus nomes foram alinhados ao histórico remoto. Em outro ambiente vazio, serão aplicadas normalmente. Nunca reaplique uma migração existente sob outra versão nem ignore erros de histórico.
3. O SQL cria `elo_backend` sem login, com acesso às tabelas do Elo e à função privada `elo_private.session_active(uuid,uuid)`. Essa função retorna somente se a sessão existe, pertence ao usuário e não expirou. O schema Auth gerenciado não permite que `postgres` delegue `USAGE`; a migração privada remove os antigos grants de coluna e dispensa esse acesso direto. Configure um login exclusivo do servidor que herde `elo_backend`. Não use permanentemente na aplicação a credencial administrativa de migração.
4. Escolha a conexão direta ou pooler compatível com a hospedagem. O driver não cria prepared statements nomeados; cada lote usa a mesma conexão até o commit. Configure `DATABASE_SSL_CA` se a conexão exigir CA específica; nunca desative a verificação TLS.

Crie futuras migrações com `supabase migration new nome_da_migracao`. O diff gerado por `npm run db:generate` precisa de revisão, incluindo grants e policies em `supabase/migrations/`.

## Identidade e assistência original

O backup original tem uma assistência de revisão zero, sem peças, lojas, empréstimos, pagamentos ou mensagens operacionais, e não contém credenciais Gmail/Resend. Preserve o ZIP.

1. Configure a URL final no Supabase Auth e o callback exato `https://SEU-ENDERECO/auth/callback`. Localhost serve somente ao desenvolvimento.
2. Configure SMTP próprio no Supabase, por exemplo Resend com domínio verificado. O SMTP do login é separado do canal de avisos dentro do Elo.
3. O usuário definiu `idtech.assessoria@gmail.com` como proprietária do destino. A troca a partir de `lopesleticia297@gmail.com` está registrada em `config/owner-migration.json`. Confirme **o novo e-mail** no Supabase Auth e obtenha o UUID dessa conta real. Se usar o login do Elo para confirmar o e-mail, mantenha `ELO_OWNER_USER_ID` vazio no servidor: o link de acesso funciona, mas a assistência continua bloqueada e não é inicializada. Envio real de convite/link depende da autorização correspondente; não crie usuário fictício nem marque o e-mail como confirmado sem verificação.
4. Defina `ELO_OWNER_EMAIL=idtech.assessoria@gmail.com` e `ELO_OWNER_USER_ID` no ambiente da importação. Só configure o UUID no servidor da aplicação depois de importar, para impedir a inicialização automática antes da restauração. A conta do GitHub não substitui esse vínculo.
5. Antes do primeiro acesso ao aplicativo, use `npm run db:import -- /caminho/dados/estado-operacional.json`. O importador confere o hash original, o UUID/e-mail confirmado e todas as tabelas vazias, executa a inserção em transação e faz rollback por padrão. Acrescente `--apply` para confirmar a única assistência. A data e demais configurações são preservadas; o vínculo muda para a conta autorizada e o contato da assistência é atualizado quando corresponde ao e-mail da antiga proprietária. Um contato configurado separadamente permanece intacto. O arquivo de backup nunca é alterado. A conexão de importação precisa consultar e bloquear a linha de `auth.users`; use a conexão administrativa apenas nessa etapa. O importador recusa banco com dados, bloqueia importações concorrentes, não grava credenciais e não envia e-mails.

## Hospedagem e ativação

GitHub guarda o código; Supabase fornece Auth e banco. `render.yaml` prepara um servidor Node.js 24 no Render, plano `free`, para validação. A região proposta é Virginia; o Supabase continua em São Paulo. O serviço ainda não foi criado. O plano gratuito hiberna e tem limites de uso; não é uma configuração aprovada para operação de produção. Confira custos, cotas e acesso à conta antes de criar o serviço. O arquivo desabilita publicações automáticas e não define banco, disco ou agendador adicionais. Consulte [ATIVACAO.md](ATIVACAO.md) para os valores e a sequência de ativação.

Configure `APP_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `ELO_OWNER_EMAIL`, `ELO_OWNER_USER_ID` e `MESSAGING_ENCRYPTION_KEY` como variáveis do servidor. Gere uma chave de cifragem de 32 bytes para esta instalação e mantenha cópia segura. Trocar essa chave sem migração impede decifrar credenciais salvas.

Após o CI passar, valide no endereço final a definição da primeira senha, entrada por e-mail/senha, logout/revogação, proprietária, dois lojistas isolados e operações concorrentes em ambiente de teste. A primeira senha exige sessão autenticada ou código de recuperação nativo de uso único; nunca alterar hashes do schema Auth por SQL. O link mágico permanece opcional. Valide remetente, conteúdo, links e retorno do provedor com envio real somente quando autorizado. Não crie dados fictícios na base operacional. A migração de código não declara o sistema pronto para produção.

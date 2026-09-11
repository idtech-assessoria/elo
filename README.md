# Elo — Peças & Empréstimos

Migração do Elo para **Next.js independente, Supabase Auth/PostgreSQL e Resend**, preservando a integração Gmail existente. Repositório: [idtech-assessoria/elo](https://github.com/idtech-assessoria/elo), tornado público pelo titular em 11/09/2026. Branch: `migration/github-supabase-resend`.

O código original do GPT Sites está preservado na `main`, commit `82e20fe45385ec8f993aa18c9e8bf6b5f1258c55`. O aplicativo publicado no GPT Sites não é alterado por esta branch. EchoArena não faz parte deste repositório.

## Funcionalidades

- Estoque, cadastro de peças, entrada, contagem, quarentena e baixa com motivo.
- Lojistas, limite de exposição, bloqueio de retiradas e portal individual.
- Empréstimos com vários itens, preços históricos, devoluções parciais e vendas.
- Pagamentos parciais, estornos, comprovantes, exportação JSON e histórico.
- Aceite pelo lojista, divergências, pedidos de prazo, avisos de devolução e extrato.
- Avisos persistentes, fila Resend/Gmail e WhatsApp com revisão pelo usuário.

## Executar

Use Node.js 24, rode `npm ci` e copie `.env.example` para `.env.local`. Configure os valores reais em ambiente autorizado. `npm run dev` inicia o desenvolvimento; `npm run build` e `npm start` executam a versão de produção.

As rotas de banco usam Node.js. Não há dependência de D1, Cloudflare ou do runtime GPT Sites. O esquema e snapshot Drizzle usam PostgreSQL. `supabase/migrations/` contém o SQL implantável, incluindo permissões. As migrações SQLite antigas ficam apenas em `tests/fixtures/sqlite/` para regressão.

## Acesso e integridade

O login em `/login` envia link mágico pelo Supabase Auth com PKCE; abra-o no mesmo navegador. O servidor verifica a identidade com `getUser(token)` e chama `elo_private.session_active` para conferir vínculo, expiração e revogação. Essa função privada devolve somente um booleano; o login do servidor não precisa acessar diretamente o schema Auth. Metadados editáveis não concedem permissões. Redirecionamentos aceitam apenas caminhos internos, escritas conferem a origem `APP_URL` e respostas autenticadas não podem ser armazenadas em cache.

`ELO_OWNER_EMAIL` e `ELO_OWNER_USER_ID` definem explicitamente a proprietária. O e-mail de destino solicitado é `idtech.assessoria@gmail.com`; a troca autorizada está registrada em `config/owner-migration.json`. O identificador do Sites não é um UUID Supabase; a conta do GitHub também não determina a proprietária. Importe a assistência original antes do primeiro acesso, conforme [MIGRACAO.md](MIGRACAO.md). Para uma instalação nova, a inicialização exige ambos os valores e a identidade verificada correspondente.

O portal exige e-mail cadastrado e habilitado, vinculado ao UUID no primeiro acesso verificado. Desabilitar o portal ou trocar o e-mail remove o vínculo. Cada leitura/gravação confere novamente a autorização. As APIs retornam apenas os registros do próprio lojista.

As 14 tabelas têm RLS e bloqueiam acesso direto de `anon` e `authenticated`. O servidor usa conexão privada com o login `elo_app`, que herda somente o papel `elo_backend`. Pools são reutilizados, TLS verifica certificados e lotes usam uma única conexão e transação `REPEATABLE READ`. A revisão da assistência e o recibo idempotente protegem estoque, financeiro, histórico e fila contra disputas e repetições.

## Comunicação e limites

Resend exige domínio verificado e chave para consultar domínio, enviar e consultar entregas. A central cifra a credencial com AES-GCM e `MESSAGING_ENCRYPTION_KEY`, mantida fora do código. O SMTP do **login Supabase** é configurado separadamente do canal de **avisos operacionais**.

O Gmail preservado usa Google Apps Script/MailApp, validação assinada do remetente, timestamp/nonce e bloqueio contra reenvio. Requer configuração na conta Google e não lê a caixa de entrada. As credenciais Gmail/Resend não estavam no backup.

Avisos antigos aguardam revisão após conectar um canal. Novos avisos entram na fila quando o canal está ativo. Concessão temporária e chave idempotente protegem processadores simultâneos; resultados incertos exigem conferência. Aceitação/envio não significa leitura. Teste de envio real é uma ação explícita da administradora.

A fila avança nas operações e com o painel visível; vencimentos são verificados ao abrir o painel. Não há agendador com o painel fechado. WhatsApp abre o aplicativo para confirmação e não presume entrega. Fotos, lotes/séries, importação operacional em massa, equipe, descontos, relatórios avançados e backups automáticos permanecem fora desta etapa.

## Validação

| Comando | Escopo |
|---|---|
| `npm run audit:prod` | Auditoria das dependências de produção |
| `npm run lint` | ESLint, zero erros e avisos |
| `npm run typecheck` | TypeScript |
| `npm run test:domain` | Regras de negócio |
| `npm run test:auth` | Identidade, sessão, redirecionamentos, CSRF, TLS e limites de requisição |
| `npm run test:legacy` | Três suítes SQLite, Resend e Gmail simulados |
| `npm run test:postgres` | SQL/adaptador e importação com troca de proprietária, em PGlite local ou PostgreSQL real com `TEST_DATABASE_URL` |
| `npm run build` | Build Next.js de produção |
| `npm run test:http` | Rotas do build, PKCE/cookies/CSRF, Auth local simulado |

O Quality Gates exige PostgreSQL 17 real no GitHub Actions, incluindo conexões concorrentes, sem fallback PGlite no CI. A base de teste precisa estar vazia e se chamar `elo_test` em localhost. Nenhum teste usa o Supabase de produção ou envia e-mails reais. PGlite tem uma conexão e sozinho não comprova concorrência entre conexões. Build e testes simulados não substituem validação final de Auth, SMTP, banco e hospedagem reais.

Veja [MIGRACAO.md](MIGRACAO.md), [ATIVACAO.md](ATIVACAO.md) e [CHECKPOINT.md](CHECKPOINT.md) para a origem verificada e os requisitos de ativação. `render.yaml` contém a proposta de hospedagem para validação, ainda não aplicada.

# Elo — transferência para o GitHub

Checkpoint de 10/09/2026.

Este repositório recebe o código do **Elo — Peças & Empréstimos**, extraído de
`elo-backup-completo-2026-09-10.zip`. O backup identifica a versão 4 do GPT Sites.
O projeto publicado no Sites pertence a outra conta e não está acessível pela
conexão desta sessão; a fonte desta transferência é o ZIP fornecido pela usuária.

## Conteúdo preservado

- Os 133 arquivos de `projeto/` foram copiados para a raiz, com o mesmo conteúdo.
- Interface, estoque, empréstimos, financeiro, portal do lojista, integrações
  Gmail/Resend, migrações D1, testes e `package-lock.json` estão incluídos.
- `.env.example` está incluído explicitamente, embora o `.gitignore` original
  ignore arquivos `.env*`. Após a inclusão no Git, o arquivo permanece rastreado.
- `docs/ORIGEM-BACKUP.json` registra tamanho e SHA-256 de cada arquivo original.
- O ZIP original e os arquivos de dados permanecem preservados no backup.
  O banco operacional, as configurações de contas e credenciais não fazem parte
  do código transferido para este repositório.

O ZIP não contém histórico Git. O commit de origem informado no backup,
`c7467515cf48c073b529bcbe956ecfbb3bfdda68`, é uma referência documental; não foi
recriado como se seu histórico estivesse disponível.

## Destinos confirmados nesta sessão

- GitHub: <https://github.com/idtech-assessoria/elo>, privado, com permissão de
  leitura e escrita. Estava vazio antes desta transferência.
- Supabase: projeto **ELO**, `jrfmakgafcybhinjkalc`, São Paulo, PostgreSQL 17.6.
  Na consulta anterior desta sessão, não havia tabelas públicas, migrações ou
  usuários cadastrados. Nenhuma migração foi aplicada durante a transferência.

## Verificações executadas

- Todos os 138 arquivos do manifesto do backup conferidos por tamanho e SHA-256.
- Todas as 139 entradas de `SHA256SUMS.txt` conferidas, sem divergências.
- Banco SQLite do backup aberto somente para leitura: `integrity_check = ok`
  e nenhuma violação de chave estrangeira. São 14 tabelas, com uma assistência
  inicializada e as demais tabelas vazias.
- Teste existente `node --experimental-strip-types scripts/domain-check.mjs`
  aprovado em Node.js 24.19.0: estoque, limites, devolução parcial, quarentena,
  venda, valores históricos e conservação das quantidades.
- Inspeção dos arquivos de configuração e busca por padrões de credenciais no
  código, sem chaves privadas ou tokens encontrados. O backup declara excluir
  as credenciais de Gmail/Resend.

Build, lint, TypeScript e integrações de banco/e-mail não foram reexecutados
nesta transferência. Resultados narrados em uma conversa sobre outra base de
migração não são validação deste código.

## Estado da migração para fora do GPT Sites

O código está preservado no GitHub, mas esta cópia ainda depende de:

1. Identidade autenticada injetada pelo GPT Sites em `app/chatgpt-auth.ts`.
   Esses cabeçalhos só são confiáveis dentro do ambiente que os autentica e
   protege; não exponha esse backend em outro host aceitando cabeçalhos do
   visitante como identidade.
2. Cloudflare D1 e `cloudflare:workers` em `server/context.ts`, `db/index.ts`
   e na camada de persistência. As migrações em `drizzle/` são SQLite/D1,
   não PostgreSQL.
3. Vinext, Vite e Wrangler no fluxo de execução e construção.
4. Configuração externa de envio e da chave `MESSAGING_ENCRYPTION_KEY`.

GitHub Pages não executa este servidor nem substitui o banco e o login.
Nenhuma hospedagem nova foi contratada, nenhuma publicação do Sites foi
alterada, nenhum dado fictício foi inserido e nenhum e-mail real foi enviado.

A branch `migration/github-supabase-resend` é reservada à continuação da
migração; inicialmente compartilha esta base original. O arquivo
`elo-github-supabase-foundation.zip` não foi anexado nesta transferência.
As correções e os testes PostgreSQL narrados anteriormente não estão presentes
no backup original e não são tratados como recuperados.

Para concluir a saída do GPT Sites, é necessário portar runtime e autenticação,
adaptar as 14 tabelas para PostgreSQL, vincular explicitamente a proprietária ao
UUID do Supabase Auth e validar transações, concorrência, sessões e isolamento
do portal. A configuração de Resend/Gmail e a hospedagem do servidor também
permanecem pendentes; qualquer opção que gere custos deve ser explicada antes.

O identificador da proprietária no backup do Sites não equivale ao UUID de
Supabase Auth. Não substitua esse vínculo pelo e-mail da conta GitHub.

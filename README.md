# Elo — Peças & Empréstimos

Sistema de estoque e empréstimos a lojistas, construído no Sites. Esta etapa substitui o protótipo em memória por uma base permanente e operações validadas no servidor.

## Construído

- Estoque real inicialmente vazio; cadastro, edição, entrada, contagem física, quarentena, liberação após teste e baixa de avaria com motivo.
- Parceiros com responsáveis, contatos, limite de exposição, bloqueio de novas retiradas e habilitação individual do portal.
- Empréstimos com vários itens, saldo por item, prazo, condições e valores preservados na retirada.
- Devoluções parciais, conversão em venda, pagamentos parciais ou integrais e estorno do registro de pagamento.
- Comprovante para impressão, histórico com responsável e horário e exportação autenticada dos registros em JSON.
- Avisos permanentes para a assistência e o portal; verificação de vencimentos ao abrir o painel.
- Portal individual em `/portal`: empréstimos, extrato, avisos, aceite pelo próprio lojista, divergência, pedido de prazo e aviso de devolução. A assistência responde aos pedidos pelo detalhe do empréstimo.

## Acesso

O Site permanece com sua política de acesso existente. A autenticação usa a identidade fornecida pelo Sites; as permissões são verificadas no servidor em todas as operações. O primeiro acesso da proprietária prevista inicializa a assistência e vincula o identificador estável de sua conta. A edição dos dados de contato da assistência não troca a proprietária.

Para um lojista acessar, é necessário cadastrar seu e-mail correto, habilitar o portal no cadastro e autorizar esse mesmo e-mail no acesso do Site. A identidade do primeiro acesso autorizado é vinculada ao cadastro. Nenhum convite ou mensagem é enviado por esta versão durante a construção. A gestão não consegue confirmar o aceite pelo lojista. Somente os registros do próprio parceiro são retornados pela API do portal.

## Persistência e integridade

A declaração lógica `DB` usa D1. As migrações em `drizzle/` criam as tabelas; a aplicação não cria nem altera tabelas em tempo de execução. Alterações relacionadas são confirmadas em um único lote transacional, com revisão da assistência, trava de concorrência e recibo da operação para impedir duplicação em tentativas repetidas.

Os testes usam SQLite real em um arquivo temporário e verificam persistência após reabrir a conexão, rollback, disputa pela última unidade, idempotência, isolamento do portal, vínculo de identidade, devolução parcial, quarentena, venda, pagamento parcial, estorno, prorrogação e preservação dos valores históricos.

## Limites desta etapa

A integração transacional de e-mail com Resend está implementada. Para ativar, é necessário configurar um remetente de domínio verificado e uma chave com acesso para envio, verificação do domínio e consulta de entregas. A conta Resend conectada à conversa ainda não possuía domínios em 10/09/2026. Nenhum e-mail real foi disparado na construção. O WhatsApp possui mensagem editável, validação do telefone e link para confirmação no aplicativo; só a preparação é registrada, nunca uma entrega presumida. A fila avança nas operações e a cada 30 segundos com o painel visível. A verificação de vencimentos ocorre ao abrir o painel; nenhum agendador com o sistema fechado foi ativado. A autorização externa de cada lojista depende da liberação do e-mail no Site.

Fotos, lotes e números de série, importação em massa, equipe com permissões próprias, descontos, relatórios avançados, cópias automáticas e restauração ainda estão no escopo. O exportador fornece uma cópia dos registros; não é um mecanismo de restauração.

## Validação

- `node scripts/check-database.mjs`: testes de integração das operações com SQLite.
- `node --experimental-strip-types scripts/domain-check.mjs`: regras do domínio.
- Verificação de tipos TypeScript e construção pelo fluxo do Sites.

Nenhum dado fictício dos testes é inserido no banco do Site. A atualização do endereço publicado é uma etapa separada da gravação desta versão.


## Comunicação persistente

- Cada novo aviso e seu item de saída são gravados no mesmo lote transacional da operação. A fila captura o destinatário e o conteúdo daquele momento; editar o cadastro não redireciona mensagens já iniciadas.
- A central diferencia aviso interno, leitura no portal, fila, aceitação pelo provedor, entrega confirmada, falha, devolução, reclamação e resultado incerto. Entrega ao servidor de e-mail não significa leitura.
- Chave Resend cifrada com AES-GCM; chave de proteção `MESSAGING_ENCRYPTION_KEY` mantida como segredo do Site. Credenciais não são devolvidas pela API nem incluídas na exportação.
- Uma concessão de envio por mensagem protege contra processadores simultâneos. A identificação e o payload são preservados em repetições. Após 23 horas ou mudança da conexão, resultados incertos exigem conferência; o sistema não faz um novo envio automaticamente.
- Conectar ou reativar o e-mail não dispara os avisos gerados enquanto estava desconectado. A administradora revisa e envia esses avisos individualmente. Novos avisos são enfileirados se o canal estiver habilitado. Cancelamento permitido antes da primeira tentativa.
- O teste de envio é uma ação explícita, destinada somente ao e-mail autenticado da administradora. Os testes de código usam um transporte simulado e nunca enviam mensagens reais.
- APIs consultadas: [envio](https://resend.com/docs/api-reference/emails/send-email), [consulta de entrega](https://resend.com/docs/api-reference/emails/retrieve-email), [idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys).


## Gmail sem domínio

A conta escolhida é `idtech.assessoria@gmail.com`. A central oferece Gmail via Google Apps Script/MailApp, com configuração retomável e código personalizado obtido somente pela administradora autenticada. Nenhuma conexão Google é criada ou presumida por informar um endereço. O usuário precisa criar o projeto em sua conta, colar o código, implantar como ele próprio e autorizar o envio. A validação assinada confirma a identidade real da conta Google e a cota disponível antes de ativar a conexão.

O endpoint do Google é acessível para receber requisições do servidor; cada requisição usa HMAC-SHA256, timestamp e nonce. A resposta também é assinada e vinculada ao nonce. A URL precisa ser `https://script.google.com/macros/s/.../exec`; redirecionamentos de resposta são aceitos apenas para HTTPS em `script.googleusercontent.com` e nunca recebem novamente o corpo enviado. MailApp não lê a caixa de entrada.

O código usa ScriptLock e um registro antes da chamada de envio. Um resultado interrompido fica incerto e não dispara novamente. A perda da resposta após um envio concluído pode ser recuperada pelo mesmo identificador. Os registros no Google são retidos por sete dias, acima da janela de repetição de 23 horas do Elo. A cota é conferida antes do envio; ao esgotar, a fila aguarda. O estado `sent` confirma envio pelo Google, nunca entrega ou leitura. O teste continua sendo uma ação explícita e vai ao e-mail autenticado da administradora do Elo.

O código foi verificado com o JavaScript gerado executado em um ambiente que simula os serviços Google: assinatura, rejeição de conta incorreta e pedidos sem autorização, deduplicação, falha após envio, cota, configuração protegida e ida e volta pela fila do banco. Nenhum e-mail real foi enviado e a ativação na conta Google está pendente.

Referências: [Web Apps](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [cotas](https://developers.google.com/apps-script/guides/services/quotas), [identidade](https://developers.google.com/apps-script/reference/base/session), [locks](https://developers.google.com/apps-script/reference/lock/lock-service).

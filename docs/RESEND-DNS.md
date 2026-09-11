# Verificação do domínio de e-mail

Consulta somente de leitura realizada em 11/09/2026 no Resend conectado: `idtech.com.br`, região `sa-east-1`, status `failed`. Envio habilitado na configuração, recebimento desabilitado, rastreamento de abertura e cliques desabilitado. Os três registros abaixo também aparecem como `failed` no provedor.

Estes são registros DNS públicos solicitados pelo Resend. Não são senhas nem chaves privadas. Antes de alterar a zona, confirmar o provedor DNS da conta que controla esse domínio e conferir registros existentes para evitar sobrescrever outra configuração.

| Tipo | Nome relativo à zona idtech.com.br | Valor | TTL |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDaTaTOFXVVQ1SrOq1Vez7v537EDMq7rS6gal+1TiNUg0p6sI3TElruU1lnvBCNr3LGgnQz0quOJ/WTrMDWy+F7uoO/mDTAj10w5WGB0cVLIhH6snSNQSSltOcHwrrXNi9KLUinyT25trn8c/7nTD91LlwFPhyU2lr4E33nsAcIkQIDAQAB` | Auto |
| CNAME | `rsend` | `rsend-sae1.forge.rmta.net` | Auto |
| CNAME | `send` | `send.forge.rmta.net` | Auto |

Depois de publicar os registros na zona correta, solicitar a verificação no Resend e consultar o resultado. Não considerar a verificação concluída apenas por iniciar o pedido.

Nenhum DNS foi alterado por esta consulta, nenhum remetente novo foi escolhido e nenhum e-mail real foi enviado. SMTP no Supabase Auth e o canal operacional do Elo continuam sendo configurações separadas. A conta de acesso solicitada permanece `idtech.assessoria@gmail.com`.

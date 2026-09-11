# Certificados da conexão PostgreSQL

O Session pooler do ELO é `aws-0-sa-east-1.pooler.supabase.com:5432`, fornecido pelo titular a partir do painel do projeto. `DATABASE_POOLER_USER=elo_app.jrfmakgafcybhinjkalc` reutiliza a credencial já instalada em `DATABASE_URL`.

Em 11/09/2026, o Render retornou `SELF_SIGNED_CERT_IN_CHAIN` até receber `DATABASE_SSL_CA`. Essa variável contém a concatenação dos certificados públicos de produção 2021 e 2025 distribuídos no repositório oficial do CLI Supabase. Nenhuma chave privada faz parte desses arquivos. A configuração mantém `rejectUnauthorized: true`, incluindo verificação de hostname; não usar `sslmode=no-verify` ou `NODE_TLS_REJECT_UNAUTHORIZED=0`.

Fontes exatas, no commit `213eecc98a7b106262fbc29d754321e3cd540c4d`:

- [Certificado de produção 2021](https://github.com/supabase/cli/blob/213eecc98a7b106262fbc29d754321e3cd540c4d/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt)
- [Certificado de produção 2025](https://github.com/supabase/cli/blob/213eecc98a7b106262fbc29d754321e3cd540c4d/apps/cli-go/internal/gen/types/templates/prod-ca-2025.crt)

| Certificado | Validade até (UTC) | Fingerprint SHA-256 |
|---|---|---|
| 2021 | 26/04/2031 10:56:53 | `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA` |
| 2025 | 01/09/2035 08:01:25 | `5F9B77951A7AA1303F9B58EEA9BFA89E358CFDC15F9786FF10D4930A722C9AE2` |

Os arquivos foram lidos da fonte oficial e suas assinaturas e datas foram verificadas com OpenSSL. Após a instalação, a conexão do Render ultrapassou o erro TLS e recebeu uma resposta de permissão do PostgreSQL. O erro seguinte, `42501`, refere-se ao acesso ao schema Auth e é tratado pela migração da função privada de sessão.

Para uma nova hospedagem, instalar os certificados em `DATABASE_SSL_CA` e conservar as quebras de linha PEM. Na rotação futura, verificar novamente as fontes oficiais e os certificados vigentes. A [documentação de SSL do Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement) descreve a validação completa e o download pelo painel.

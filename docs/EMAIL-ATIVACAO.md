# Ativação de acesso e e-mails

O titular informou em 11/09/2026 que cadastrou `idtech.com.br` por engano. Após a confirmação explícita, o cadastro foi excluído do Resend; a listagem posterior retornou zero domínios. Esse domínio está descartado para o Elo. Não configurar seus registros DNS, usar remetentes desse domínio ou presumir que o titular o controla. As instruções anteriores de DNS foram retiradas.

O endereço do aplicativo já foi atribuído pelo Render: `https://elo-validacao.onrender.com`. Usar esse endereço não exige registrar um domínio próprio. O titular forneceu o Session pooler do Supabase; host e usuário públicos estão configurados no Render. A publicação dessa conexão ainda precisa ser verificada antes da ativação do acesso.

## Configuração de acesso preparada

Após a conexão do servidor, conferir os seguintes valores em **Supabase Auth > URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://elo-validacao.onrender.com` |
| Redirect URL permitida | `https://elo-validacao.onrender.com/auth/callback` |
| E-mail da proprietária | `idtech.assessoria@gmail.com` |

Esses valores são uma configuração preparada, ainda não aplicada por esta sessão. O conector Supabase disponível não administra configurações Auth/SMTP. Manter confirmação de e-mail ativa e usuários anônimos desabilitados. Não atribuir confirmação de e-mail por SQL ou substituir o UUID real por um identificador inventado.

## Validação inicial sem domínio de envio próprio

O SMTP padrão do Supabase permite testar o login com os e-mails que fazem parte da equipe do projeto. Conferir se `idtech.assessoria@gmail.com` é um desses membros e se o projeto usa o SMTP padrão antes de escolher esse caminho. O limite documentado em 11/09/2026 é de dois envios por hora; o serviço não é destinado à operação em produção e não libera acesso por e-mail para lojistas externos à equipe. [Documentação Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

Nenhum e-mail de validação foi solicitado nesta sessão. Quando o envio real estiver autorizado, a proprietária deve abrir o link no mesmo navegador. Depois de obter o UUID da conta confirmada, importar a assistência original e só então configurar `ELO_OWNER_USER_ID`, conforme `MIGRACAO.md`.

## Envios operacionais pelo Resend

Para enviar a lojistas pelo Resend, é necessário um domínio de envio que o titular controle e consiga verificar. O remetente de testes em `resend.dev` permite somente destinatário correspondente ao próprio e-mail da conta Resend e não atende à operação com lojistas. Não adicionar domínios de terceiros nem comprar domínio ou plano sem autorização de custo. [Limitação do Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

A configuração SMTP do Supabase Auth e a central de avisos do Elo são separadas. Ambas continuam pendentes; nenhuma API key de envio ou credencial SMTP foi criada neste trabalho. A base continua sem conexões Resend/Gmail e sem assistência importada.

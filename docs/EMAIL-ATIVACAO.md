# Ativação de acesso e e-mails

O titular informou em 11/09/2026 que cadastrou `idtech.com.br` por engano. Após a confirmação explícita, o cadastro foi excluído do Resend; a listagem posterior retornou zero domínios. Esse domínio está descartado para o Elo. Não configurar seus registros DNS, usar remetentes desse domínio ou presumir que o titular o controla. As instruções anteriores de DNS foram retiradas.

O Elo está publicado em `https://elo-validacao.onrender.com`. A proprietária recebeu e abriu o e-mail de confirmação; sua conta real foi confirmada pelo Supabase em 11/09/2026 às 03:11:15 UTC. A captura enviada mostra a página após o retorno do login. A assistência original foi restaurada e vinculada à conta confirmada, e o UUID foi configurado no Render depois da importação. O painel administrativo fica na raiz `/`; a leitura desse painel após a correção ainda precisa ser confirmada pelo titular.

## Referência da configuração de acesso

Para entrar novamente após sair, usar [Entrar no Elo](https://elo-validacao.onrender.com/login) com e-mail e senha. A verificação usa `signInWithPassword` do Supabase Auth e não solicita e-mail. Uma falha na saída retorna ao formulário com aviso, sem afirmar que o servidor confirmou o encerramento.

Se ainda houver uma sessão aberta, usar **Minha senha de acesso** para escolher a primeira senha. Se não houver sessão nem entrega de e-mail, a página [Definir minha senha](https://elo-validacao.onrender.com/password-setup) aceita um código de recuperação nativo emitido pelo administrador autorizado para a conta já confirmada. Depois de validá-lo, o titular escolhe a senha no Elo; nenhuma senha deve ser enviada pelo chat. O código não deve ser salvo neste documento, no GitHub, em logs ou na URL. A presença de `encrypted_password` no Auth não comprova uma senha conhecida: a inscrição inicial por link pode gerar uma senha temporária aleatória.

A alternativa opcional por link continua usando PKCE: abrir a mensagem mais recente no mesmo navegador em que foi solicitada. Reenvio é manual, com intervalo inicial de um minuto e sujeito ao SMTP do projeto. [Login por senha](https://supabase.com/docs/guides/auth/passwords) e [geração administrativa de códigos](https://supabase.com/docs/reference/javascript/auth-admin-generatelink).

Manter os seguintes valores em [Supabase Auth > URL Configuration](https://supabase.com/dashboard/project/jrfmakgafcybhinjkalc/auth/url-configuration):

| Campo | Valor |
|---|---|
| Site URL | `https://elo-validacao.onrender.com` |
| Redirect URL permitida | `https://elo-validacao.onrender.com/auth/callback` |
| E-mail da proprietária | `idtech.assessoria@gmail.com` |

O retorno do login ao Elo funcionou no fluxo utilizado pela proprietária. Os valores completos do painel não foram inspecionados pela integração, que não administra configurações Auth/SMTP. Manter confirmação de e-mail ativa e usuários anônimos desabilitados. A titularidade foi confirmada pelo fluxo real de e-mail, sem confirmação por SQL ou UUID inventado.

## Validação inicial sem domínio de envio próprio

O SMTP padrão do Supabase permite testar o login com os e-mails que fazem parte da equipe do projeto. Conferir se `idtech.assessoria@gmail.com` é um desses membros e se o projeto usa o SMTP padrão antes de escolher esse caminho. O limite documentado em 11/09/2026 é de dois envios por hora; o serviço não é destinado à operação em produção e não libera acesso por e-mail para lojistas externos à equipe. [Documentação Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

A proprietária solicitou o link por conta própria e informou que o recebeu e confirmou. O assistente não solicitou outro envio. A conta foi conferida no Supabase, a assistência original foi importada e `ELO_OWNER_USER_ID` foi instalado após a restauração. Essas etapas estão concluídas; não repetir a importação ou gerar nova identidade.

## Envios operacionais pelo Resend

Para enviar a lojistas pelo Resend, é necessário um domínio de envio que o titular controle e consiga verificar. O remetente de testes em `resend.dev` permite somente destinatário correspondente ao próprio e-mail da conta Resend e não atende à operação com lojistas. Não adicionar domínios de terceiros nem comprar domínio ou plano sem autorização de custo. [Limitação do Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

A configuração SMTP do Supabase Auth e a central de avisos do Elo são separadas. O recebimento do link pela proprietária funcionou, mas isso não valida o envio para lojistas. Nenhuma API key de envio ou credencial SMTP foi criada pelo assistente. A assistência está restaurada, mas os canais Resend/Gmail e os testes de avisos reais permanecem pendentes.

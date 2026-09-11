# Primeira senha da proprietária

A conta existente de `idtech.assessoria@gmail.com` está confirmada no Supabase Auth. O login por senha e a página protegida `/account/password` já foram implementados. Ter um hash em `auth.users` não significa que a titular conheça uma senha: a conta foi criada pelo fluxo de link mágico.

Se a titular ainda tem uma sessão válida aberta no Elo, pode usar **Minha senha de acesso** e escolher a senha diretamente. O servidor permite alterar apenas a conta dessa sessão, após verificar confirmação e revogação. O assistente não precisa receber a senha.

## Operação autorizada para acesso sem sessão nem e-mail

O modelo [maintenance/owner-activation.ts.template](maintenance/owner-activation.ts.template) foi preparado e validado com dependências simuladas. Após autorização específica, foi usado somente na operação temporária descrita abaixo e substituído por uma resposta inerte. Não é importado pela aplicação nem executado pelo CI.

1. Criar somente a função temporária `elo-owner-activation-20260911`, no projeto ELO, com verificação JWT habilitada e uma capacidade administrativa aleatória de 32 bytes, cujo hash SHA-256 fica na função. A capacidade é transmitida em cabeçalho, nunca em URL, e a operação expira em dez minutos.
2. A função usa a chave administrativa já disponibilizada internamente pelo Supabase Edge Runtime. Essa chave nunca sai do Supabase, não é instalada no Render nem retornada ao cliente. O código aceita apenas a conta previamente confirmada, com UUID e e-mail fixos; não aceita um destinatário, UUID, senha ou URL fornecidos na requisição.
3. Gerar um único código nativo por `auth.admin.generateLink(type: recovery)`, sem enviar e-mail ou alterar a senha. Entregar o código apenas à titular, que o informa em `/password-setup` e escolhe sua senha na página seguinte. Código e capacidade administrativa não devem ser salvos no GitHub, documentos, URLs ou logs.
4. Imediatamente substituir a função por uma resposta fixa HTTP 410, mantendo a verificação JWT. A integração atual não oferece exclusão de Edge Functions. Conferir a desativação por GET, que não pode gerar outro código. O bloqueio de uso em memória não substitui essa desativação entre instâncias; o código Auth de recuperação é de uso único e possui sua própria expiração.

## Autorização e conclusão

Em 11/09/2026, a revisão automática inicialmente rejeitou a implantação dessa função: o uso de privilégios `service_role` para emitir um código real de recuperação amplia a superfície de autenticação e exigia autorização específica. A listagem imediatamente posterior confirmou zero Edge Functions. Nenhum código foi gerado nessa tentativa e não houve caminho alternativo para contornar a rejeição.

A titular respondeu **Sim** à pergunta explícita sobre criar a função temporária, gerar um único código para `idtech.assessoria@gmail.com` e desativá-la imediatamente. A implantação autorizada foi aceita. A primeira janela de dez minutos expirou sem emissão; foi encerrada antes da renovação da mesma operação. Requisições sem a capacidade administrativa foram recusadas com HTTP 403.

Às **04:58:30 UTC**, a versão 3 confirmou a identidade existente e gerou um único código nativo de recuperação, com resposta HTTP 200, sem enviar e-mail, alterar senha, criar conta ou modificar dados operacionais. Às **04:58:39 UTC**, a versão 4 substituiu todo o código por uma resposta fixa HTTP 410, sem cliente administrativo ou leitura de chave. A verificação JWT permanece habilitada. O GET externo e a leitura do código implantado confirmaram a desativação; o endpoint existe, mas a capacidade de emitir códigos foi removida.

A capacidade aleatória e os arquivos temporários de credenciais foram removidos. O código é entregue apenas à titular e não está neste documento, no GitHub ou na URL. A página `/password-setup` foi conferida no navegador, sem consumir o código nem submeter credenciais. A senha definitiva será escolhida pela titular no Elo, sem envio ao chat. A operação administrativa autorizada está concluída; não reativar a função ou reemitir código automaticamente.

Fontes: [senha no Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [gerar link/código administrativo](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) e [verificar OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp).

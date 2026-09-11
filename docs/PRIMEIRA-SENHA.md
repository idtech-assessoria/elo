# Primeira senha da proprietária

A conta existente de `idtech.assessoria@gmail.com` está confirmada no Supabase Auth. O login por senha e a página protegida `/account/password` já foram implementados. Ter um hash em `auth.users` não significa que a titular conheça uma senha: a conta foi criada pelo fluxo de link mágico.

Se a titular ainda tem uma sessão válida aberta no Elo, pode usar **Minha senha de acesso** e escolher a senha diretamente. O servidor permite alterar apenas a conta dessa sessão, após verificar confirmação e revogação. O assistente não precisa receber a senha.

## Operação proposta para acesso sem sessão nem e-mail

O modelo [maintenance/owner-activation.ts.template](maintenance/owner-activation.ts.template) foi preparado e validado com dependências simuladas. É material para revisão; não é importado pela aplicação, não é executado pelo CI e não foi implantado.

1. Criar somente a função temporária `elo-owner-activation-20260911`, no projeto ELO, com verificação JWT habilitada e uma capacidade administrativa aleatória de 32 bytes, cujo hash SHA-256 fica na função. A capacidade é transmitida em cabeçalho, nunca em URL, e a operação expira em dez minutos.
2. A função usa a chave administrativa já disponibilizada internamente pelo Supabase Edge Runtime. Essa chave nunca sai do Supabase, não é instalada no Render nem retornada ao cliente. O código aceita apenas a conta previamente confirmada, com UUID e e-mail fixos; não aceita um destinatário, UUID, senha ou URL fornecidos na requisição.
3. Gerar um único código nativo por `auth.admin.generateLink(type: recovery)`, sem enviar e-mail ou alterar a senha. Entregar o código apenas à titular, que o informa em `/password-setup` e escolhe sua senha na página seguinte. Código e capacidade administrativa não devem ser salvos no GitHub, documentos, URLs ou logs.
4. Imediatamente substituir a função por uma resposta fixa HTTP 410, mantendo a verificação JWT. A integração atual não oferece exclusão de Edge Functions. Conferir a desativação por GET, que não pode gerar outro código. O bloqueio de uso em memória não substitui essa desativação entre instâncias; o código Auth de recuperação é de uso único e possui sua própria expiração.

## Bloqueio atual

Em 11/09/2026, a revisão automática rejeitou a implantação dessa função: o uso de privilégios `service_role` para emitir um código real de recuperação amplia a superfície de autenticação e exige autorização específica. A listagem posterior confirmou **zero Edge Functions** no ELO. Nenhum código foi gerado, nenhum e-mail enviado e nenhuma senha real alterada pelo assistente. O material temporário da capacidade não utilizada foi removido.

Não repetir a implantação, procurar uma rota indireta ou alterar hashes do Auth por SQL para contornar a rejeição. A autorização pendente é para a operação restrita descrita acima: criar a função temporária, emitir um código para essa conta e desativar a função imediatamente. A senha definitiva será escolhida pela titular no Elo, sem envio ao chat.

Fontes: [senha no Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [gerar link/código administrativo](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) e [verificar OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp).

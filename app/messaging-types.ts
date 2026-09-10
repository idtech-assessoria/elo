export type EmailStatus='awaiting_connection'|'missing_recipient'|'queued'|'sending'|'accepted'|'sent'|'delivered'|'bounced'|'complained'|'failed'|'uncertain'|'cancelled';
export type EmailProvider='resend'|'gmail';
export type EmailDelivery={provider?:EmailProvider|null;id:string;noticeId:string|null;loanId:string;audience:string;recipient:string;recipientName:string;phone:string;status:EmailStatus;attempts:number;providerId:string|null;error:string|null;createdAt:string;updatedAt:string;checkedAt:string|null;whatsappAt:string|null};
export type EmailConnection={provider?:EmailProvider;endpoint?:string;quotaRemaining?:number|null;configured:boolean;enabled:boolean;sender:string;revision:number;verifiedAt:string|null;encryptionReady:boolean};
export type MessagingSnapshot={gmailSetup?:{sender:string;prepared:boolean};connection:EmailConnection;deliveries:EmailDelivery[]};
export const emailStatus:Record<EmailStatus,{label:string;tone:string;help:string}>={
 awaiting_connection:{label:'Aguardando conexão',tone:'amber',help:'Conecte o e-mail e revise este aviso para enviá-lo. Avisos antigos não são disparados ao conectar.'},
 missing_recipient:{label:'E-mail ausente',tone:'amber',help:'Cadastre o e-mail do destinatário e atualize o contato deste aviso antes de enviar.'},
 queued:{label:'Na fila',tone:'blue',help:'Aguardando processamento. A fila avança nas operações e enquanto o painel está aberto.'},
 sending:{label:'Enviando',tone:'blue',help:'Solicitação em andamento. O mesmo aviso não será enviado em paralelo.'},
 accepted:{label:'Aceito pelo serviço',tone:'blue',help:'O serviço de e-mail aceitou a mensagem. A entrega ao servidor do destinatário ainda será consultada.'},
 sent:{label:'Enviado pelo Gmail',tone:'green',help:'O Google concluiu o envio da mensagem. Esta conexão não confirma a entrega na caixa de entrada nem a leitura.'},
 delivered:{label:'Entrega confirmada',tone:'green',help:'O serviço confirmou a entrega ao servidor de e-mail. Isso não confirma leitura pelo destinatário.'},
 bounced:{label:'Devolvido pelo e-mail',tone:'red',help:'O servidor do destinatário recusou a mensagem. Confira o endereço antes de criar outro aviso.'},
 complained:{label:'Marcado como spam',tone:'red',help:'O destinatário sinalizou esta mensagem. Novos e-mails para esse endereço foram bloqueados.'},
 failed:{label:'Falha no envio',tone:'red',help:'Veja o motivo e corrija a conexão. Uma nova tentativa usa a mesma identificação para evitar duplicidade.'},
 uncertain:{label:'Precisa de conferência',tone:'amber',help:'O resultado não pôde ser confirmado dentro do prazo seguro de repetição. Confira com o destinatário ou no serviço de envio antes de criar outro aviso.'},
 cancelled:{label:'Envio cancelado',tone:'neutral',help:'Esta mensagem permanece no histórico e não será enviada.'}
};
export function whatsappPhone(value:string){const digits=value.replace(/\D/g,'');if(digits.length===10||digits.length===11)return '55'+digits;return /^\d{12,15}$/.test(digits)?digits:''}

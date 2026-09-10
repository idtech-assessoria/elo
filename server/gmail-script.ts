// Rendered only by an authenticated owner request. Never cache the personalized result.
export function gmailScript(sender:string,secret:string){
 return `/** Elo — conexão de e-mail da assistência. Cole no seu próprio projeto Google Apps Script. */
const ELO_REMETENTE = ${JSON.stringify(sender)};
const ELO_SEGREDO = ${JSON.stringify(secret)};

function doGet() {
  return ContentService.createTextOutput('Conexão Elo. As operações exigem uma assinatura válida.');
}
function eloHex(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function eloHmac(value) { return eloHex(Utilities.computeHmacSha256Signature(value, ELO_SEGREDO, Utilities.Charset.UTF_8)); }
function eloDigest(value) { return eloHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)); }
function eloEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== 64 || b.length !== 64) return false;
  var difference = 0; for (var i = 0; i < 64; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function eloReply(nonce, data) {
  var payload = JSON.stringify(data);
  return ContentService.createTextOutput(JSON.stringify({payload:payload,signature:eloHmac(nonce + '\\n' + payload)})).setMimeType(ContentService.MimeType.JSON);
}
function eloClean(properties) {
  var now = Date.now();
  if (now - Number(properties.getProperty('ELO_CLEANED') || 0) < 86400000) return;
  var all = properties.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf('ELO_MESSAGE_') === 0) {
      try { if (JSON.parse(all[key]).at < now - 7 * 86400000) properties.deleteProperty(key); } catch (_) {}
    }
  });
  properties.setProperty('ELO_CLEANED', String(now));
}
function doPost(event) {
  var envelope;
  try { if (!event || !event.postData || event.postData.contents.length > 220000) throw Error(); envelope = JSON.parse(event.postData.contents); } catch (_) {
    return ContentService.createTextOutput('Solicitação inválida.');
  }
  var stamp = envelope.timestamp, nonce = envelope.nonce;
  if (!Number.isSafeInteger(stamp) || Math.abs(Date.now() - stamp) > 300000 || typeof nonce !== 'string' || !/^[a-f0-9]{32}$/.test(nonce) || typeof envelope.payload !== 'string' || !eloEqual(eloHmac(stamp + '\\n' + nonce + '\\n' + envelope.payload), envelope.signature)) {
    return ContentService.createTextOutput('Solicitação não autorizada.');
  }
  var input;
  try { input = JSON.parse(envelope.payload); } catch (_) { return eloReply(nonce, {ok:false,code:'invalid'}); }
  try {
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== ELO_REMETENTE || input.sender !== ELO_REMETENTE) return eloReply(nonce, {ok:false,code:'wrong_account'});
    if (input.action === 'health') return eloReply(nonce, {ok:true,protocol:'elo-gmail-1',sender:ELO_REMETENTE,quotaRemaining:MailApp.getRemainingDailyQuota()});
    if (input.action !== 'send' || typeof input.id !== 'string' || !/^[A-Za-z0-9_/-]{1,120}$/.test(input.id)) return eloReply(nonce, {ok:false,code:'invalid'});
    var mail = input.email;
    if (!mail || mail.from !== ELO_REMETENTE || !Array.isArray(mail.to) || mail.to.length !== 1 || typeof mail.to[0] !== 'string' || mail.to[0].length > 150 || !/^[^\\s@<>,;]+@[^\\s@<>,;]+\\.[^\\s@<>,;]+$/.test(mail.to[0]) || typeof mail.subject !== 'string' || !mail.subject || mail.subject.length > 250 || /[\\r\\n]/.test(mail.subject) || typeof mail.text !== 'string' || mail.text.length > 70000 || typeof mail.html !== 'string' || mail.html.length > 100000) return eloReply(nonce, {ok:false,code:'invalid'});
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return eloReply(nonce, {ok:false,code:'busy'});
    try {
      var properties = PropertiesService.getScriptProperties();
      var key = 'ELO_MESSAGE_' + eloDigest(input.id), hash = eloDigest(JSON.stringify(mail));
      var previous = properties.getProperty(key);
      if (previous) {
        var record = JSON.parse(previous);
        if (record.hash !== hash) return eloReply(nonce, {ok:false,code:'conflict'});
        return eloReply(nonce, record.status === 'sent' ? {ok:true,status:'sent',id:input.id,quotaRemaining:MailApp.getRemainingDailyQuota()} : {ok:false,code:'uncertain'});
      }
      if (MailApp.getRemainingDailyQuota() < 1) return eloReply(nonce, {ok:false,code:'quota',quotaRemaining:0});
      eloClean(properties);
      // The checkpoint is written BEFORE calling MailApp. Interrupted calls are never blindly repeated.
      properties.setProperty(key, JSON.stringify({hash:hash,status:'sending',at:Date.now()}));
      try {
        MailApp.sendEmail({to:mail.to[0],subject:mail.subject,body:mail.text,htmlBody:mail.html,name:'Elo · Peças e Empréstimos',replyTo:ELO_REMETENTE});
        properties.setProperty(key, JSON.stringify({hash:hash,status:'sent',at:Date.now()}));
      } catch (_) { return eloReply(nonce, {ok:false,code:'uncertain'}); }
      return eloReply(nonce, {ok:true,status:'sent',id:input.id,quotaRemaining:MailApp.getRemainingDailyQuota()});
    } finally { lock.releaseLock(); }
  } catch (_) { return eloReply(nonce, {ok:false,code:'unavailable'}); }
}
`;
}

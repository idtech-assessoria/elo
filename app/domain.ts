export type Piece = { id:string; name:string; sku:string; category:string; compatible:string; quality:string; location:string; available:number; quarantine:number; minimum:number; cost:number; value:number };
export type Merchant = { id:string; name:string; contact:string; email:string; phone:string; city:string; limit:number; active:boolean; color:string; portalEnabled?:boolean };
export type LoanItem = { productId:string; name:string; sku:string; quality:string; compatible?:string; quantity:number; returned:number; sold:number; unitValue:number };
export type Event = { id:string; title:string; description:string; at:string; actorId?:string; actorName?:string };
export type Loan = { id:string; merchantId:string; created:string; due:string; acknowledged:boolean; items:LoanItem[]; notes:string; events:Event[]; acknowledgedBy?:string; acknowledgedAt?:string; dispute?:string; requests?:ExtensionRequest[] };
export type Notice = { id:string; loanId:string; merchantId:string; audience:'Você'|'Lojista'; title:string; body:string; at:string; read:boolean; portalRead?:boolean; delivery?:'internal'|'awaiting_connection'; eventKey?:string };
export type Receivable = { id:string; loanId:string; merchantId:string; amount:number; paid:boolean; paidAmount?:number; description:string; created:string };
export type State = { pieces:Piece[]; merchants:Merchant[]; loans:Loan[]; notices:Notice[]; receivables:Receivable[]; movements:Event[]; payments?:Payment[]; settings?:Settings };
export type ExtensionRequest={id:string;date:string;reason:string;status:'pending'|'approved'|'declined';at:string};
export type Payment={id:string;receivableId:string;amount:number;reference:string;at:string;actorName:string;reversalOf?:string};
export type Settings={name:string;contact:string;phone:string;email:string;city:string;before:boolean;due:boolean;late:boolean;hour:string};
export const defaultSettings:Settings={name:'Minha assistência',contact:'',phone:'',email:'',city:'',before:true,due:true,late:true,hour:'09:00'};
export const emptyState=():State=>({pieces:[],merchants:[],loans:[],notices:[],receivables:[],movements:[],payments:[],settings:{...defaultSettings}});
export const balance=(r:Receivable)=>r.amount-(r.paidAmount??(r.paid?r.amount:0));
export const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+'T12:00:00Z').getTime())&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export const money = (v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v/100);
export const dateLabel = (v:string)=>new Date(v.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
export const today = ()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const dayOffset = (n:number)=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const stamp = ()=>new Date().toISOString();
export const uid = (p:string)=>p+'-'+crypto.randomUUID();
export const remaining = (i:LoanItem)=>i.quantity-i.returned-i.sold;
export const loanCount = (l:Loan)=>l.items.reduce((a,i)=>a+remaining(i),0);
export const loanValue = (l:Loan)=>l.items.reduce((a,i)=>a+remaining(i)*i.unitValue,0);
export const loanStatus = (l:Loan)=>!loanCount(l)?'Concluído':l.due<today()?'Atrasado':!l.acknowledged?'Aguardando aceite':l.items.some(i=>i.returned+i.sold>0)?'Devolução parcial':'Em andamento';
export const merchantExposure=(s:State,id:string)=>s.loans.filter(l=>l.merchantId===id).reduce((a,l)=>a+loanValue(l),0)+s.receivables.filter(r=>r.merchantId===id&&!r.paid).reduce((a,r)=>a+balance(r),0);
export function makeNoticePair(s:State,l:Loan,title:string,extra:string):Notice[]{
 const m=s.merchants.find(m=>m.id===l.merchantId)!;
 const body=`${title} · ${l.id}\nAssistência: ${s.settings?.name||'Minha assistência'}\nContato da assistência: ${s.settings?.email||'Não informado'} | ${s.settings?.phone||'Não informado'}\nLojista: ${m.name}\nResponsável: ${m.contact}\nContato do lojista: ${m.email||'Não informado'} | ${m.phone||'Não informado'}\nRetirada: ${l.created.split('-').reverse().join('/')} · Devolução: ${l.due.split('-').reverse().join('/')}\n\n${l.items.map(i=>`${i.quantity} × ${i.name} | ${i.sku} | ${i.quality}${i.compatible?' | Compatível: '+i.compatible:''}\nValor por unidade: ${money(i.unitValue)} · Devolvidas: ${i.returned} · Vendidas: ${i.sold} · Pendentes: ${remaining(i)}`).join('\n\n')}\n\nValor das peças pendentes: ${money(loanValue(l))}\n${extra}\nObservações: ${l.notes||'Nenhuma.'}\nConsulte o comprovante e o histórico no portal do lojista.`;
 return (['Você','Lojista'] as const).map(a=>({id:uid('aviso'),loanId:l.id,merchantId:l.merchantId,audience:a,title,body,at:stamp(),read:false,portalRead:false,delivery:a==='Você'?'internal':'awaiting_connection'}));
}
export function seedState():State{
 const pieces:Piece[]=[
 {id:'p1',name:'Tela iPhone 13',sku:'TEL-013-OLED',category:'Telas',compatible:'iPhone 13',quality:'OLED premium · nova',location:'Gaveta A-01',available:12,quarantine:0,minimum:5,cost:18000,value:29000},
 {id:'p2',name:'Bateria iPhone 11',sku:'BAT-011-JC',category:'Baterias',compatible:'iPhone 11',quality:'J-CID · nova',location:'Gaveta B-02',available:18,quarantine:0,minimum:8,cost:6500,value:12000},
 {id:'p3',name:'Tampa iPhone 14 · lilás',sku:'TAM-014-LIL',category:'Tampas',compatible:'iPhone 14',quality:'Lilás · nova',location:'Gaveta C-03',available:3,quarantine:0,minimum:5,cost:4500,value:8500},
 {id:'p4',name:'Tag Face ID 15 / 15 Plus',sku:'TAG-015-JC',category:'Face ID',compatible:'iPhone 15, iPhone 15 Plus',quality:'J-CID · nova',location:'Gaveta D-01',available:8,quarantine:0,minimum:3,cost:5500,value:9500},
 {id:'p5',name:'Flex auricular 12 / 12 Pro',sku:'FLX-012-JC',category:'Flex',compatible:'iPhone 12, iPhone 12 Pro',quality:'J-CID · novo',location:'Gaveta D-02',available:2,quarantine:1,minimum:4,cost:4500,value:9000},
 {id:'p6',name:'Câmera traseira iPhone 13',sku:'CAM-013-OR',category:'Câmeras',compatible:'iPhone 13',quality:'Original retirada · testada',location:'Gaveta E-01',available:5,quarantine:0,minimum:2,cost:18000,value:28000},
 {id:'p7',name:'Tela Samsung A54',sku:'TEL-A54-AM',category:'Telas',compatible:'Samsung Galaxy A54',quality:'AMOLED · nova',location:'Gaveta A-04',available:4,quarantine:0,minimum:3,cost:22000,value:36000},
 {id:'p8',name:'Conector de carga iPhone 12',sku:'CON-012-OR',category:'Conectores',compatible:'iPhone 12',quality:'Original · novo',location:'Gaveta F-01',available:14,quarantine:0,minimum:5,cost:3500,value:7000}
 ];
 const merchants:Merchant[]=[
 {id:'m1',name:'Central do iPhone',contact:'Rafael Costa',email:'rafael@central.example',phone:'Não informado',city:'Betim · MG',limit:300000,active:true,color:'mint'},
 {id:'m2',name:'TechCell Assistência',contact:'Marina Alves',email:'marina@techcell.example',phone:'Não informado',city:'Contagem · MG',limit:200000,active:true,color:'purple'},
 {id:'m3',name:'Conecta Mobile',contact:'Bruno Lima',email:'bruno@conecta.example',phone:'Não informado',city:'Betim · MG',limit:250000,active:true,color:'blue'},
 {id:'m4',name:'Ponto Smart',contact:'Ana Souza',email:'ana@pontosmart.example',phone:'Não informado',city:'Belo Horizonte · MG',limit:150000,active:true,color:'peach'}
 ];
 const item=(p:number,q:number,r=0):LoanItem=>({productId:pieces[p].id,name:pieces[p].name,sku:pieces[p].sku,quality:pieces[p].quality,quantity:q,returned:r,sold:0,unitValue:pieces[p].value});
 const loan=(id:string,m:string,d:number,c:number,items:LoanItem[],ack=true):Loan=>({id,merchantId:m,due:dayOffset(d),created:dayOffset(c),acknowledged:ack,items,notes:'Peças testadas na retirada. Conferir o estado na devolução.',events:[{id:'e-'+id,title:'Empréstimo registrado',description:'Saída conferida pela assistência. Registro de exemplo.',at:dayOffset(c)+'T13:30:00Z'},...(ack?[{id:'a-'+id,title:'Recebimento confirmado',description:'Aceite do lojista neste exemplo de operação.',at:dayOffset(c)+'T14:00:00Z'}]:[])]});
 const loans=[loan('EMP-0248','m1',-2,-5,[item(0,2),item(1,2)]),loan('EMP-0247','m2',0,-3,[item(6,1),item(4,2,1)]),loan('EMP-0246','m3',1,-2,[item(3,3)],false),loan('EMP-0245','m4',3,-1,[item(5,1),item(7,2)]),loan('EMP-0244','m1',5,-1,[item(2,2)]),loan('EMP-0243','m2',-1,-7,[item(0,1,1)])];
 const s:State={pieces,merchants,loans,notices:[],receivables:[],movements:[{id:'mov1',title:'Devolução conferida',description:'TechCell · 1 flex auricular retornou ao estoque',at:dayOffset(0)+'T12:20:00Z'},{id:'mov2',title:'Entrada de peças',description:'8 baterias iPhone 11 · Gaveta B-02',at:dayOffset(0)+'T11:45:00Z'},{id:'mov3',title:'Empréstimo registrado',description:'Central do iPhone · 2 tampas iPhone 14',at:dayOffset(-1)+'T16:00:00Z'}]};
 s.notices=[...makeNoticePair(s,loans[0],'Prazo de devolução vencido','Solicite uma previsão de devolução.'),...makeNoticePair(s,loans[1],'Devolução prevista para hoje','Confira as peças pendentes com o lojista.')];return s;
}
export function createLoan(s:State,merchantId:string,due:string,quantities:Record<string,number>,notes:string):{state:State;loan:Loan}{
 const m=s.merchants.find(x=>x.id===merchantId); if(!m||!m.active)throw Error('Selecione um lojista ativo.');
 if(!validDate(due)||due<today())throw Error('Informe um prazo a partir de hoje.');
 const entries=Object.entries(quantities).filter(([,q])=>q!==0);if(!entries.length)throw Error('Selecione pelo menos uma peça.');
 const items=entries.map(([id,q])=>{const p=s.pieces.find(p=>p.id===id);if(!p||!Number.isInteger(q)||q<1||q>p.available)throw Error('Quantidade inválida ou estoque insuficiente.');return {productId:p.id,name:p.name,sku:p.sku,quality:p.quality,compatible:p.compatible,quantity:q,returned:0,sold:0,unitValue:p.value}});
 const total=items.reduce((a,i)=>a+i.quantity*i.unitValue,0);if(merchantExposure(s,m.id)+total>m.limit)throw Error('O empréstimo ultrapassa o limite disponível do lojista.');
 const l:Loan={id:'EMP-'+String(Math.max(0,...s.loans.map(l=>Number(l.id.split('-')[1])||0))+1).padStart(4,'0'),merchantId,due,created:today(),items,notes:notes.trim(),acknowledged:false,events:[{id:uid('evento'),title:'Empréstimo registrado',description:'Saída do estoque confirmada por você. Aguardando aceite do lojista.',at:stamp()}]};
 const next={...s,pieces:s.pieces.map(p=>({...p,available:p.available-(quantities[p.id]||0)})),loans:[l,...s.loans],notices:[...makeNoticePair(s,l,'Novo empréstimo registrado','Recebimento aguardando confirmação.'),...s.notices],movements:[{id:uid('mov'),title:'Empréstimo registrado',description:`${m.name} · ${loanCount(l)} peças · ${money(total)}`,at:stamp()},...s.movements]};return {state:next,loan:l};
}
export function settleItem(s:State,loanId:string,productId:string,quantity:number,action:'return'|'quarantine'|'sale'):State{
 const l=s.loans.find(l=>l.id===loanId);const i=l?.items.find(i=>i.productId===productId);if(!l||!i||!Number.isInteger(quantity)||quantity<1||quantity>remaining(i))throw Error('Informe uma quantidade entre 1 e o saldo pendente.');
 const isSale=action==='sale';const title=isSale?'Peça convertida em venda':action==='quarantine'?'Devolução em quarentena':'Devolução conferida';
 const nextLoan={...l,items:l.items.map(x=>x.productId===productId?{...x,returned:x.returned+(isSale?0:quantity),sold:x.sold+(isSale?quantity:0)}:x),events:[...l.events,{id:uid('evento'),title,description:`${quantity} × ${i.name}. ${isSale?'Valor a receber criado; pagamento ainda pendente.':action==='quarantine'?'Separada para avaliação; não disponível para novo empréstimo.':'Disponível novamente no estoque.'}`,at:stamp()}]};
 const next={...s,loans:s.loans.map(x=>x.id===loanId?nextLoan:x),pieces:s.pieces.map(p=>p.id===productId?{...p,available:p.available+(action==='return'?quantity:0),quarantine:p.quarantine+(action==='quarantine'?quantity:0)}:p),receivables:isSale?[{id:uid('receber'),loanId,merchantId:l.merchantId,amount:i.unitValue*quantity,paid:false,paidAmount:0,description:`${quantity} × ${i.name}`,created:stamp()},...s.receivables]:s.receivables,notices:[...makeNoticePair(s,nextLoan,title,`${quantity} × ${i.name}. ${isSale?'Pagamento pendente: '+money(i.unitValue*quantity):'Devolução registrada.'}`),...s.notices],movements:[{id:uid('mov'),title,description:`${quantity} × ${i.name} · ${l.id}`,at:stamp()},...s.movements]};return next;
}

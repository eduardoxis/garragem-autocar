export const conditions=['Não inspecionado','Sem avarias aparentes','Arranhado','Amassado','Trincado ou quebrado','Desgastado','Peça ausente','Outro','Não aplicável'];
export const parts=['Para-choque dianteiro','Para-choque traseiro','Capô','Teto','Porta dianteira esquerda','Porta dianteira direita','Porta traseira esquerda','Porta traseira direita','Para-lama dianteiro esquerdo','Para-lama dianteiro direito','Para-lama traseiro esquerdo','Para-lama traseiro direito','Porta-malas','Retrovisores','Faróis','Lanternas','Para-brisa','Vidros laterais e traseiro','Rodas','Pneus','Placas','Pintura e lataria','Bancos','Painel','Volante','Console central','Forro do teto','Forração das portas','Tapetes','Porta-malas interno','Cintos de segurança','Comandos elétricos','Multimídia ou rádio','Ar-condicionado','Acabamentos internos'];
export const accessories=['Antena','GPS','Tapetes','Carregador celular','Rádio','Manual','Documentos','Estepe','Pertences','Luz de Advertência','Macaco','Chave de roda','Triângulo'];
export const declaration='Declaro que tive acesso ao checklist de entrada do veículo identificado neste documento e estou ciente das condições e observações nele registradas.';
export const disclaimer='Esta ciência não autoriza reparos, não aprova orçamentos e não confirma serviços adicionais.';
// Coordinates refer to the original 970 x 350 inspection crop; IDs stay stable in saved records.
export const inspectionPoints=[
 ['top-front',193,41,'Capô'],['top-windshield',35,71,'Para-brisa'],['top-left-door',35,149,'Porta dianteira esquerda'],['top-right-door',194,149,'Porta dianteira direita'],['top-left-rear',35,204,'Porta traseira esquerda'],['top-right-rear',195,204,'Porta traseira direita'],['top-boot',194,279,'Porta-malas'],
 ['front-left-mirror',269,50,'Retrovisores'],['front-right-mirror',487,45,'Retrovisores'],['front-left-light',269,92,'Faróis'],['front-right-light',487,92,'Faróis'],['front-left-bumper',269,138,'Para-choque dianteiro'],
 ['rear-left-light',269,222,'Lanternas'],['rear-right-glass',487,201,'Vidros laterais e traseiro'],['rear-left-bumper',269,266,'Para-choque traseiro'],['rear-right-light',487,245,'Lanternas'],['rear-right-bumper',487,297,'Para-choque traseiro'],
 ['right-boot',583,37,'Porta-malas'],['right-roof',800,19,'Teto'],['right-mirror',854,44,'Retrovisores'],['right-bonnet',922,50,'Capô'],['right-rear-bumper',543,117,'Para-choque traseiro'],['right-rear-wheel',578,165,'Rodas'],['right-rear-door',680,165,'Porta traseira direita'],['right-front-door',750,159,'Porta dianteira direita'],['right-front-bumper',923,157,'Para-choque dianteiro'],
 ['left-bonnet',570,227,'Capô'],['left-roof',799,180,'Teto'],['left-rear-glass',855,190,'Vidros laterais e traseiro'],['left-boot',918,212,'Porta-malas'],['left-front-wheel',572,324,'Rodas'],['left-front-door',680,330,'Porta dianteira esquerda'],['left-rear-door',753,329,'Porta traseira esquerda'],['left-rear-bumper',918,320,'Para-choque traseiro']
].map(([id,x,y,part])=>({id,x:x/970*100,y:y/350*100,part}));
export const damageLegend='● Os pontos marcados em preto indicam locais com avarias identificadas durante a inspeção do veículo.';
export const fuelLevels=[['0','0 — Vazio'],['0.25','1/4 — Um quarto'],['0.5','1/2 — Meio tanque'],['0.75','3/4 — Três quartos'],['1','1 — Tanque cheio']];
export function checklistDescription(data){
 if(typeof data.description==='string')return data.description;
 return (data.inspection||[]).filter(r=>r.description||!['Não inspecionado','Sem avarias aparentes','Não aplicável'].includes(r.condition)).map(r=>r.part+': '+[r.condition==='Não inspecionado'?'':r.condition,r.description].filter(Boolean).join(' — ')).join('\n');
}
export function markedPoints(data){return Array.isArray(data.damagedPoints)?data.damagedPoints:[];}
export function cleanChecklist(data){
 const result={};for(const k of ['customerId','customerName','document','phone','address','vehicleId','brand','model','manufactureYear','modelYear','plate','color','entryDate','responsibleId','responsible','reason','services','notes','belongings','accessoriesNotes','warningLights','quoteId','serviceOrderId'])result[k]=String(data[k]??'').trim().slice(0,k==='notes'||k==='services'?4000:500);
 if(!result.customerName||!result.plate||!result.brand||!result.model||!result.entryDate||Number.isNaN(Date.parse(result.entryDate)))throw new Error('Preencha cliente, veículo, placa e entrada.');
 for(const k of ['mileage','keys']){const n=Number(data[k]);if(!Number.isFinite(n)||n<0)throw new Error('Quilometragem/chaves inválidas.');result[k]=n;}
 if(!['0','0.25','0.5','0.75','1'].includes(String(data.fuelLevel)))throw new Error('Combustível inválido.');result.fuelLevel=String(data.fuelLevel);
 result.inspection=parts.map(part=>{const row=data.inspection?.find(r=>r.part===part);if(row&&!conditions.includes(row.condition))throw new Error('Condição inválida.');return {part,condition:row?.condition||conditions[0],description:String(row?.description||'').slice(0,2000)};});
 result.accessories=Object.fromEntries(accessories.map(k=>{let v=data.accessories?.[k]||'';if(['Não verificado','Não aplicável'].includes(v))v='';if(!['Sim','Não',''].includes(v))throw new Error('Acessório inválido');return [k,v];}));
 const description=checklistDescription(data);if(description.length>100000)throw new Error('A descrição deve ter até 100.000 caracteres.');result.description=description;
 if(data.damagedPoints!==undefined&&(!Array.isArray(data.damagedPoints)||data.damagedPoints.some(id=>!inspectionPoints.some(p=>p.id===id))))throw new Error('Ponto de inspeção inválido.');
 result.damagedPoints=[...new Set(markedPoints(data))];
 if(data.media && (!Array.isArray(data.media)||data.media.length>60))throw new Error('Limite de 60 arquivos por checklist.');
 result.media=Array.isArray(data.media)?data.media.slice(0,60).map(m=>({id:String(m.id),part:String(m.part||'Geral').slice(0,120),caption:String(m.caption||'').slice(0,500)})):[];
 return result;
}
export function canRespond(record,link){if(record.status!=='Finalizado'||link.revoked||link.version!==record.version||link.expiresAt<=Date.now())throw new Error('Link indisponível, expirado ou versão já confirmada.');}

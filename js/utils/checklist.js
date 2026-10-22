export const conditions=['Não inspecionado','Sem avarias aparentes','Arranhado','Amassado','Trincado ou quebrado','Desgastado','Peça ausente','Outro','Não aplicável'];
export const parts=['Para-choque dianteiro','Para-choque traseiro','Capô','Teto','Porta dianteira esquerda','Porta dianteira direita','Porta traseira esquerda','Porta traseira direita','Para-lama dianteiro esquerdo','Para-lama dianteiro direito','Para-lama traseiro esquerdo','Para-lama traseiro direito','Porta-malas','Retrovisores','Faróis','Lanternas','Para-brisa','Vidros laterais e traseiro','Rodas','Pneus','Placas','Pintura e lataria','Bancos','Painel','Volante','Console central','Forro do teto','Forração das portas','Tapetes','Porta-malas interno','Cintos de segurança','Comandos elétricos','Multimídia ou rádio','Ar-condicionado','Acabamentos internos'];
export const accessories=['Antena','GPS','Tapetes','Carregador celular','Rádio','Manual','Documentos','Estepe','Pertences','Luz de Advertência','Macaco','Chave de roda','Triângulo'];
export const declaration='Declaro que tive acesso ao checklist de entrada do veículo identificado neste documento e estou ciente das condições e observações nele registradas.';
export const disclaimer='Esta ciência não autoriza reparos, não aprova orçamentos e não confirma serviços adicionais.';
export function cleanChecklist(data){
 const result={};for(const k of ['customerId','customerName','document','phone','address','vehicleId','brand','model','manufactureYear','modelYear','plate','color','entryDate','responsibleId','responsible','reason','services','notes','belongings','accessoriesNotes','warningLights','quoteId','serviceOrderId'])result[k]=String(data[k]??'').trim().slice(0,k==='notes'||k==='services'?4000:500);
 if(!result.customerName||!result.plate||!result.brand||!result.model||!result.entryDate||Number.isNaN(Date.parse(result.entryDate)))throw new Error('Preencha cliente, veículo, placa e entrada.');
 for(const k of ['mileage','keys']){const n=Number(data[k]);if(!Number.isFinite(n)||n<0)throw new Error('Quilometragem/chaves inválidas.');result[k]=n;}
 if(!['0','0.25','0.5','0.75','1'].includes(String(data.fuelLevel)))throw new Error('Combustível inválido.');result.fuelLevel=String(data.fuelLevel);
 result.inspection=parts.map(part=>{const row=data.inspection?.find(r=>r.part===part);if(row&&!conditions.includes(row.condition))throw new Error('Condição inválida.');return {part,condition:row?.condition||conditions[0],description:String(row?.description||'').slice(0,2000)};});
 result.accessories=Object.fromEntries(accessories.map(k=>{const v=data.accessories?.[k]||'Não verificado';if(!['Sim','Não','Não verificado','Não aplicável'].includes(v))throw new Error('Acessório inválido');return [k,v];}));
 if(data.media && (!Array.isArray(data.media)||data.media.length>60))throw new Error('Limite de 60 arquivos por checklist.');
 result.media=Array.isArray(data.media)?data.media.slice(0,60).map(m=>({id:String(m.id),part:String(m.part||'Geral').slice(0,120),caption:String(m.caption||'').slice(0,500)})):[];
 return result;
}
export function canRespond(record,link){if(record.status!=='Finalizado'||link.revoked||link.version!==record.version||link.expiresAt<=Date.now())throw new Error('Link indisponível, expirado ou versão já confirmada.');}

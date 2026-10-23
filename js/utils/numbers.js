// Presentation and form parsing only. Stored numbers and calculations remain numeric.
export function parseNumberInput(value){
 if(typeof value==='number')return Number.isFinite(value)?value:NaN;
 const raw=String(value??'').trim().replace(/\s|R\$/g,'');if(!raw)return NaN;
 const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'): /^-?\d{1,3}(\.\d{3})+$/.test(raw)?raw.replace(/\./g,''):raw;
 return /^-?\d+(\.\d+)?$/.test(normalized)?Number(normalized):NaN;
}
export function formatNumber(value,{decimals=null,empty='—'}={}){
 if(value===null||value===undefined||value==='')return empty;
 const n=typeof value==='number'?value:Number(value);if(!Number.isFinite(n))return empty;
 return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:decimals??0,maximumFractionDigits:decimals??6}).format(n);
}
export const moneyKeys=new Set(['amount','total','unitprice','costprice','saleprice','price','discount','addition']);
const integerKeys=new Set(['mileage','nextmaintenancemileage','keys','durationminutes','warrantydays','deliverydays','intervalmonths']);
const decimalKeys=new Set(['quantity','minimumstock','minstock','stock','hours']);
export function numberKind(key){const name=String(key||'').toLowerCase();return moneyKeys.has(name)?'currency':integerKeys.has(name)?'integer':decimalKeys.has(name)?'decimal':'';}
export function formatFieldNumber(key,value){
 const kind=numberKind(key);if(kind)return formatNumber(value,{decimals:kind==='currency'?2:kind==='integer'?0:null});
 if(/year|id$/i.test(key)||new Set(['version','code','sku','document','cpf','cnpj','phone','whatsapp','renavam','chassis','zipcode','cep','plate','box']).has(String(key).toLowerCase()))return value??'—';
 return typeof value==='number'?formatNumber(value):value??'—';
}

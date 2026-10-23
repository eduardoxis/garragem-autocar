import test from 'node:test';import assert from 'node:assert/strict';import {mediaFilename,mediaCaption} from '../js/modules/checklist/media-name.js';
test('fotos usam a parte selecionada; nomes antigos e extensões reais são preservados corretamente',()=>{
 const photo={part:'Porta dianteira direita',caption:'179278184974290159461039200501.jpg'};
 assert.equal(mediaFilename(photo,'image/png'),'Porta dianteira direita.png');assert.equal(mediaCaption(photo,'image/jpeg'),'Porta dianteira direita.jpg');assert.equal(mediaCaption({...photo,caption:'Arranhão próximo da maçaneta'},'image/jpeg'),'Arranhão próximo da maçaneta');assert.equal(mediaFilename({part:'Painel',caption:'Geral.jpg'},'image/jpeg'),'Painel.jpg');assert.equal(mediaFilename({part:'Pneus'},'video/mp4'),'Pneus.mp4');assert.equal(mediaCaption({part:'Assinatura',caption:'Carlos Eduardo'}),'Carlos Eduardo');assert.equal(mediaFilename({part:'../Painel: ?'},'image/png'),'.. Painel.png');
});

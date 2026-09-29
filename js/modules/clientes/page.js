import { createCrudPage } from '../crud-page.js';
import { maskCpfCnpj, maskPhone, digits } from '../../utils/masks.js';

createCrudPage({
  title: 'Clientes', active: 'clientes', collection: 'customers', singular: 'cliente', titleKey: 'name', newLabel: 'Novo cliente',
  icon:'users',listTitle:'Lista de Clientes',listSubtitle:'Visualize, edite e gerencie todos os seus clientes cadastrados.',
  subtitle: 'Gerencie os cadastros e o relacionamento com seus clientes.', searchPlaceholder: 'Pesquisar por nome, telefone, e-mail ou CPF...', searchKeys: ['name','document','phone','whatsapp','plate','email'],
  metrics:records=>{const now=new Date();const recent=records.filter(item=>{const date=item.createdAt?.toDate?item.createdAt.toDate():new Date(item.createdAt||0);return date.getMonth()===now.getMonth()&&date.getFullYear()===now.getFullYear();}).length;return[{icon:'users',label:'Total de clientes',value:records.length,tone:'orange'},{icon:'car',label:'Clientes com veículos',value:records.filter(item=>item.vehicle||item.vehicleId).length,tone:'green'},{icon:'clock',label:'Atendimentos no mês',value:records.filter(item=>item.lastServiceAt).length,tone:'orange'},{icon:'plus',label:'Novos clientes',value:recent,tone:'blue'}];},
  columns: [{ key:'name',label:'Cliente' },{ key:'whatsapp',label:'WhatsApp' },{ key:'vehicle',label:'Veículo' },{ key:'status',label:'Status',render:value=>`<span class="badge badge-success">${value || 'Ativo'}</span>` }],
  fields: [
    { key:'name',label:'Nome completo',required:true },{ key:'document',label:'CPF/CNPJ' },{ key:'phone',label:'Telefone' },{ key:'whatsapp',label:'WhatsApp' },
    { key:'email',label:'E-mail',type:'email' },{ key:'birthDate',label:'Data de nascimento',type:'date' },{ key:'zipCode',label:'CEP' },{ key:'address',label:'Endereço',full:true },
    { key:'city',label:'Cidade' },{ key:'state',label:'Estado' },{ key:'origin',label:'Origem' },{ key:'tags',label:'Tags' },
    { key:'notes',label:'Observações',type:'textarea',full:true },{ key:'status',label:'Status',type:'select',options:['Ativo','Inativo'] }
  ],
  normalize: data => ({ ...data, name: data.name.trim(), nameSearch: data.name.trim().toLocaleLowerCase('pt-BR'), document: digits(data.document), phone: digits(data.phone), whatsapp: digits(data.whatsapp), documentDisplay: maskCpfCnpj(data.document), phoneDisplay: maskPhone(data.phone) })
});

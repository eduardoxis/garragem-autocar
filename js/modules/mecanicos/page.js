import { createCrudPage } from '../crud-page.js';
import { digits } from '../../utils/masks.js';

await createCrudPage({
 title:'Mecânicos',active:'mecanicos',collection:'mechanics',singular:'mecânico',titleKey:'name',newLabel:'Novo mecânico',adminOnly:true,adminBack:true,icon:'wrench',
 subtitle:'Cadastre os mecânicos que podem ser responsáveis pelos checklists da oficina.',
 listTitle:'Mecânicos cadastrados',searchPlaceholder:'Pesquisar por nome, telefone ou especialidade...',searchKeys:['name','phone','specialty','status'],
 columns:[{key:'name',label:'Nome'},{key:'phone',label:'Telefone'},{key:'specialty',label:'Especialidade'},{key:'userId',label:'Usuário do sistema (perfil Mecânico)',reference:{collection:'users',label:user=>(user.name||user.email||'Usuário')+' · '+(user.role||'')},full:true},{key:'status',label:'Status'}],
 fields:[{key:'name',label:'Nome do mecânico',required:true},{key:'phone',label:'Telefone'},{key:'specialty',label:'Especialidade'},{key:'status',label:'Status',type:'select',options:['Ativo','Inativo']},{key:'notes',label:'Observações',type:'textarea',full:true}],
 normalize:data=>({...data,name:data.name.trim(),phone:digits(data.phone)})
});

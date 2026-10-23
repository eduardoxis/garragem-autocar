import {createModal} from './modal.js';
import {createToast} from './toast.js';
import {api} from '../services/api.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openVehicleCustomerLink({customers,vehicles,customerId='',vehicleId='',onLinked}){
 const form=document.createElement('form');form.className='form-grid';form.dataset.vehicleCustomer='true';
 form.innerHTML='<label class="field">Cliente<select name="customerId" class="select" required><option value="">Selecione o cliente</option>'+customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name||c.email)+'</option>').join('')+'</select></label><label class="field">Veículo cadastrado<select name="vehicleId" class="select" required><option value="">Selecione o veículo</option>'+vehicles.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.plate+' · '+[v.brand,v.model].filter(Boolean).join(' ')+(v.ownerName?' — '+v.ownerName:''))+'</option>').join('')+'</select></label><p class="full">O veículo passará a aparecer na lista deste cliente. Se houver um vínculo anterior, ele será substituído.</p>';
 form.elements.customerId.value=customerId;form.elements.vehicleId.value=vehicleId;
 return createModal({title:'Vincular veículo ao cliente',content:form,confirmText:'Salvar vínculo',onConfirm:async()=>{
  if(!form.reportValidity())return false;const previous=vehicles.find(v=>v.id===form.elements.vehicleId.value);
  try{const record=await api('checklists',{action:'link-vehicle',data:{vehicleId:previous.id,customerId:form.elements.customerId.value,expectedCustomerId:previous.customerId||''}});Object.assign(previous,record);await onLinked?.(record);createToast('Veículo vinculado ao cliente.');return true;}catch(error){createToast(error.message,'error');return false;}
 }});
}

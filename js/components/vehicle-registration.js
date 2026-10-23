import {createModal} from './modal.js';
import {createToast} from './toast.js';
import {maskPlate,applyInputMasks,formDataObject} from '../utils/masks.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Reuse the references already loaded by the parent screen; no extra list query.
export function openVehicleRegistration({companyId,vehicles,values={},onSaved}){
 const form=document.createElement('form');form.className='form-grid';form.dataset.vehicleRegistration='true';
 const field=(name,label,extra='')=>'<label class="field">'+label+'<input class="input" name="'+name+'" value="'+esc(values[name])+'" '+extra+'></label>';
 form.innerHTML='<p class="full">O veículo ficará disponível em Veículos e poderá ser selecionado nos próximos atendimentos.</p>'+field('ownerName','Nome do proprietário','required maxlength="120"')+field('brand','Marca','required maxlength="40"')+field('model','Modelo / nome do veículo','required maxlength="40"')+field('plate','Placa','required maxlength="9"')+field('color','Cor','maxlength="40"')+field('mileage','Quilometragem','type="number" min="0" step="1"')+field('manufactureYear','Ano de fabricação','type="number" min="1900" max="2100" step="1"')+field('modelYear','Ano modelo','type="number" min="1900" max="2100" step="1"');
 applyInputMasks(form);
 form.elements.plate.addEventListener('input',()=>form.elements.plate.setCustomValidity(''));
 return createModal({title:'Cadastrar veículo',content:form,confirmText:'Cadastrar e selecionar',onConfirm:async()=>{
  if(!form.reportValidity())return false;
  const data=formDataObject(form);data.plate=maskPlate(data.plate);
  if(!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(data.plate)){form.elements.plate.setCustomValidity('Informe uma placa válida, como ABC1234 ou ABC1D23.');form.elements.plate.reportValidity();return false;}
  if(vehicles.some(v=>maskPlate(v.plate)===data.plate)){createToast('Esta placa já está cadastrada. Selecione o veículo existente.','error');return false;}
  for(const key of ['ownerName','brand','model','color'])data[key]=data[key].trim();
  if(!data.ownerName||!data.brand||!data.model){createToast('Preencha proprietário, marca e modelo.','error');return false;}
  data.mileage=Number(data.mileage)||0;for(const key of ['manufactureYear','modelYear'])data[key]=data[key]?Number(data[key]):null;
  data.customerId=values.customerId||'';data.status='Cadastrado';
  try{const {saveRecord}=await import('../firebase/firestore.js');const id=await saveRecord('vehicles',companyId,data);const record={...data,id};vehicles.push(record);onSaved(record);createToast('Veículo cadastrado e selecionado.');return true;}catch(error){createToast(error.message,'error');return false;}
 }});
}

import { auth } from '../firebase/firebase-config.js';
export async function api(path, data, { binary = false } = {}) {
 const token = await auth.currentUser?.getIdToken();
 const response = await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 if(binary&&response.ok)return response.blob();
 const result = await response.json().catch(()=>{throw Object.assign(new Error('Não foi possível acessar a API. Confira a configuração do servidor.'),{status:response.status});});
 if(!response.ok)throw Object.assign(new Error(result.error||'Não foi possível concluir.'),{status:response.status});
 return result;
}

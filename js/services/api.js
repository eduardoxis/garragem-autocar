import { auth } from '../firebase/firebase-config.js';
export async function api(path, data) {
 const token = await auth.currentUser?.getIdToken();
 const response = await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});
 const result = await response.json().catch(()=>{throw new Error('Não foi possível acessar a API. Confira a configuração do servidor.');}); if(!response.ok) throw new Error(result.error || 'Não foi possível concluir.'); return result;
}

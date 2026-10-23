import {invalidateQueries} from './query-cache.js';
import { auth } from '../firebase/firebase-config.js';
export async function api(path, data, { binary = false } = {}) {
 const reads=['list','get','read','count','references','history','preview','start','acquire-edit','renew-edit','release-edit'];
 const tags=reads.includes(data?.action)?null:({checklists:data?.action==='link-vehicle'?['checklists','vehicles']:['checklists'],'checklist-media':['checklists'],mechanics:['mechanics','users'],quotes:['quotes','reminders','quoteFollowUps'],settings:['companies'],queue:['queueEntries'],'queue-tv':['queueTvSessions']})[path];
 if(tags)invalidateQueries(tags);
 const token = await auth.currentUser?.getIdToken();
 const response = await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 if(binary&&response.ok)return response.blob();
 const result = await response.json().catch(()=>{throw Object.assign(new Error('Não foi possível acessar a API. Confira a configuração do servidor.'),{status:response.status});});
 if(!response.ok)throw Object.assign(new Error(result.error||'Não foi possível concluir.'),{status:response.status});
 if(tags)invalidateQueries(tags);
 return result;
}

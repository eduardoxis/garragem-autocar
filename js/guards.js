import {invalidateQueries} from './services/query-cache.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase/firebase-config.js';
import { getProfile } from './firebase/firestore.js';

const allowedPagesByRole = {
  user: new Set(['clientes', 'orcamentos', 'perfil']),
  atendente: new Set(['checklist', 'clientes', 'veiculos', 'orcamentos', 'agenda', 'perfil']),
  mecanico: new Set(['fila','gerencia-oficina','checklist', 'oficina', 'ordens-servico', 'perfil']),
  financeiro: new Set(['financeiro', 'perfil'])
};

let authReady,latestUser;
function currentSession(){
 if(!authReady)authReady=new Promise(resolve=>{
  let initialized=false;
  onAuthStateChanged(auth,user=>{
   const changed=initialized&&latestUser?.uid!==user?.uid;latestUser=user;
   if(changed){invalidateQueries();window.currentUser=null;location.replace(user?'/index.html':'/login.html');}
   initialized=true;resolve();
  });
 });
 return authReady.then(()=>latestUser);
}
export async function requireAuth({role=null,roles=null,module=document.body.dataset.module}={}){
 if(!isFirebaseConfigured){document.documentElement.dataset.setupRequired='true';return null;}
 const user=await currentSession();
 const redirect=url=>{location.replace(url);return new Promise(()=>{});};
 if(!user)return redirect(`/login.html?return=${encodeURIComponent(`${location.pathname}${location.hash}`)}`);
 const profile=await getProfile(user.uid);
 if(latestUser?.uid!==user.uid)return new Promise(()=>{});
 if(!profile||profile.active!==true){await auth.signOut();return redirect('/login.html?inactive=1');}
 const allowedPages=allowedPagesByRole[profile.role],denied=(role&&profile.role!==role)||(roles&&!roles.includes(profile.role))||(allowedPages&&module&&!allowedPages.has(module));
 if(denied)return redirect(allowedPages?`/index.html#${[...allowedPages][0]||'perfil'}`:'/login.html?denied=1');
 window.currentUser={...profile,uid:user.uid};document.dispatchEvent(new CustomEvent('auth:ready',{detail:window.currentUser}));return window.currentUser;
}

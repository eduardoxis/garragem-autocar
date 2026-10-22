// SSE over authenticated fetch: no staff token is put in a URL or sent to the TV.
export function subscribeQueue({tv=false,view,day,onMessage,onConnection,signal}){
 const pause=ms=>new Promise(resolve=>{const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,ms);signal?.addEventListener('abort',finish,{once:true});});
 const run=async()=>{let delay=1000;while(!signal?.aborted){try{
  const headers={};if(!tv){const {auth}=await import('../firebase/firebase-config.js');const token=await auth.currentUser?.getIdToken();if(!token)throw new Error('Entre novamente no sistema.');headers.Authorization='Bearer '+token;headers['Content-Type']='application/json';}
  const response=await fetch('/api/queue-stream'+(tv&&view==='workshop'?'?view=workshop':''),{method:tv?'GET':'POST',headers,credentials:'same-origin',...(tv?{}:{body:JSON.stringify(view?{view,day}:{})}),signal});
  if(!response.ok){const data=await response.json().catch(()=>({}));if([401,403].includes(response.status)){onMessage({type:'unauthorized',message:data.error||'Acesso indisponível.'});return;}throw new Error(data.error||'Conexão indisponível');}
  onConnection?.(true);delay=1000;const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
  while(!signal?.aborted){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let boundary;while((boundary=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,boundary);pending=pending.slice(boundary+2);for(const line of block.split('\n'))if(line.startsWith('data: ')){const message=JSON.parse(line.slice(6));onMessage(message);if(message.type==='unauthorized'){await reader.cancel();return;}}}}
 }catch(error){if(signal?.aborted)return;onConnection?.(false,error.message);}if(signal?.aborted)return;onConnection?.(false);await pause(delay);delay=Math.min(15000,delay*2);}};
 void run();
}

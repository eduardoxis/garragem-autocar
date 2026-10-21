export function signaturePad(canvas){
 const ctx=canvas.getContext('2d');let drawing=false,points=0;canvas.width=1000;canvas.height=340;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
 const pos=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];};
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...pos(e));});
 canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();ctx.lineTo(...pos(e));ctx.stroke();points++;});
 const stop=()=>{drawing=false;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
 return {clear(){ctx.clearRect(0,0,canvas.width,canvas.height);points=0;},async file(){if(points<8)throw new Error('Desenhe sua assinatura antes de confirmar.');return new Promise(resolve=>canvas.toBlob(b=>resolve(new File([b],'assinatura.png',{type:'image/png'})),'image/png'));}};
}

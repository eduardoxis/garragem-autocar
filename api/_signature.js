import { inflateSync } from 'node:zlib';
// Canvas emits RGBA PNG. Inspect actual pixels, not a browser-provided flag.
export function validateSignature(buffer){
 if(buffer.length<40||buffer.toString('ascii',12,16)!=='IHDR')throw new Error('Assinatura PNG inválida');
 const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20),depth=buffer[24],type=buffer[25];
 if(width<50||height<30||width>1200||height>500||depth!==8||![2,6].includes(type)||buffer[28]!==0)throw new Error('Dimensões/formato da assinatura inválidos');
 const chunks=[];let offset=8;while(offset+12<=buffer.length){const length=buffer.readUInt32BE(offset);if(length>buffer.length-offset-12)throw new Error('PNG incompleto');if(buffer.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(buffer.subarray(offset+8,offset+8+length));offset+=12+length;}
 const bpp=type===6?4:3,stride=width*bpp,raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*height});if(raw.length!==(stride+1)*height)throw new Error('PNG incompleto');
 let prev=Buffer.alloc(stride),ink=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)],row=Buffer.from(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));if(filter>4)throw new Error('Filtro PNG inválido');for(let x=0;x<stride;x++){const a=x>=bpp?row[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;row[x]=(row[x]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}for(let x=0;x<stride;x+=bpp)if((type!==6||row[x+3]>60)&&row[x]+row[x+1]+row[x+2]<600)ink++;prev=row;}
 if(ink<40)throw new Error('Desenhe sua assinatura antes de confirmar.');return true;
}

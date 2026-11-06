import { createHash, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
export const hashToken=(s)=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export const sessionCookie=(value,clear=false)=>`ss_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${clear?0:2592000}`;
export function cookieToken(header=''){const m=header.match(/(?:^|;\s*)ss_session=([A-Za-z0-9_-]{43})(?:;|$)/);return m?.[1] || null;}
export function verifyStripeSignature(raw,header,secret,now=Date.now()){
  if(!header||!secret)return false;
  const fields=header.split(',').map(p=>p.split('='));const t=fields.find(([k])=>k==='t')?.[1];
  if(!/^\d+$/.test(t||'')||Math.abs(now/1000-Number(t))>300)return false;
  const expected=createHmac('sha256',secret).update(t+'.').update(raw).digest();
  return fields.some(([key,value])=>{if(key!=='v1'||!/^[a-f0-9]{64}$/.test(value||''))return false;return timingSafeEqual(expected,Buffer.from(value,'hex'));});
}
export async function readBody(req,limit=180000){
  if(req.body!==undefined){const raw=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));if(raw.length>limit)throw Object.assign(new Error('Request is too large.'),{status:413});return raw;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Request is too large.'),{status:413});chunks.push(chunk);}return Buffer.concat(chunks);
}
export function validOrigin(origin,appUrl){try{return !!origin && new URL(origin).origin===new URL(appUrl).origin;}catch{return false;}}

import {jobStore,jobPayload,startJob,publicJob,validJobId,JOB_TTL} from './lib/jobs.mjs';
import {InputError} from './lib/contract.mjs';
import {reply} from './lib/transport.mjs';
const respond=(status,data)=>{const r=reply(status,data);return new Response(r.body,{status,headers:{...r.headers,'X-App-Version':'1.9.0'}});};
export function createJobsHandler(deps={}){return async request=>{
 if(request.method!=='POST')return respond(405,{error:'Gunakan metode POST.'});
 if(!request.headers.get('content-type')?.includes('application/json'))return respond(415,{error:'Format permintaan harus JSON.'});
 let body;
 try{const raw=await request.text();if(Buffer.byteLength(raw)>4500000)return respond(413,{error:'Data terlalu besar.'});body=JSON.parse(raw);}catch{return respond(400,{error:'Data JSON tidak valid.'});}
 if(!validJobId(body?.id)||!['start','status'].includes(body?.action))return respond(400,{error:'Kode proses tidak valid.'});
 const now=(deps.now||Date.now)();
 if(Number(body.id.slice(0,13))>now+600000||now-Number(body.id.slice(0,13))>JOB_TTL)return respond(410,{error:'Kode proses kedaluwarsa. Mulai pemeriksaan kembali. [JOB_EXPIRED]'});
 let payload;
 if(body.action==='start'){
  try{payload=jobPayload(body.kind,body.payload);}catch(e){return respond(400,{error:e instanceof InputError?e.message:'Data analisis tidak lengkap.'});}
  if(!process.env.GEMINI_API_KEY)return respond(503,{error:'Layanan belum diaktifkan. Periksa GEMINI_API_KEY pada Functions. [CONFIG_MISSING]'});
 }
 let store;
 try{store=deps.store||await jobStore();}catch{return respond(503,{error:'Penyimpanan proses belum tersedia. Pengelola perlu memeriksa Netlify Blobs dan deploy seluruh paket. [JOB_STORAGE]'});}
 try{
  if(body.action==='status'){
   const job=await store.get(body.id,{type:'json'});
   if(!job)return respond(404,{error:'Proses belum terdaftar. Coba kembali. [JOB_NOT_FOUND]'});
   if(now-job.createdAt>JOB_TTL){await store.delete(body.id);return respond(410,{error:'Hasil sementara kedaluwarsa. Mulai pemeriksaan kembali. [JOB_EXPIRED]'});}
   return respond(200,publicJob(job,now));
  }
  const dispatch=deps.dispatch|| (async data=>{
   // Only a server-configured origin is used: never forward secrets to a Host supplied by a caller.
   const origin=process.env.DEPLOY_PRIME_URL||process.env.URL;
   if(!origin||!/^https:\/\//.test(origin))throw new Error('JOB_DISPATCH');
   const response=await fetch(new URL('/.netlify/functions/process-background',origin),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(8000)});
   if(response.status!==202)throw new Error('JOB_DISPATCH');
  });
  try{return respond(202,await startJob({store,id:body.id,kind:body.kind,payload,dispatch,now}));}
  catch(e){if(e instanceof InputError)return respond(409,{error:e.message});if(e.message==='JOB_DISPATCH'||e.name==='TimeoutError'||e.name==='TypeError')return respond(503,{error:'Proses latar belakang belum dapat dimulai. Periksa Function process-background pada deployment. [JOB_DISPATCH]'});throw e;}
 }catch{return respond(503,{error:'Status proses belum dapat disimpan atau dibaca. Isian tetap tersedia. [JOB_STORAGE]'});}
};}
export default createJobsHandler();

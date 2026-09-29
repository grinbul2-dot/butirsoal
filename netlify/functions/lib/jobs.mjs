import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {validateInput,validateAnalysis,InputError} from './contract.mjs';
import {handleRequest as analyze} from '../analyze.mjs';
import {handleRequest as revise} from '../revise.mjs';
import {handleRequest as readImage,validateImages} from '../read-image.mjs';

export const JOB_TTL=86400000;
export const JOB_LIMIT=240000;
export const validJobId=id=>typeof id==='string'&&/^\d{13}-[a-f0-9]{64}$/.test(id);
export async function jobStore(){
 const {getStore}=await import('@netlify/blobs');
 return getStore({name:'butir-jobs-v1',consistency:'strong'});
}
export function jobPayload(kind,value){
 if(kind==='read-image'){
  try{return {images:validateImages(value)};}catch(e){throw new InputError('File tidak didukung karena '+e.message);}
 }
 if(kind==='analyze')return validateInput(value);
 if(kind==='revise'){
  const input=validateInput(value?.input);
  return {input,analysis:validateAnalysis(value.analysis,input)};
 }
 throw new InputError('Jenis pemeriksaan tidak dikenal.');
}
export const digest=(kind,payload)=>createHash('sha256').update(JSON.stringify({kind,payload})).digest('hex');
export function publicJob(job,now=Date.now()){
 if(job.state==='done')return {state:'done',data:job.data};
 if(job.state==='error')return {state:'error',error:job.error};
 if(now-job.createdAt>JOB_LIMIT)return {state:'error',error:'Proses belum berhasil diselesaikan. Isian tetap tersedia; silakan coba lagi. [JOB_STALLED]'};
 return {state:job.state,message:job.state==='queued'?'Permintaan diterima. Menunggu pemeriksaan dimulai…':job.message||'Pemeriksaan masih berjalan. Hasil akan tampil otomatis…'};
}
export async function startJob({store,id,kind,payload,dispatch,now=Date.now()}){
 const fingerprint=digest(kind,payload);
 const initial={kind,payload,fingerprint,state:'queued',createdAt:now,secret:randomBytes(32).toString('hex')};
 await store.setJSON(id,initial,{onlyIfNew:true});
 const current=await store.getWithMetadata(id,{type:'json'});
 if(!current)throw new Error('JOB_STORAGE');
 const job=current.data;
 if(job.fingerprint!==fingerprint)throw new InputError('Kode proses sudah digunakan untuk isian berbeda. [JOB_CONFLICT]');
 if(job.state==='queued'){
  // Dispatch is safe to repeat: the worker claims the stored ETag exactly once.
  await dispatch({id,secret:job.secret});
 }
 return publicJob(job,now);
}
export async function runJob({id,secret},deps={}){
 if(!validJobId(id)||typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))return;
 const store=deps.store||await jobStore(),now=deps.now||Date.now;
 const current=await store.getWithMetadata(id,{type:'json'});
 if(!current||current.data.state!=='queued'||now()-current.data.createdAt>JOB_LIMIT)return;
 const job=current.data;
 if(!timingSafeEqual(Buffer.from(secret),Buffer.from(job.secret)))return;
 const running={...job,state:'running',message:'Pemeriksaan sedang berjalan. Hasil akan tampil otomatis…'};
 const claim=await store.setJSON(id,running,{onlyIfMatch:current.etag});
 if(!claim.modified)return;
 console.info(JSON.stringify({event:'job_started',kind:job.kind}));
 let etag=claim.etag;
 const write=async value=>{
  const saved=await store.setJSON(id,value,{onlyIfMatch:etag});
  if(saved.modified)etag=saved.etag;
  return saved.modified;
 };
 let progress=Promise.resolve();
 const update=message=>{progress=progress.then(()=>write({...running,message})).catch(()=>{});};
 let final;
 try{
  const handler=deps.execute||(job.kind==='analyze'?analyze:job.kind==='revise'?revise:readImage);
  const response=await handler({httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(job.payload)},update,undefined,{budgetMs:180000,attemptMs:80000,reserveFallback:true});
  const body=JSON.parse(response.body);
  final=response.statusCode===200?{state:'done',data:body}:{state:'error',error:body.error||'Pemeriksaan belum berhasil. [JOB_FAILED]'};
 }catch{
  final={state:'error',error:'Proses pemeriksaan terhenti. Isian tetap tersedia; silakan coba kembali. [JOB_FAILED]'};
 }
 await progress;
 // Do not retain the source input or worker secret after processing finishes.
 await write({...final,kind:job.kind,fingerprint:job.fingerprint,createdAt:job.createdAt});
 console.info(JSON.stringify({event:'job_finished',kind:job.kind,state:final.state,elapsedMs:now()-job.createdAt}));
}

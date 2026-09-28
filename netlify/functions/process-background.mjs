import {runJob} from './lib/jobs.mjs';
export default async request=>{
 if(request.method!=='POST')return;
 const raw=await request.text();
 if(Buffer.byteLength(raw)>1024)return;
 let data;try{data=JSON.parse(raw);}catch{return;}
 await runJob(data);
};

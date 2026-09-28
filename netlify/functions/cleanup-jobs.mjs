import {jobStore,validJobId,JOB_TTL} from './lib/jobs.mjs';
export default async()=>{
 const store=await jobStore(),cutoff=Date.now()-JOB_TTL;
 for await(const page of store.list({paginate:true})){
  const expired=page.blobs.filter(({key})=>validJobId(key)&&Number(key.slice(0,13))<cutoff);
  for(let i=0;i<expired.length;i+=20)await Promise.all(expired.slice(i,i+20).map(({key})=>store.delete(key)));
 }
};
export const config={schedule:'0 0 * * *'};

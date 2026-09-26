export const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)});
export function endpoint(handle){return async request=>{
 const event={httpMethod:request.method,headers:Object.fromEntries(request.headers),body:request.method==='POST'?await request.text():''};
 if(!request.headers.get('accept')?.includes('application/x-ndjson')){
  const r=await handle(event,()=>{},request.signal);return new Response(r.body,{status:r.statusCode,headers:r.headers});
 }
 const encoder=new TextEncoder(),controller=new AbortController();
 const abort=()=>controller.abort(request.signal.reason);
 request.signal.addEventListener('abort',abort,{once:true});
 if(request.signal.aborted)abort();
 const stream=new ReadableStream({
  async start(out){
   const emit=data=>{if(!controller.signal.aborted)out.enqueue(encoder.encode(JSON.stringify(data)+'\n'));};
   try{
    emit({type:'progress',message:'Permintaan diterima. Memulai pemeriksaan…'});
    const r=await handle(event,message=>emit({type:'progress',message}),controller.signal);
    emit({type:r.statusCode<400?'result':'error',status:r.statusCode,...JSON.parse(r.body)});
   }catch{emit({type:'error',status:502,error:'Koneksi layanan terputus. Silakan coba kembali; isian Anda tetap tersedia.'});}
   finally{request.signal.removeEventListener('abort',abort);if(!controller.signal.aborted)out.close();}
  },cancel(){controller.abort();request.signal.removeEventListener('abort',abort);}
 });
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};}

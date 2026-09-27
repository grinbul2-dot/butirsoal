export const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)});
// Await the complete result before returning: no partially closed progress stream.
export function endpoint(handle){return async request=>{
 try{
  const event={httpMethod:request.method,headers:Object.fromEntries(request.headers),body:request.method==='POST'?await request.text():''};
  const r=await handle(event,()=>{},request.signal);
  return new Response(r.body,{status:r.statusCode,headers:{...r.headers,'X-App-Version':'1.6.3'}});
 }catch{
  const r=reply(502,{error:'Permintaan terhenti sebelum selesai. Silakan coba kembali. [REQUEST_INTERRUPTED]'});
  return new Response(r.body,{status:r.statusCode,headers:r.headers});
 }
};}

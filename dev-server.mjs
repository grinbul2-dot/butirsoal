// Local server for preview/testing. Never exposes an API key to the browser.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {handler as imageHandler} from './netlify/functions/read-image.mjs';
import {handler} from './netlify/functions/analyze.mjs';
const port=Number(process.env.PORT||8787);
http.createServer(async(req,res)=>{
 try{
  if(['/.netlify/functions/analyze','/.netlify/functions/read-image'].includes(req.url)){
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4500000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Data terlalu besar.'}));return;}chunks.push(chunk);}
   const response=await (req.url.endsWith('read-image')?imageHandler:handler)({httpMethod:req.method,headers:req.headers,body:Buffer.concat(chunks).toString()});res.writeHead(response.statusCode,response.headers);res.end(response.body);return;
  }
  if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(new URL('./public/index.html',import.meta.url)));return;}
  res.writeHead(404);res.end('Not found');
 }catch{res.writeHead(500);res.end('Local server error');}
}).listen(port,'0.0.0.0',()=>console.log('Preview: http://localhost:'+port));

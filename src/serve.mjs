import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';
const root=resolve(import.meta.dirname,'../dist');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  let decoded=decodeURIComponent(url.pathname);
  if(decoded.includes('\0')) throw Error('invalid');
  let target=resolve(root,'.'+decoded);
  if(target!==root&&!target.startsWith(root+sep)) {res.writeHead(403);res.end('Forbidden');return;}
  let info=await stat(target).catch(()=>null);
  if(info?.isDirectory())target=join(target,'index.html');
  const data=await readFile(target);
  res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
  res.end(data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('VOID preview: http://127.0.0.1:'+port));

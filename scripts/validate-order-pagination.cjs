const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const unit of ['quimico','textil','ceramico']) {
 const dir='creacionpedido/'+unit+'/'+fs.readdirSync('creacionpedido/'+unit)[0]+'/webapp/';
 function load(file,deps={},globals={}){let mod;vm.runInNewContext(fs.readFileSync(dir+file,'utf8'),{...globals,sap:{ui:{define:(names,f)=>mod=f(...names.map(n=>deps[n]||{}))}}});return mod;}
 for(const mode of ['single','pages','fail','cycle','suggestion','object']){
  const urls=[]; const http=load('util/utilHttp.js',{},{$:{ajax:o=>{
   urls.push(o.url); const second=o.url.includes('skiptoken');
   if(mode==='fail'&&second)return o.error({},'error','failed');
   o.success({d:mode==='object'?{Value:42}:{results:[{Page:second?2:1}],__next:['pages','fail','cycle','suggestion'].includes(mode)&&(!second||mode==='cycle')?'https://internal/sap/Items?$filter=A&$skiptoken=2':undefined}});
  }}});
  let result;http.ERPGetSync('/app/S4HANA/sap/Items?$filter=A&$top='+(mode==='suggestion'?200:10000),r=>result=r);
  if(['fail','cycle'].includes(mode))assert.equal(result.iCode,-1);
  else assert.equal(result.iCode,1);
  assert.equal(urls.length,['pages','fail','cycle'].includes(mode)?2:1);
  assert.ok(urls.every(u=>u.startsWith('/app/S4HANA/sap/Items?')));
  if(mode==='pages')assert.equal(result.data.length,2);
  if(mode==='object')assert.equal(result.data.Value,42);
  if(mode==='suggestion')assert.ok(urls[0].includes('$top=200'));
  else assert.ok(!urls[0].includes('$top='));
 }
 const services=load('services/Services.js');
 for(const mode of ['pages','fail','cycle']){
  const calls=[];let result,error;
  services.readAllOData({read:(p,o)=>{calls.push([p,o]);if(calls.length===2&&mode==='fail')return o.error({message:'failed'});o.success({results:[{Page:calls.length}],__next:calls.length===1||mode==='cycle'?'https://internal/sap/MaterialsConsultation?$filter=Brand&$skiptoken=100':null});}},'/MaterialsConsultation',{filters:['BRAND'],success:r=>result=r,error:e=>error=e});
  assert.equal(calls.length,2);assert.equal(calls[0][1].filters[0],'BRAND');assert.equal(calls[1][1].filters,undefined);
  assert.equal(calls[1][0],'/MaterialsConsultation?$filter=Brand&$skiptoken=100');
  if(mode==='pages')assert.equal(result.results.length,2);else {assert.ok(error);assert.equal(result,undefined);}
 }
 console.log('PASS pagination transport and OData:',unit);
}

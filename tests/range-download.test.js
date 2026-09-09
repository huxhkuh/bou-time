import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const { guardRangeDownloads } = createRequire(import.meta.url)('../desktop/range-download.cjs');
function responseCheck(range, response) {
  let aborted=false, delivered=false, error;
  const executor={createRequest(_options, cb) { const r=new EventEmitter(); r.abort=()=>{aborted=true;}; r.respond=()=>cb(response); return r; }};
  guardRangeDownloads(executor); guardRangeDownloads(executor);
  const req=executor.createRequest({headers:range?{Range:range}:{}},()=>{delivered=true;});
  req.on('error',e=>{error=e;}); req.respond();
  return {aborted,delivered,error};
}
test('a server ignoring Range is rejected before bytes reach the differential writer',()=>{
  for(const response of [
    {statusCode:200,headers:{'content-length':'100000000'}},
    {statusCode:206,headers:{'content-range':'bytes 0-9/100'}},
    {statusCode:206,headers:{'content-range':'bytes 10-19/100','content-length':'100'}},
    {statusCode:206,headers:{'content-range':'bytes 10-19/19'}},
  ]) {
    const result=responseCheck('bytes=10-19',response);
    assert.equal(result.aborted,true); assert.equal(result.delivered,false); assert.ok(result.error);
  }
});
test('valid ranges and ordinary full downloads pass through unchanged',()=>{
  for(const [range,response] of [
    ['bytes=10-19',{statusCode:206,headers:{'content-range':['bytes 10-19/100'],'content-length':'10'}}],
    [undefined,{statusCode:200,headers:{'content-length':'100'}}],
  ]) assert.deepEqual(responseCheck(range,response),{aborted:false,delivered:true,error:undefined});
});

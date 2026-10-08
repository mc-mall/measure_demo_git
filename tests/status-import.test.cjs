const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  const c = {localStorage:{getItem:()=>null,setItem(){}}}; c.window=c; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/workflow.js'),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../measure_admin/status-import.js'),'utf8').split('/* Import dialog controller. */')[0],c);
  const store={employees:[{id:'E1',order_id:'O1',employee_id:'001',order_progress:3},{id:'E2',order_id:'O1',employee_id:'002',order_progress:3}],afterSales:[{id:'AS1',order_id:'O1',employee_id:'001',status:'門市收貨',items:[{garment_id:'G1',quantity:2}],receipts:[{items:[{garment_id:'G1',quantity:2}]}]}]};
  return {api:c.MeasureStatusImport,store};
}
const headers=['订单号','员工编号','目标状态','预计交付日期'];
test('forward import matches order and employee, records date, and repeated import is idempotent',()=>{
 const {api,store}=setup(); const rows=[headers,['O1','001','下单到工厂','2026-11-20'],['O1','002','已下單到工廠','2026/11/21']];
 const before=JSON.stringify(store);const plan=api.plan(store,rows,'forward','O1');assert.equal(plan.updates,2);assert.equal(JSON.stringify(store),before);
 api.apply(store,plan,'forward',{id:'owner',username:'管理員'},'2026-10-08');
 assert.equal(store.employees[0].order_progress,4);assert.equal(store.employees[1].estimated_delivery_date,'2026-11-21');
 assert.equal(store.employees[0].order_progress_history[0].source,'status_import');
 const repeated=api.plan(store,rows,'forward','O1');assert.equal(repeated.updates,0);assert.equal(repeated.skipped,2);
});
test('bad rows, duplicate IDs, dates, cross-order imports and skipped stages prevent the whole batch',()=>{
 const {api,store}=setup();const rows=[headers,['O1','001','下单到工厂','2026-11-20'],['O1','001','下单到工厂','2026-11-20'],['O1','002','下单到工厂','2026-02-30'],['O1','missing','下单到工厂','2026-11-20']];
 const plan=api.plan(store,rows,'forward','O1');assert.equal(plan.errors,3);assert.throws(()=>api.apply(store,plan,'forward',{},''));assert.equal(store.employees[0].order_progress,3);
 assert.equal(api.plan(store,[headers,['O1','001','下单到工厂','2026-11-20']],'forward','OTHER').errors,1);
 for(const target of ['完成交付','预约量身','随机状态']) assert.equal(api.plan(store,[headers,['O1','001',target,'']],'forward','O1').errors,1);
 assert.equal(api.plan(store,[headers,['O1','001','下单到工厂','']],'forward','O1').errors,1);
});
test('after-sale import requires receipt evidence and excludes closed cases and mismatched identities',()=>{
 const {api,store}=setup();const h=['售后编号','目标状态','预计交付日期','员工编号'];
 const rows=[h,['AS1','下单到工厂','2026-11-20','001']];
 assert.equal(api.plan(store,rows,'after').updates,1);
 store.afterSales[0].receipts[0].items[0].quantity=1;assert.equal(api.plan(store,rows,'after').errors,1);
 store.afterSales[0].receipts[0].items[0].quantity=2;
 assert.equal(api.plan(store,[h,['AS1','下单到工厂','2026-11-20','002']],'after').errors,1);
 store.afterSales[0].status='已關閉';assert.equal(api.plan(store,rows,'after').errors,1);
 store.afterSales[0].status='提交售後';store.afterSales[0].receipts=[];
 assert.equal(api.plan(store,[h,['AS1','门市收货','','001']],'after').errors,1);
 assert.equal(api.plan(store,[h,['AS1','簽字確認服裝','','001']],'after').errors,1);
});
test('after-sale import preserves receipts and propagates status and history through delivery',()=>{
 const {api,store}=setup();const h=['售後編號','目標狀態','預計交付日期'];
 const receipts=JSON.stringify(store.afterSales[0].receipts);
 for(const [target,date] of [['下单到工厂','2026-11-20'],['工厂交付待派送',''],['完成交付','']]) {
  const plan=api.plan(store,[h,['AS1',target,date]],'after');assert.equal(plan.updates,1);api.apply(store,plan,'after',{username:'owner'},'today');
 }
 assert.equal(store.afterSales[0].status,'完成派送');assert.equal(store.afterSales[0].estimated_delivery_date,'2026-11-20');
 assert.equal(store.afterSales[0].status_history.length,3);assert.equal(JSON.stringify(store.afterSales[0].receipts),receipts);
});
test('templates skip empty targets, validate headers, and parse quoted multiline CSV and TSV',()=>{
 const {api,store}=setup();assert.equal(api.plan(store,[headers,['O1','001','','']],'forward').skipped,1);
 assert.throws(()=>api.plan(store,[['员工编号'],['001']],'forward'));
 assert.throws(()=>api.plan(store,[[...headers,'status'],['O1','001','','','']],'forward'));
 const rows=api.textRows('\ufeff订单号,员工编号,目标状态,姓名\r\nO1,001,下单到工厂,"姓名,含逗号\n第二行"\r\n');assert.equal(rows.length,2);assert.equal(rows[1][1],'001');assert.equal(rows[1][3],'姓名,含逗号\n第二行');
 assert.equal(api.textRows('a\tb\n001\t002')[1][0],'001');assert.throws(()=>api.textRows('a,b\n"bad'));
 assert.equal(api.date('46346'),'2026-11-20'); assert.equal(api.date('60'),'');
});
test('large imports produce one preview row per employee and apply all updates',()=>{
 const {api,store}=setup();store.employees=Array.from({length:5000},(_,i)=>({id:`E${i}`,order_id:'O1',employee_id:String(i),order_progress:3}));
 const plan=api.plan(store,[headers,...store.employees.map(e=>['O1',e.employee_id,'下单到工厂','2026-11-20'])],'forward','O1');
 assert.equal(plan.updates,5000);api.apply(store,plan,'forward',{username:'owner'},'today');assert(store.employees.every(e=>e.order_progress===4));
});

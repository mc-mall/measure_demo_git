const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(initial) {
  let raw = initial ? JSON.stringify(initial) : null;
  const context = {localStorage: {getItem: () => raw, setItem: (_, value) => {raw = value;}}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../shared/workflow.js'), 'utf8'), context);
  return context.MeasureWorkflow;
}
test('old status versions migrate once without inventing receipt evidence', () => {
  for (const version of [undefined, 2]) {
    const w = setup({afterSaleStatusVersion: version, afterSales: [{id:'AS1',status:'已完成',items:[{quantity:2}],status_history:[{status:'已完成',changed_at:'2026-01-01'}]}], employees:[]});
    const store = w.read();
    assert.equal(store.afterSales[0].status, version === 2 ? '完成派送' : '門市收貨');
    assert.equal(store.afterSales[0].receipt, undefined);
    assert.equal(store.afterSales[0].items[0].quantity, 2);
    assert.equal(JSON.stringify(w.normalize(store)), JSON.stringify(store));
  }
});
test('progress matches employee and order, cancellation rolls back booking only', () => {
  const w = setup(); const s = w.read(); const employee = s.employees[0]; s.appointments = []; s.measurements = [];
  assert.equal(w.progress(s, employee), 0);
  employee.verification_status = 'verified'; assert.equal(w.progress(s, employee), 1);
  s.appointments.push({employee_id:employee.employee_id,order_id:'OTHER',status:'booked'});assert.equal(w.progress(s, employee),1);
  s.appointments.push({employee_id:employee.employee_id,order_id:employee.order_id,status:'booked'}); assert.equal(w.progress(s, employee),2);
  s.appointments[1].status = 'cancelled'; assert.equal(w.progress(s, employee),1);
  s.measurements.push({employee:{employee_id:employee.employee_id,order_id:employee.order_id}});assert.equal(w.progress(s, employee),3);
  employee.order_progress=6;assert.equal(w.progress(s, employee),6);
});
test('return garments use confirmed quantities, otherwise gender-specific order configuration', () => {
  const w=setup();const s=w.read();const e=s.employees[0];
  assert(w.garments(s,e).every(item=>s.orders[0].garments.find(g=>g.id===item.id).gender===e.gender));
  e.signature_confirmation={selectedSkuList:[{skuId:'shirt',skuName:'襯衫',quantity:3}]};
  assert.equal(w.garments(s,e).length,1);assert.equal(w.garments(s,e)[0].quantity,3);
});
test('receipt quantities preserve partial and zero receipt without substituting requested counts', () => {
  const w=setup(); const shirt={garment_id:'shirt',quantity:2};const pants={garment_id:'pants',quantity:1};
  const record={status:'提交售後',items:[shirt,pants]};
  assert.equal(w.receivedLabel(record,shirt),'待簽收');
  record.status='門市收貨';assert.equal(w.receivedLabel(record,shirt),'未記錄');
  record.receipt={items:[{garment_id:'shirt',quantity:1},{garment_id:'pants',quantity:0}]};
  assert.equal(w.receivedQuantity(record,shirt),1);assert.equal(w.receivedQuantity(record,pants),0);assert.equal(shirt.quantity,2);
});
test('multiple receipts accumulate, legacy receipt remains one batch, closed garment excluded from factory', () => {
  const w=setup();const coat={garment_id:'coat',quantity:2};const sweater={garment_id:'sweater',quantity:1};
  const r={items:[coat,sweater],receipt:{items:[{garment_id:'coat',quantity:1}]}};
  r.receipts=[...w.receiptBatches(r),{items:[{garment_id:'coat',quantity:1}]}];
  assert.equal(w.receivedQuantity(r,coat),2);assert.equal(w.remainingQuantity(r,coat),0);assert.equal(w.readyForFactory(r),false);
  sweater.closed={reason:'現場退換'};assert.equal(w.readyForFactory(r),true);
  coat.closed={reason:'現場處理'};assert.equal(w.readyForFactory(r),false);
});

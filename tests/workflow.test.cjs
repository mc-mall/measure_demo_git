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
test('after-sales require a configured product that the employee selected or was allocated', () => {
  const w = setup();
  const store = w.read();
  const [order] = store.orders;
  const [employee] = store.employees;
  assert.equal(w.afterSaleGarments(store, employee).length, 0);

  order.after_sale_products = [
    { garment_id: 'G001', limit: 1 },
    { garment_id: 'G003', limit: 2 },
    { garment_id: 'G004', limit: 0 },
    { garment_id: 'removed', limit: 1 },
  ];
  assert.equal(w.afterSaleGarments(store, employee).map(item => item.id).join(), 'G003');
  employee.signature_confirmation = { selectedSkuList: [
    { skuId: 'G003', skuName: '襯衫', quantity: 3 },
    { skuId: 'G006', skuName: '連衣裙', quantity: 2 },
    { skuId: 'removed', skuName: '舊款', quantity: 1 },
  ] };
  const [shirt] = w.afterSaleGarments(store, employee);
  assert.equal(shirt.quantity, 3);
  assert.equal(shirt.remaining, 5);
  employee.signature_confirmation.selectedSkuList = [];
  assert.equal(w.afterSaleGarments(store, employee).length, 0);
});
test('employee and store applications share a quantity-based quota for the same employee, order and product', () => {
  const w = setup();
  const store = w.read();
  const [employee] = store.employees;
  store.orders[0].after_sale_products = [{ garment_id: 'G003', limit: 2 }];
  const record = { employee_id: employee.employee_id, order_id: employee.order_id };
  store.afterSales = [
    { ...record, source: 'employee', items: [{ garment_id: 'G003', quantity: 1 }] },
    { ...record, source: 'admin', items: [{ garment_id: 'G003', quantity: 2 }] },
    { ...record, order_id: 'OTHER', items: [{ garment_id: 'G003', quantity: 2 }] },
    { ...record, employee_id: 'OTHER', items: [{ garment_id: 'G003', quantity: 2 }] },
    { ...record, items: [{ garment_id: 'G004', quantity: 2 }] },
    { ...record, items: [{ garment_id: 'G003', quantity: 2, closed: {} }] },
  ];
  const [shirt] = w.afterSaleGarments(store, employee);
  assert.equal(shirt.remaining, 1);
  assert.equal(shirt.quantity, 1);
  store.afterSales.at(-1).receipts = [{ items: [{ garment_id: 'G003', quantity: 1 }] }];
  assert.equal(w.afterSaleGarments(store, employee).length, 0);
});
test('after-sale submission validates current product IDs, quantities and demands', () => {
  const w = setup();
  const eligible = [{ id: 'G003', name: '襯衫', quantity: 1 }];
  const selected = { garment_id: 'G003', demand: '修改袖長', quantity: 1 };
  assert.equal(w.validateAfterSaleItems(eligible, [selected])[0].garment_name, '襯衫');
  assert.equal(w.validateAfterSaleItems([], [selected]), null);
  assert.equal(w.validateAfterSaleItems(eligible, [selected, selected]), null);
  assert.equal(w.validateAfterSaleItems(eligible, [{ ...selected, quantity: 2 }]), null);
  assert.equal(w.validateAfterSaleItems(eligible, [{ ...selected, demand: '' }]), null);
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
test('alteration tasks keep one-item barcode and audit collections through normalization', () => {
  const w = setup();
  const store = w.read();
  assert.ok(store.alterationTasks.length >= 2);
  assert.ok(store.qcs.length >= 1);
  assert.ok(store.alterationTasks.every(task => task.items.length === 1 && task.items[0].quantity === 1 && task.items[0].barcode && task.items[0].id));
  const normalized = w.normalize({afterSales: [], employees: [], alterationTasks: [{id: 'ALT1'}]});
  assert.equal(normalized.alterationTasks[0].items.length, 0);
  assert.equal(normalized.alterationTasks[0].handovers.length, 0);
  assert.equal(normalized.alterationTasks[0].anomalies.length, 0);
  assert.equal(normalized.alterationTasks[0].history.length, 0);
  assert.equal(w.normalize({afterSales: [], employees: [], alterationTasks: [{id: 'ALT2', type: '员工中止后重新发起'}]}).alterationTasks[0].type, '普通改衣');
  assert.equal(w.normalize({afterSales: [], employees: [], alterationTasks: [{id: 'ALT3', status: '已分配待師傅收貨'}]}).alterationTasks[0].status, '改衣中');
});
test('alteration status normalization preserves the QC gate after tailor return', () => {
  const w = setup({afterSales: [], employees: [], alterationTasks: [
    {id: 'ALT-QC-1', status: '師傅已交回', items: [{id: 'ITEM-1', status: '師傅已交回'}]},
    {id: 'ALT-QC-2', status: '門市驗收', items: [{id: 'ITEM-2', status: '門市驗收'}]},
  ]});
  const store = w.read();
  assert.equal(store.alterationTasks[0].status, '门市质检');
  assert.equal(store.alterationTasks[0].items[0].status, '门市质检');
  assert.equal(store.alterationTasks[1].status, '门市质检');
  assert.equal(store.alterationTasks[1].items[0].status, '门市质检');
});

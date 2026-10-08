const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../measure_admin/app.js'), 'utf8');
function setup() {
  const elements = {};
  const element = id => elements[id] ||= {value: '', dataset: {}, setCustomValidity() {}};
  let handler;
  let saved = 0;
  const context = {
    localStorage: {getItem: () => null, setItem() {}},
    document: {getElementById: element, querySelectorAll: () => [{value: 'AS1'}, {value: 'AS2'}], addEventListener: (_, fn) => {handler = fn;}},
    currentUser: {id: 'owner', username: '管理員'}, isOwner: () => true, hasPermission: () => true,
    nowText: () => '2026-10-08 12:00:00', confirm: () => true, showToast() {}, renderAfterSales() {}, openAfterSaleDetail() {},
    saveStore: () => saved++, loadStore: () => context.store,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../shared/workflow.js'), 'utf8'), context);
  vm.runInContext(source.slice(source.indexOf('function requestFactoryDeliveryDate('), source.indexOf('function renderRecords(')), context);
  const start = source.indexOf('function openOrderProgress(orderId) {');
  vm.runInContext(source.slice(start, source.indexOf('document.getElementById("export-after-sales")', start)), context);
  context.openOrderProgress = () => {};
  context.requestFactoryDeliveryDate = async () => context.date;
  context.store = {employees: [{id: 'E1', order_id: 'O1', employee_id: 'EMP1', order_progress: 3}], afterSales: ['AS1', 'AS2'].map(id => ({id, status: '門市收貨', items: [{garment_id: 'G1', quantity: 1}], receipts: [{items: [{garment_id: 'G1', quantity: 1}]}]}))};
  element('order-progress-dialog').dataset.orderId = 'O1';
  element('after-sale-batch-status').value = '已下單到工廠';
  element('after-sale-detail-dialog').close = () => {};
  return {context, saved: () => saved, click: dataset => handler({target: {closest: () => ({dataset})}})};
}
test('delivery date requires a real calendar date, including leap-year validation', () => {
  const {context: c} = setup();
  for (const date of ['', undefined, '2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01']) assert.equal(c.MeasureWorkflow.validDeliveryDate(date), false);
  for (const date of ['2026-10-31', '2028-02-29']) assert.equal(c.MeasureWorkflow.validDeliveryDate(date), true);
});
test('forward factory transition cancels cleanly and retains date through delivery', async () => {
  const {context: c, click, saved} = setup();
  const e = c.store.employees[0];
  c.date = null;
  await click({advanceOrder: 'E1'});
  assert.equal(e.order_progress, 3); assert.equal(saved(), 0);
  c.date = '2026-11-01';
  await click({advanceOrder: 'E1'});
  assert.equal(e.order_progress, 4); assert.equal(e.estimated_delivery_date, c.date);
  assert.equal(e.order_progress_history[0].estimated_delivery_date, c.date);
  await click({advanceOrder: 'E1'}); await click({advanceOrder: 'E1'});
  assert.equal(e.order_progress, 6); assert.equal(e.estimated_delivery_date, c.date);
});
test('single after-sale factory transition requires date and retains it at completion', async () => {
  const {context: c, click, saved} = setup(); const r = c.store.afterSales[0];
  c.date = null; await click({advanceAfterSale: 'AS1'});
  assert.equal(r.status, '門市收貨'); assert.equal(saved(), 0);
  assert.throws(() => c.advanceAfterSale(r, '已下單到工廠', '2026-02-30'));
  assert.equal(r.status, '門市收貨');
  c.date = '2026-11-02'; await click({advanceAfterSale: 'AS1'});
  assert.equal(r.status, '已下單到工廠'); assert.equal(r.status_history[0].estimated_delivery_date, c.date);
  await click({advanceAfterSale: 'AS1'}); await click({advanceAfterSale: 'AS1'});
  assert.equal(r.status, '完成派送'); assert.equal(r.estimated_delivery_date, c.date);
});
test('batch factory transition cancels atomically, uses one date and preserves receipt gate', async () => {
  const {context: c, saved} = setup();
  c.date = null; await c.applyAfterSaleStatus(); assert.equal(saved(), 0);
  c.date = '2026-11-03'; c.store.afterSales[1].receipts = [];
  await c.applyAfterSaleStatus(); assert.equal(saved(), 0);
  c.store.afterSales[1].receipts = c.store.afterSales[0].receipts;
  await c.applyAfterSaleStatus(); assert.equal(saved(), 1);
  for (const r of c.store.afterSales) {
    assert.equal(r.status, '已下單到工廠'); assert.equal(r.estimated_delivery_date, c.date);
  }
});
test('client shows distinct forward and after-sale dates and supports old records', () => {
  const {context: c} = setup();
  const client = fs.readFileSync(path.join(__dirname, '../client/app.js'), 'utf8');
  c.currentEmployee = {employeeId: 'EMP1', orderId: 'O1', name: '員工'};
  c.selectedAfterSaleId = 'AS1';
  c.loadSharedAdminStore = () => c.store;
  c.getEmployeeOrders = () => [{order_id: 'O1', company_name: '公司'}];
  c.getEmployeeAfterSaleRecords = () => c.store.afterSales;
  c.escapeClientHtml = value => String(value ?? '');
  c.renderWorkflow = () => '<div>進度</div>';
  c.afterSaleStatusClass = () => 'processed';
  vm.runInContext(client.slice(client.indexOf('function renderClientOrders()'), client.indexOf('function clientAppointmentBookings(')), c);
  c.renderClientOrders(); c.renderClientAfterSaleDetail();
  assert.doesNotMatch(c.document.getElementById('client-order-cards').innerHTML, /預計交付日期/);
  c.store.employees[0].estimated_delivery_date = '2026-11-01';
  c.store.afterSales[0].estimated_delivery_date = '2026-11-15';
  c.renderClientOrders(); c.renderClientAfterSaleDetail();
  assert.match(c.document.getElementById('client-order-cards').innerHTML, /預計交付日期：<strong>2026-11-01/);
  assert.match(c.document.getElementById('client-after-sale-records').innerHTML, /預計交付日期：<strong>2026-11-15/);
  assert.match(c.document.getElementById('client-after-sale-detail').innerHTML, /預計交付日期：<strong>2026-11-15/);
});
test('admin can advance all six forward stages without creating business records', async () => {
  const {context: c, click, saved} = setup();
  const employee = c.store.employees[0]; employee.order_progress = 0;
  c.date = '2026-11-01';
  for (let stage = 1; stage <= 6; stage++) {
    await click({advanceOrder: 'E1'});
    assert.equal(c.MeasureWorkflow.progress(c.store, employee), stage);
    assert.equal(employee.order_progress_history.at(-1).operator, '管理員');
    assert.equal(employee.order_progress_history.at(-1).source, 'admin');
  }
  await click({advanceOrder: 'E1'}); assert.equal(saved(), 6);
  assert.equal(employee.signature_confirmation, undefined);
  assert.equal(c.store.appointments, undefined); assert.equal(c.store.measurements, undefined);
});
test('forward batch rejects mixed stages, wrong orders, skips and unauthorized changes', async () => {
  const {context: c, saved} = setup();
  c.store.employees.push({id: 'E2', order_id: 'O1', order_progress: 2});
  c.date = '2026-11-01';
  await c.advanceOrderProgress(['E1', 'E2'], 4); assert.equal(saved(), 0);
  await c.advanceOrderProgress(['E1'], 5); assert.equal(saved(), 0);
  c.store.employees[1].order_progress = 3; c.store.employees[1].order_id = 'OTHER';
  await c.advanceOrderProgress(['E1', 'E2'], 4); assert.equal(saved(), 0);
  c.store.employees[1].order_id = 'O1'; c.isOwner = () => false;
  await c.advanceOrderProgress(['E1', 'E2'], 4); assert.equal(saved(), 0);
  c.isOwner = () => true; c.date = null;
  await c.advanceOrderProgress(['E1', 'E2'], 4); assert.equal(saved(), 0);
  c.date = '2026-11-01'; await c.advanceOrderProgress(['E1', 'E2'], 4);
  assert.equal(saved(), 1);
  for (const e of c.store.employees) {assert.equal(e.order_progress, 4); assert.equal(e.estimated_delivery_date, c.date);}
});
test('forward transition rereads store after date entry and detects concurrent progress changes', async () => {
  const {context: c, saved} = setup();
  c.requestFactoryDeliveryDate = async () => {
    c.store = JSON.parse(JSON.stringify(c.store));
    c.store.employees[0].name = '最新姓名';
    return '2026-11-01';
  };
  await c.advanceOrderProgress(['E1'], 4);
  assert.equal(saved(), 1); assert.equal(c.store.employees[0].name, '最新姓名');
  c.store.employees[0].order_progress = 3;
  c.requestFactoryDeliveryDate = async () => {c.store.employees[0].order_progress = 4; return '2026-11-02';};
  await c.advanceOrderProgress(['E1'], 4); assert.equal(saved(), 1);
  assert.equal(c.store.employees[0].estimated_delivery_date, '2026-11-01');
});

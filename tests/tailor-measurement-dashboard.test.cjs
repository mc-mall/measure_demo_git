const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../tailor/app.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function employeeKey('), source.indexOf('function readWorkspacePins(')), ctx);

test('measurement overview counts order employees once and requires a usable archive for the same order', () => {
  const measured = {order_id: 'A', employee_id: 'E1'};
  const sameIdOtherOrder = {order_id: 'B', employee_id: 'E1'};
  const removedOnly = {order_id: 'A', employee_id: 'E2'};
  const noAppointment = {order_id: 'A', employee_id: 'E3'};
  const deletedOrder = {order_id: 'DELETED', employee_id: 'E1'};
  const store = {
    orders: [{order_id: 'A'}, {order_id: 'B'}],
    employees: [measured, {...measured}, sameIdOtherOrder, removedOnly, noAppointment, deletedOrder],
    measurements: [
      {employee: measured},
      {employee: measured, version: 2},
      {employee: removedOnly, archive_removed_at: '2026-11-06 11:00:00'},
      {employee: {order_id: 'B', employee_id: 'E2'}},
    ],
  };
  const rows = orderId => Array.from(ctx.measurementRows(store, orderId), ({employee, measured}) => [employee, measured]);
  assert.deepEqual(rows(''), [[measured, true], [sameIdOtherOrder, false], [removedOnly, false], [noAppointment, false]]);
  assert.deepEqual(rows('B'), [[sameIdOtherOrder, false]]);
  assert.deepEqual(rows('DELETED'), []);
});

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../tailor/app.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function appointmentTime('), source.indexOf('function appointmentToday(')), ctx);
test('appointment execution excludes cancelled, other orders, prior days and pre-booking measurements', () => {
  const booking = {id:'A',slot_id:'S',employee_id:'E',order_id:'O',status:'booked',created_at:'2026-09-16 09:00:00'};
  const store = {appointmentSlots:[{id:'S',date:'2026-09-16',order_id:'O',start_time:'10:00',status:'disabled'}],appointments:[booking, {...booking,status:'cancelled'}],measurements:[]};
  const rows = () => ctx.appointmentRows(store,'2026-09-16','O');
  assert.equal(rows().length,1);
  for (const [order, time] of [['OTHER','2026-09-16 10:00:00'],['O','2026-09-15 10:00:00'],['O','2026-09-16 08:00:00'],['O','invalid']]) {
    store.measurements = [{employee:{employee_id:'E',order_id:order},measured_at:time}];
    assert.equal(rows()[0].measurement,undefined);
  }
  store.measurements = [{employee:{employee_id:'E',order_id:'O'},measured_at:'2026-09-16T01:30:00Z'}];
  assert.ok(rows()[0].measurement);
  assert.equal(ctx.appointmentRows(store,'2026-09-17','O').length,0);
  assert.equal(ctx.appointmentRows(store,'2026-09-16','OTHER').length,0);
  booking.created_at = '2026-09-16 11:00:00';
  assert.equal(rows()[0].measurement,undefined);
});

test('upcoming appointments include valid bookings from today onward in date and time order', () => {
  const slot = (id, order_id, date, start_time) => ({id, order_id, date, start_time});
  const booking = (slot_id, order_id, status = 'booked') => ({slot_id, order_id, status});
  const store = {
    appointmentSlots: [
      slot('FUTURE', 'A', '2026-11-28', '10:00'), slot('SHARED', 'A', '2026-11-26', '15:00'),
      slot('PAST', 'A', '2026-11-25', '09:00'), slot('CANCELLED', 'A', '2026-11-26', '09:00'),
      slot('SHARED', 'B', '2026-11-26', '14:00'),
    ],
    appointments: [
      booking('FUTURE', 'A'), booking('SHARED', 'A'), booking('PAST', 'A'), booking('CANCELLED', 'A', 'cancelled'),
      booking('SHARED', 'B'), booking('FUTURE', 'B'),
    ],
  };
  const keys = orderId => Array.from(ctx.upcomingAppointments(store, orderId, '2026-11-26'),
    ({slot}) => [slot.order_id, slot.id]);
  assert.deepEqual(keys('A'), [['A', 'SHARED'], ['A', 'FUTURE']]);
  assert.deepEqual(keys(''), [['B', 'SHARED'], ['A', 'SHARED'], ['A', 'FUTURE']]);
});

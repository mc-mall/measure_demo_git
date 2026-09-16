/* Shared local prototype data and workflow rules. */
window.MeasureWorkflow = (() => {
const key = "mc-measure-admin-prototype-state";
const forward = ["服裝確認", "預約量身", "完成量身", "已下單到工廠", "工廠交付，待派送", "已交付"];
const after = ["提交售後", "門市收貨", "已下單到工廠", "工廠交付，待派送", "完成派送"];
function seedDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function seedStore() {
  return {
    afterSaleStatusVersion: 2,
    tailors: [{ id: "T001", name: "張師傅", username: "tailor-demo", has_password: true }],
    orders: [{
      id: "O001",
      order_id: "ORDER001",
      company_name: "澳設集團 2026 制服",
      garments: [
        { id: "G001", gender: "男", name: "襯衫", default_quantity: 2, quantity_editable: true },
        { id: "G002", gender: "男", name: "西褲", default_quantity: 2, quantity_editable: true },
        { id: "G003", gender: "女", name: "襯衫", default_quantity: 2, quantity_editable: true },
        { id: "G004", gender: "女", name: "半裙", default_quantity: 2, quantity_editable: true },
        { id: "G005", gender: "男", name: "毛衣", default_quantity: 2, quantity_editable: true },
        { id: "G006", gender: "女", name: "連衣裙", default_quantity: 2, quantity_editable: true },
        { id: "G007", gender: "女", name: "西褲", default_quantity: 2, quantity_editable: true },
      ],
      quantity_rules: [
        { id: "R001", gender: "女", garment_ids: ["G006", "G007"], operator: "lte", quantity: 4 },
        { id: "R002", gender: "男", garment_ids: ["G001", "G005"], operator: "eq", quantity: 4 },
      ],
    }],
    employees: [
      { id: "E001", employee_id: "EMP001", name: "陳嘉儀", gender: "女", height_cm: "166", weight_kg: "54.5", unit_name: "澳門分部", order_id: "ORDER001" },
      { id: "E002", employee_id: "EMP002", name: "李國輝", gender: "男", height_cm: "176", weight_kg: "72", unit_name: "香港分部", order_id: "ORDER001" },
    ],
    measurements: [],
    subaccounts: [],
    appointmentSlots: [
      { id: "APS001", order_id: "ORDER001", address: "澳門門店 2 樓量體區", date: seedDate(3), start_time: "10:00", end_time: "12:00", max_bookings: 6, allow_overbook: false, status: "enabled" },
      { id: "APS002", order_id: "ORDER001", address: "澳門門店 2 樓量體區", date: seedDate(3), start_time: "14:00", end_time: "17:00", max_bookings: 8, allow_overbook: true, status: "enabled" },
    ],
    appointments: [
      { id: "APB001", slot_id: "APS001", employee_id: "EMP001", employee_name: "陳嘉儀", employee_unit: "澳門分部", order_id: "ORDER001", status: "booked", created_at: new Date().toLocaleString("sv-SE") },
    ],
    afterSales: [
      {
        id: "AS20260809001",
        employee_id: "EMP001",
        employee_name: "陳嘉儀",
        employee_gender: "女",
        employee_unit: "澳門分部",
        order_id: "ORDER001",
        items: [{ garment_id: "G003", garment_name: "襯衫", quantity: 1, demand: "換大一碼，保留原款式" }],
        remark: "預計週末攜帶服裝到門市退還。",
        status: "已登記",
        created_at: "2026-08-09 10:20:00",
        updated_at: "2026-08-09 10:20:00",
        status_history: [{ status: "已登記", changed_at: "2026-08-09 10:20:00" }],
      },
      {
        id: "AS20260808001",
        employee_id: "EMP002",
        employee_name: "李國輝",
        employee_gender: "男",
        employee_unit: "香港分部",
        order_id: "ORDER001",
        items: [{ garment_id: "G002", garment_name: "西褲", quantity: 1, demand: "褲長縮短 2cm" }],
        remark: "修改尺寸已與員工確認。",
        status: "已處理",
        created_at: "2026-08-08 14:35:00",
        updated_at: "2026-08-09 09:15:00",
        status_history: [{ status: "已登記", changed_at: "2026-08-08 14:35:00" }, { status: "已處理", changed_at: "2026-08-09 09:15:00" }],
      },
    ],
  };
}


function normalize(store) {
  if (store.workflowVersion === 1) return store;
  const oldVersion = store.afterSaleStatusVersion;
  const map = { "已登記": after[0], "已處理": after[1], "已發回": after[4], "已完成": oldVersion === 2 ? after[4] : after[1] };
  store.afterSales = (store.afterSales || []).map(record => ({...record,
    legacy_status: record.legacy_status || record.status,
    status: map[record.status] || record.status,
    status_history: (record.status_history || []).map(item => ({...item, status: map[item.status] || item.status})),
  }));
  store.afterSaleStatusVersion = 2;
  store.workflowVersion = 1;
  return store;
}
function read() {
  const raw = localStorage.getItem(key);
  const store = normalize(raw ? JSON.parse(raw) : seedStore());
  if (!raw || JSON.stringify(store) !== raw) localStorage.setItem(key, JSON.stringify(store));
  return store;
}
function progress(store, employee) {
  const matches = item => item.employee_id === employee.employee_id && item.order_id === employee.order_id;
  let completed = employee.verification_status === "verified" ? 1 : 0;
  if (!completed && !employee.order_progress) return 0;
  if ((store.appointments || []).some(item => matches(item) && item.status === "booked")) completed = Math.max(completed, 2);
  if ((store.measurements || []).some(item => matches(item.employee || {}))) completed = 3;
  return Math.max(completed, Number(employee.order_progress) || 0);
}
function garments(store, employee) {
  const confirmed = employee.signature_confirmation?.selectedSkuList;
  if (confirmed?.length) return confirmed.map(item => ({id: item.skuId, name: item.skuName || item.skuType, quantity: Number(item.quantity)}));
  const order = store.orders.find(item => item.order_id === employee.order_id);
  return (order?.garments || []).filter(item => item.gender === employee.gender).map(item => ({id: item.id || item.name, name: item.name, quantity: Number(item.default_quantity) || 1}));
}
function receiptBatches(record) { return Array.isArray(record.receipts) ? record.receipts : record.receipt ? [record.receipt] : []; }
function remainingQuantity(record, item) { return item.closed ? 0 : Math.max(0, Number(item.quantity) - (receivedQuantity(record, item) || 0)); }
function readyForFactory(record) { const active = record.items.filter(item => !item.closed); return active.length > 0 && active.every(item => remainingQuantity(record, item) === 0); }
function receivedQuantity(record, item) {
  if (Array.isArray(record.receipts)) {
    return record.receipts.reduce((sum, batch) => sum + (batch.items || []).filter(entry => item.garment_id ? entry.garment_id === item.garment_id : entry.garment_name === item.garment_name).reduce((n, entry) => n + (Number(entry.quantity) || 0), 0), 0);
  }
  const received = record.receipt?.items?.find(entry => item.garment_id ? entry.garment_id === item.garment_id : entry.garment_name === item.garment_name);
  return received && Number.isInteger(received.quantity) && received.quantity >= 0 ? received.quantity : null;
}
function receivedLabel(record, item) {
  const quantity = receivedQuantity(record, item);
  return quantity !== null ? `${quantity} 件` : record.status === after[0] && !record.receipt ? "待簽收" : "未記錄";
}
return {key, forward, after, read, normalize, progress, garments, seedStore, receivedQuantity, receivedLabel, receiptBatches, remainingQuantity, readyForFactory};
})();
MeasureWorkflow.read();

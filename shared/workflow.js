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
    qcs: [
      { id: "QC001", name: "王質檢", username: "qc-demo" },
      { id: "QC002", name: "陳質檢", username: "qc-hk" },
    ],
    departments: ["深圳總部", "澳門分部", "香港分部"],
    orders: [{
      id: "O001",
      order_id: "ORDER001",
      company_name: "澳設集團 2026 制服",
      registration_token: "REG-ORDER001-7F4A",
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
    roles: [
      {
        id: "ROLE_OPERATOR",
        name: "量體運營",
        status: "enabled",
        permissions: ["dashboard_view", "employee_view", "record_view_male", "record_view_female", "measurement_followup"],
        updated_at: "",
      },
      {
        id: "ROLE_AFTER_SALES",
        name: "售後運營",
        status: "enabled",
        permissions: ["dashboard_view", "employee_view", "after_sales", "alteration_view", "alteration_process", "alteration_anomaly", "alteration_export"],
        updated_at: "",
      },
    ],
    subaccounts: [],
    appointmentSlots: [
      { id: "APS001", order_id: "ORDER001", address: "澳門門店 2 樓量體區", date: seedDate(3), start_time: "10:00", end_time: "12:00", max_bookings: 6, allow_overbook: false, status: "enabled" },
      { id: "APS002", order_id: "ORDER001", address: "澳門門店 2 樓量體區", date: seedDate(3), start_time: "14:00", end_time: "17:00", max_bookings: 8, allow_overbook: true, status: "enabled" },
    ],
    appointments: [
      { id: "APB001", slot_id: "APS001", employee_id: "EMP001", employee_name: "陳嘉儀", employee_unit: "澳門分部", order_id: "ORDER001", status: "booked", created_at: new Date().toLocaleString("sv-SE") },
    ],
    alterationTasks: [
      {
        id: "ALT20261028001", employee_id: "EMP002", employee_name: "李國輝", employee_gender: "男", employee_unit: "香港分部", order_id: "ORDER001", store_name: "香港門市", type: "普通改衣", status: "待分配", location: "香港門市", tailor_org: "", tailor_name: "", requires_fee: false, fee_amount: "", paid: false, created_by: "demo", created_at: "2026-10-28 09:20:00", updated_at: "2026-10-28 09:20:00",
        items: [{ id: "ALT20261028001-01", barcode: "ALT-20261028-001-01", sku_id: "G002", garment_name: "西褲", quantity: 1, alteration: "褲長縮短 2cm", status: "待分配", location: "香港門市", completed: false, anomaly: false }],
        handovers: [{ id: "HOV20261028001", type: "門市收衣", from: "李國輝", to: "香港門市", operator: "demo", handover_at: "2026-10-28 09:20:00", location: "香港門市", expected_quantity: 1, actual_quantity: 1, barcodes: ["ALT-20261028-001-01"], remark: "現場清點完成" }], anomalies: [], history: [{ action: "建立改衣任務", operator: "demo", at: "2026-10-28 09:20:00" }],
      },
      {
        id: "ALT20261027001", employee_id: "EMP001", employee_name: "陳嘉儀", employee_gender: "女", employee_unit: "澳門分部", order_id: "ORDER001", store_name: "澳門門市", type: "收費改衣", status: "改衣中", location: "澳門加工點", tailor_org: "第三方加工廠", tailor_name: "林師傅", requires_fee: true, fee_amount: "80", paid: true, paid_by: "store-operator", paid_at: "2026-10-27 15:10:00", created_by: "store-operator", created_at: "2026-10-27 14:40:00", updated_at: "2026-10-27 16:00:00",
        items: [{ id: "ALT20261027001-01", barcode: "ALT-20261027-001-01", sku_id: "G004", garment_name: "半裙", quantity: 1, alteration: "腰圍收窄 1cm", status: "改衣中", location: "澳門加工點", completed: false, anomaly: false }],
        handovers: [{ id: "HOV20261027001", type: "門市收衣", from: "陳嘉儀", to: "澳門門市", operator: "store-operator", handover_at: "2026-10-27 14:40:00", location: "澳門門市", expected_quantity: 1, actual_quantity: 1, barcodes: ["ALT-20261027-001-01"], remark: "現場收衣" }, { id: "HOV20261027002", type: "交給師傅", from: "澳門門市", to: "林師傅", operator: "store-operator", handover_at: "2026-10-27 16:00:00", location: "澳門門市", expected_quantity: 1, actual_quantity: 1, barcodes: ["ALT-20261027-001-01"], remark: "師傅掃碼確認收貨" }], anomalies: [], history: [{ action: "建立改衣任務", operator: "store-operator", at: "2026-10-27 14:40:00" }, { action: "師傅確認收貨", operator: "store-operator", at: "2026-10-27 16:00:00" }],
      },
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
  store.departments = Array.from(new Set((Array.isArray(store.departments) ? store.departments : ["深圳總部", "澳門分部", "香港分部"]).map(item => String(item || "").trim()).filter(Boolean)));
  store.orders = (store.orders || []).map(order => ({ ...order, registration_token: order.registration_token || registrationToken(order.order_id) }));
  const defaultRoles = seedStore().roles;
  store.roles = Array.isArray(store.roles) && store.roles.length ? store.roles : defaultRoles;
  store.roles = store.roles.map(role => ({
    ...role,
    id: role.id || `ROLE_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: String(role.name || "未命名角色").trim(),
    status: role.status === "disabled" ? "disabled" : "enabled",
    permissions: [...new Set([...(Array.isArray(role.permissions) ? role.permissions : []), ...(role.id === "ROLE_AFTER_SALES" ? ["alteration_view", "alteration_process", "alteration_anomaly", "alteration_export"] : [])])],
    updated_at: role.updated_at || "",
  }));
  store.subaccounts = (store.subaccounts || []).map(account => {
    const roleIds = Array.isArray(account.role_ids)
      ? [...new Set(account.role_ids.filter(Boolean))]
      : (account.role_id ? [account.role_id] : []);
    return { ...account, role_ids: roleIds, role_id: roleIds[0] || "" };
  });
  const defaultQcs = seedStore().qcs;
  store.qcs = Array.isArray(store.qcs) && store.qcs.length
    ? store.qcs.map(qc => ({ ...qc, id: qc.id || `QC_${Math.random().toString(36).slice(2, 8).toUpperCase()}`, name: String(qc.name || "未命名QC").trim(), username: String(qc.username || "").trim() }))
    : defaultQcs;
  const alterationStatusMap = { "已分配待師傅收貨": "改衣中", "師傅已交回": "门市质检", "門市驗收": "门市质检", "门市验收": "门市质检" };
  store.alterationTasks = (store.alterationTasks || []).map(task => {
    const status = alterationStatusMap[task.status] || task.status || "門市已收衣";
    return {
      ...task,
      items: (Array.isArray(task.items) ? task.items : []).map(item => ({ ...item, status: alterationStatusMap[item.status] || item.status || status })),
      handovers: Array.isArray(task.handovers) ? task.handovers : [],
      anomalies: Array.isArray(task.anomalies) ? task.anomalies : [],
      history: Array.isArray(task.history) ? task.history : [],
      type: task.type === "员工中止后重新发起" ? "普通改衣" : (task.type || "普通改衣"),
      status,
      qc_id: task.qc_id || "",
      qc_name: task.qc_name || "",
      location: task.location || task.store_name || "未記錄",
    };
  });
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
function registrationToken(orderId) {
  let hash = 2166136261;
  for (const char of String(orderId || "")) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `REG-${String(orderId || "ORDER").replace(/[^A-Z0-9]+/gi, "-").toUpperCase()}-${(hash >>> 0).toString(16).toUpperCase().slice(-8)}`;
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
function validDeliveryDate(value) {
  if (typeof value !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
return {validDeliveryDate, key, forward, after, read, normalize, progress, garments, seedStore, registrationToken, receivedQuantity, receivedLabel, receiptBatches, remainingQuantity, readyForFactory};
})();
MeasureWorkflow.read();

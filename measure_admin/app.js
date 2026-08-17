const adminStoreKey = "mc-measure-admin-prototype-state";
const adminSessionKey = "mc-measure-admin-prototype-session";
const views = [...document.querySelectorAll(".view")];
const navButtons = [...document.querySelectorAll(".nav button")];
const toast = document.getElementById("toast");
const remoteMode = false;
let storeCache = seedStore();
const recordPagination = {
  男: { page: 1, pageSize: 15 },
  女: { page: 1, pageSize: 15 },
};
const employeePagination = { page: 1, pageSize: 15 };
const afterSalePagination = { page: 1, pageSize: 15 };
const orderEditorState = { step: 1, garments: [], quantityRules: [] };
const signatureDetailState = { orderId: "", page: 1, pageSize: 15 };
const afterSaleFormState = { employeeId: "" };
let currentUser = readSessionUser();

const measurementLabels = {
  shirt_collar: "上衣領圍（襯衫）",
  suit_chest_body: "上衣胸圍（淨體）",
  suit_size: "上衣尺碼",
  suit_fit: "上衣版型",
  suit_body_notes: "上衣特體",
  suit_belly: "上衣肚圍（淨體）",
  suit_shoulder: "上衣肩寬",
  suit_chest_garment: "上衣胸圍（成衣）",
  suit_mid_waist_garment: "上衣中腰（成衣）",
  suit_sleeve_length: "上衣袖長（外套）",
  suit_inner_sleeve_length: "上衣袖長（內上衣）",
  suit_sleeve_width: "上衣袖肥",
  suit_back_center_length: "上衣後中長（外套）",
  suit_inner_back_center_length: "上衣後中長（內上衣）",
  pants_waist: "褲子腰圍",
  pants_size: "褲子尺碼",
  pants_fit: "褲子習慣",
  pants_body_notes: "褲子特體",
  pants_hip_body: "褲子臀圍（淨體）",
  pants_crotch_body: "褲子橫檔（淨體）",
  pants_calf: "褲子小腿圍（淨體）",
  pants_leg_opening: "褲子腳口（成衣）",
  pants_length: "褲長",
  pants_total_rise: "褲子總浪",
  pants_waist_garment: "褲子腰圍（成衣）",
  pants_hip_garment: "褲子臀圍（成衣）",
  pants_crotch_garment: "褲子橫檔（成衣）",
  pants_total_rise_garment: "褲子總浪（成衣）",
  pants_mid: "褲子中檔（成衣）",
  pants_leg_opening_garment: "褲子腳口（成衣）",
  pants_length_garment: "褲長（成衣）",
  skirt_length: "一步裙裙長",
  dress_front_length: "連衣裙裙長（前長）",
  tie_length: "領帶",
  sweater_size: "毛衣尺碼",
};

const analysisGarments = {
  suit: {
    label: "上衣",
    fields: ["shirt_collar", "suit_chest_body", "suit_belly", "suit_shoulder", "suit_chest_garment", "suit_mid_waist_garment", "suit_sleeve_length", "suit_inner_sleeve_length", "suit_sleeve_width", "suit_back_center_length", "suit_inner_back_center_length"],
  },
  pants: {
    label: "褲子",
    fields: ["pants_waist", "pants_hip_body", "pants_crotch_body", "pants_calf", "pants_leg_opening", "pants_length", "pants_total_rise", "pants_waist_garment", "pants_hip_garment", "pants_crotch_garment", "pants_total_rise_garment", "pants_mid", "pants_leg_opening_garment", "pants_length_garment"],
  },
  skirt: { label: "一步裙", fields: ["skirt_length"] },
  dress: { label: "連衣裙", fields: ["dress_front_length"] },
};

const comparisonState = { step: 1, garmentSignature: "", results: [], stats: null, config: null };

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
      { id: "APB001", slot_id: "APS001", employee_id: "EMP001", employee_name: "陳嘉儀", employee_unit: "澳門分部", order_id: "ORDER001", status: "booked", created_at: nowText() },
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
        remark: "員工已將服裝交回門店。",
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

function ownerSession(username = "主賬號") {
  return { id: "owner", name: "系統管理員", username, role: "owner", permissions: ["employee_view", "measurement_followup", "record_export"] };
}

function readSessionUser() {
  const raw = localStorage.getItem(adminSessionKey);
  if (!raw) return null;
  if (raw === "1") return ownerSession();
  try {
    const value = JSON.parse(raw);
    return value?.username ? value : null;
  } catch {
    return null;
  }
}

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isOwner() {
  return currentUser?.role === "owner";
}

function hasPermission(permission) {
  return isOwner() || Boolean(currentUser?.permissions?.includes(permission));
}

function accessibleOrders(store = loadStore()) {
  return store.orders;
}

function accessibleEmployees(store = loadStore()) {
  const allowed = new Set(accessibleOrders(store).map((order) => order.order_id));
  return store.employees.filter((employee) => allowed.has(employee.order_id));
}

function accessibleMeasurements(store = loadStore()) {
  const allowed = new Set(accessibleOrders(store).map((order) => order.order_id));
  return store.measurements.filter((record) => allowed.has(record.employee?.order_id));
}

function loadStore() {
  if (remoteMode) return storeCache;
  const raw = localStorage.getItem(adminStoreKey);
  if (!raw) {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }
  try {
    const loaded = { ...seedStore(), ...JSON.parse(raw) };
    let changed = false;
    if (loaded.afterSaleStatusVersion !== 2) {
      loaded.afterSales = (loaded.afterSales || []).map((record) => ({
        ...record,
        status: record.status === "已完成" ? "已處理" : record.status === "已發回" ? "已完成" : record.status,
        status_history: (record.status_history || []).map((entry) => ({
          ...entry,
          status: entry.status === "已完成" ? "已處理" : entry.status === "已發回" ? "已完成" : entry.status,
        })),
      }));
      loaded.afterSaleStatusVersion = 2;
      changed = true;
    }
    const fallbackOrderId = loaded.orders?.length === 1 ? loaded.orders[0].order_id : "";
    loaded.appointmentSlots = (loaded.appointmentSlots || []).map((slot) => {
      if (slot.order_id || !fallbackOrderId) return slot;
      changed = true;
      return { ...slot, order_id: fallbackOrderId };
    });
    if (changed) saveStore(loaded);
    return loaded;
  } catch {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }
}

function saveStore(store) {
  storeCache = store;
  if (remoteMode) {
    fetch("/api/admin/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    }).catch(() => showToast("保存到服務器失敗，請確認本機服務仍在運行。"));
    return;
  }
  localStorage.setItem(adminStoreKey, JSON.stringify(store));
}

async function syncFromServer() {
  if (!remoteMode) return;
  const res = await fetch("/api/admin/state");
  if (!res.ok) throw new Error("讀取服務器資料失敗");
  storeCache = await res.json();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function switchView(name) {
  const targetButton = navButtons.find((button) => button.dataset.view === name);
  if (!targetButton || targetButton.hidden) name = isOwner() ? "dashboard" : (hasPermission("employee_view") ? "employees" : "records-male");
  views.forEach((view) => view.classList.toggle("is-active", view.id === `view-${name}`));
  navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === name));
  document.getElementById("view-title").textContent = navButtons.find((button) => button.dataset.view === name)?.textContent || "總覽";
}

function applyAccessPolicy() {
  document.querySelectorAll("[data-owner-only]").forEach((element) => { element.hidden = !isOwner(); });
  document.querySelector('[data-view="employees"]').hidden = !hasPermission("employee_view");
  document.querySelectorAll("[data-export-records]").forEach((button) => { button.hidden = !hasPermission("record_export"); });
  const userBox = document.getElementById("current-user");
  userBox.hidden = !currentUser;
  document.getElementById("current-user-name").textContent = currentUser?.name || currentUser?.username || "";
  document.getElementById("current-user-role").textContent = isOwner() ? "主賬號 · 全部權限" : "子賬號 · 運營跟進";
  const active = navButtons.find((button) => button.classList.contains("is-active"));
  if (active?.hidden) switchView(hasPermission("employee_view") ? "employees" : "records-male");
}

function orderLabel(orderId) {
  const order = loadStore().orders.find((item) => item.order_id === orderId);
  return order ? `${order.order_id} / ${order.company_name}` : orderId;
}

function renderTable(targetId, headers, rows, emptyText = "暫無資料") {
  const target = document.getElementById(targetId);
  if (!rows.length) {
    target.innerHTML = `<thead><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody><tr><td colspan="${headers.length}">${emptyText}</td></tr></tbody>`;
    return;
  }
  target.innerHTML = `<thead><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>`;
}

function renderOrderSelect() {
  const selects = [document.getElementById("employee-order-select"), document.getElementById("import-order-select"), document.getElementById("appointment-order-select")].filter(Boolean);
  const store = loadStore();
  const orders = accessibleOrders(store);
  const options = orders.map((order) => `<option value="${order.order_id}">${order.order_id} / ${order.company_name}</option>`).join("");
  selects.forEach((select) => {
    select.innerHTML = options;
  });
  document.querySelectorAll(".export-order-select").forEach((exportSelect) => {
    const current = exportSelect.value;
    exportSelect.innerHTML = `<option value="">全部訂單</option>${options}`;
    exportSelect.value = orders.some((order) => order.order_id === current) ? current : "";
  });
  const employeeFilterOrder = document.getElementById("employee-filter-order");
  if (employeeFilterOrder) {
    const current = employeeFilterOrder.value;
    employeeFilterOrder.innerHTML = `<option value="">全部訂單</option>${options}`;
    employeeFilterOrder.value = orders.some((order) => order.order_id === current) ? current : "";
  }
}

function renderMetrics() {
  const store = loadStore();
  document.getElementById("metric-tailors").textContent = isOwner() ? store.tailors.length : "—";
  document.getElementById("metric-orders").textContent = accessibleOrders(store).length;
  document.getElementById("metric-employees").textContent = accessibleEmployees(store).length;
  document.getElementById("metric-records").textContent = accessibleMeasurements(store).length;
}

function renderTailors() {
  const rows = loadStore().tailors.map((item) => `
    <tr>
      <td>${item.name}</td><td>${item.username}</td><td>${item.has_password ? "已設置" : "未設置"}</td>
      <td><div class="row-actions"><button type="button" data-edit-tailor="${item.id}">編輯</button><button class="danger" type="button" data-delete-tailor="${item.id}">刪除</button></div></td>
    </tr>
  `);
  renderTable("tailor-table", ["姓名", "登入賬號", "密碼狀態", "操作"], rows);
}

function renderOrders() {
  const rows = loadStore().orders.map((item) => `
    <tr>
      <td>${escapeHtml(item.order_id)}</td><td>${escapeHtml(item.company_name)}</td>
      <td>${garmentSummary(item, "男")}</td><td>${garmentSummary(item, "女")}</td><td>${quantityRuleSummary(item)}</td>
      <td><div class="row-actions"><button type="button" data-open-signatures="${escapeHtml(item.order_id)}">簽字明細</button><button type="button" data-edit-order="${item.id}">編輯</button><button class="danger" type="button" data-delete-order="${item.id}">刪除</button></div></td>
    </tr>
  `);
  renderTable("order-table", ["訂單號", "公司名", "男士服裝配置", "女士服裝配置", "組合數量限制", "操作"], rows);
}

function employeeIsVerified(employee) {
  return employee.verification_status === "verified" && employee.signature_confirmation?.confirmStatus === "confirmed";
}

function confirmedQuantityItems(employee) {
  if (!employeeIsVerified(employee)) return [];
  const selectedSkuList = employee.signature_confirmation?.selectedSkuList;
  if (!Array.isArray(selectedSkuList)) return [];
  return selectedSkuList.map((item) => ({
    name: String(item.skuName || item.skuType || item.skuId || "服裝"),
    quantity: Number(item.quantity) || 0,
  })).filter((item) => item.quantity > 0);
}

function confirmedQuantitySummary(employee, html = false) {
  const items = confirmedQuantityItems(employee);
  if (!items.length) return employeeIsVerified(employee) ? "未選擇服裝" : "尚未確認";
  if (!html) return items.map((item) => `${item.name} × ${item.quantity}`).join("；");
  return `<div class="confirmed-quantity-list">${items.map((item) => `<span>${escapeHtml(item.name)} × ${item.quantity}</span>`).join("")}</div>`;
}

function filteredSignatureEmployees() {
  const name = document.getElementById("signature-filter-name").value.trim().toLowerCase();
  const employeeId = document.getElementById("signature-filter-employee").value.trim().toLowerCase();
  return loadStore().employees.filter((item) => {
    if (item.order_id !== signatureDetailState.orderId) return false;
    if (name && !String(item.name || "").toLowerCase().includes(name)) return false;
    if (employeeId && !String(item.employee_id || "").toLowerCase().includes(employeeId)) return false;
    return true;
  });
}

function renderSignatureDetails() {
  if (!signatureDetailState.orderId) return;
  const order = loadStore().orders.find((item) => item.order_id === signatureDetailState.orderId);
  const employees = filteredSignatureEmployees();
  const totalPages = Math.max(1, Math.ceil(employees.length / signatureDetailState.pageSize));
  signatureDetailState.page = Math.min(signatureDetailState.page, totalPages);
  const start = (signatureDetailState.page - 1) * signatureDetailState.pageSize;
  const rows = employees.slice(start, start + signatureDetailState.pageSize).map((item) => {
    const verified = employeeIsVerified(item);
    return `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.employee_id)}</td><td>${confirmedQuantitySummary(item, true)}</td><td><span class="status-badge ${verified ? "verified" : "unverified"}">${verified ? "已驗證" : "未驗證"}</span></td><td>${verified ? `<button class="danger" type="button" data-revoke-signature="${item.id}">撤銷驗證</button>` : "-"}</td></tr>`;
  });
  document.getElementById("signature-order-subtitle").textContent = order ? `${order.order_id} / ${order.company_name}｜共 ${employees.length} 名員工` : signatureDetailState.orderId;
  renderTable("signature-table", ["客戶姓名", "員工編號", "確認數量", "驗證狀態", "操作"], rows, "暫無員工明細");
  document.getElementById("signature-pagination").innerHTML = `<span>共 ${employees.length} 條，第 ${signatureDetailState.page} / ${totalPages} 頁，每頁最多 15 條</span><div><button class="secondary" type="button" data-signature-page="prev" ${signatureDetailState.page <= 1 ? "disabled" : ""}>上一頁</button><button class="secondary" type="button" data-signature-page="next" ${signatureDetailState.page >= totalPages ? "disabled" : ""}>下一頁</button></div>`;
}

function openSignatureDetails(orderId) {
  signatureDetailState.orderId = orderId;
  signatureDetailState.page = 1;
  document.getElementById("signature-filter-name").value = "";
  document.getElementById("signature-filter-employee").value = "";
  renderSignatureDetails();
  switchView("signatures");
  document.getElementById("view-title").textContent = "簽字明細";
}

function exportSignatureDetails() {
  const rows = filteredSignatureEmployees();
  const lines = [
    ["訂單號", "公司名", "客戶姓名", "員工編號", "確認數量", "驗證狀態", "簽字時間"].map(csvEscape).join(","),
    ...rows.map((item) => [signatureDetailState.orderId, orderLabel(signatureDetailState.orderId).split(" / ")[1] || "", item.name, item.employee_id, confirmedQuantitySummary(item), employeeIsVerified(item) ? "已驗證" : "未驗證", item.signature_confirmation?.signedAt || ""].map(csvEscape).join(",")),
  ];
  downloadCsvBlob(new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), `${signatureDetailState.orderId}_簽字明細.csv`);
}

function garmentSummary(order, gender) {
  const garments = Array.isArray(order.garments) ? order.garments.filter((item) => item.gender === gender) : [];
  if (!garments.length) return "未配置";
  return garments.map((item) => `${escapeHtml(item.name)} × ${Number(item.default_quantity) || 1}${item.quantity_editable ? "（可改）" : "（固定）"}`).join("<br>");
}

function quantityRuleSummary(order) {
  const rules = Array.isArray(order.quantity_rules) ? order.quantity_rules : [];
  if (!rules.length) return "無限制";
  const garments = Array.isArray(order.garments) ? order.garments : [];
  return rules.map((rule) => {
    const garmentIds = Array.isArray(rule.garment_ids) ? rule.garment_ids : [];
    const names = garmentIds.map((id) => garments.find((item) => item.id === id)?.name).filter(Boolean);
    return `${rule.gender}士：${names.map(escapeHtml).join(" + ")}，合計${rule.operator === "eq" ? "剛好" : "不多於"} ${Number(rule.quantity) || 1} 件`;
  }).join("<br>");
}

function renderEmployees() {
  const employeeId = document.getElementById("employee-filter-id").value.trim().toLowerCase();
  const employeeName = document.getElementById("employee-filter-name").value.trim().toLowerCase();
  const orderId = document.getElementById("employee-filter-order").value;
  const employees = accessibleEmployees().filter((item) => {
    if (employeeId && !String(item.employee_id || "").toLowerCase().includes(employeeId)) return false;
    if (employeeName && !String(item.name || "").toLowerCase().includes(employeeName)) return false;
    if (orderId && item.order_id !== orderId) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(employees.length / employeePagination.pageSize));
  employeePagination.page = Math.min(employeePagination.page, totalPages);
  const start = (employeePagination.page - 1) * employeePagination.pageSize;
  const rows = employees.slice(start, start + employeePagination.pageSize).map((item) => `
    <tr>
      <td>${item.employee_id}</td><td>${item.name}</td><td>${item.gender}</td><td>${item.height_cm || "-"}</td><td>${item.weight_kg || "-"}</td><td>${item.unit_name}</td><td>${orderLabel(item.order_id)}</td><td>${employeeRecords(item).length}</td>
      <td><div class="row-actions"><button type="button" data-open-archive="${item.id}">量體檔案</button>${isOwner() ? `<button type="button" data-edit-employee="${item.id}">編輯</button><button class="danger" type="button" data-delete-employee="${item.id}">刪除</button>` : ""}</div></td>
    </tr>
  `);
  renderTable("employee-table", ["員工編號", "姓名", "性別", "身高", "體重", "單位名字", "歸屬訂單 / 公司", "量體版本", "操作"], rows);
  document.getElementById("employee-pagination").innerHTML = `
    <span>共 ${employees.length} 條，第 ${employeePagination.page} / ${totalPages} 頁</span>
    <div>
      <button class="secondary" type="button" data-employee-page="prev" ${employeePagination.page <= 1 ? "disabled" : ""}>上一頁</button>
      <button class="secondary" type="button" data-employee-page="next" ${employeePagination.page >= totalPages ? "disabled" : ""}>下一頁</button>
    </div>`;
}

function employeeRecords(employee) {
  return accessibleMeasurements()
    .filter((record) => !record.archive_removed_at && record.employee?.order_id === employee.order_id && record.employee?.employee_id === employee.employee_id)
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
}

function versionLabel(recordOrVersion) {
  const version = typeof recordOrVersion === "object" ? recordOrVersion?.version : recordOrVersion;
  return version ? `V${Number(version).toFixed(1)}` : "-";
}

function recordStage(record) {
  if (record.stage) return record.stage;
  if (record.source === "import") return "批量導入";
  return Number(record.version || 0) <= 1 ? "原始量體" : "量體提交";
}

function recordDifference(record, records) {
  const previous = records.find((item) => Number(item.version || 0) < Number(record.version || 0));
  if (!previous) return "首個版本";
  const changes = Object.keys(measurementLabels).flatMap((key) => {
    const before = previous.measurements?.[key] ?? "";
    const after = record.measurements?.[key] ?? "";
    if (String(before) === String(after)) return [];
    const beforeNumber = Number(before);
    const afterNumber = Number(after);
    const delta = before !== "" && after !== "" && Number.isFinite(beforeNumber) && Number.isFinite(afterNumber)
      ? `（${afterNumber - beforeNumber > 0 ? "+" : ""}${(afterNumber - beforeNumber).toFixed(1)}）`
      : "";
    return [{ text: `${measurementLabels[key]}：${before || "-"} → ${after || "-"}${delta}`, magnitude: Number.isFinite(beforeNumber) && Number.isFinite(afterNumber) ? Math.abs(afterNumber - beforeNumber) : -1 }];
  }).sort((a, b) => b.magnitude - a.magnitude);
  return changes.length ? changes.map((item) => item.text).join("；") : "無差異";
}

function openArchive(employeeId) {
  const employee = loadStore().employees.find((item) => item.id === employeeId);
  if (!employee) return;
  document.getElementById("archive-title").textContent = `${employee.name} · 量體檔案`;
  document.getElementById("archive-subtitle").textContent = `${employee.employee_id}｜${orderLabel(employee.order_id)}｜共 ${employeeRecords(employee).length} 個版本`;
  const records = employeeRecords(employee);
  const rows = records.map((record) => `<tr><td>${versionLabel(record)}</td><td>${record.created_at || record.measured_at || "-"}</td><td>${recordStage(record)}</td><td>${record.tailor_name || "-"}</td><td>${recordRemark(record) || "-"}</td><td>${followupCell(record)}</td><td>${recordDifference(record, records)}</td><td><div class="row-actions">${hasPermission("measurement_followup") ? `<button type="button" data-followup-record="${record.measurement_id}">跟進</button>` : ""}${isOwner() ? `<button type="button" data-edit-record="${record.measurement_id}">修改</button><button class="danger" type="button" data-delete-record="${record.measurement_id}">刪除檔案版本</button>` : ""}</div></td></tr>`);
  renderTable("archive-table", ["版本", "創建時間", "數據階段", "裁縫師", "備註", "跟進事項", "較上一版差異", "操作"], rows, "該員工暫無量體版本");
  const dialog = document.getElementById("archive-dialog");
  dialog.dataset.employeeId = employeeId;
  if (!dialog.open) dialog.showModal();
}

function openRecordEditor(measurementId) {
  const record = loadStore().measurements.find((item) => item.measurement_id === measurementId);
  if (!record) return;
  const form = document.getElementById("record-edit-form");
  form.elements.measurement_id.value = measurementId;
  form.elements.remark.value = recordRemark(record);
  document.getElementById("record-edit-subtitle").textContent = `${record.employee?.customer_name || "-"}｜${versionLabel(record)}｜${record.created_at || record.measured_at || "-"}`;
  document.getElementById("record-measurement-fields").innerHTML = Object.entries(measurementLabels).map(([key, label]) => `<label><span>${label}</span><input name="${key}" value="${String(record.measurements?.[key] || "").replaceAll('"', '&quot;')}" /></label>`).join("");
  document.getElementById("record-edit-dialog").showModal();
}

function measurementSummary(record) {
  const entries = Object.entries(record.measurements || {});
  if (!entries.length) return "未填寫量體字段";
  return entries.map(([key, value]) => `${measurementLabels[key] || key}: ${value}`).join("；");
}

function recordRemark(record) {
  return record.final_remark || record.remark || "";
}

function followupCell(record) {
  const status = record.followup_status || "未標記";
  const statusClass = status === "已完成" ? "" : (status === "未標記" ? "is-disabled" : "is-pending");
  const details = [record.followup_owner, record.followup_due_date ? `下次：${record.followup_due_date}` : "", record.followup_note].filter(Boolean);
  return `<div class="followup-meta"><span class="status-pill ${statusClass}">${escapeHtml(status)}</span>${details.map((item) => `<small>${escapeHtml(item)}</small>`).join("")}</div>`;
}

function employeeAfterSaleGarments(employee) {
  const order = loadStore().orders.find((item) => item.order_id === employee.order_id);
  return (Array.isArray(order?.garments) ? order.garments : [])
    .filter((item) => item.gender === employee.gender)
    .map((item) => ({ id: item.id || item.name, name: item.name, quantity: Math.max(1, Number(item.default_quantity) || 1) }));
}

function afterSaleItemSummary(record) {
  return (record.items || []).map((item) => `${escapeHtml(item.garment_name)} × ${Number(item.quantity) || 0}`).join("<br>") || "-";
}

function afterSaleDateKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : "";
}

function renderAfterSales() {
  const store = loadStore();
  const keyword = document.getElementById("after-sale-filter-keyword").value.trim().toLowerCase();
  const unit = document.getElementById("after-sale-filter-unit").value.trim().toLowerCase();
  const startDate = document.getElementById("after-sale-filter-start").value;
  const endDate = document.getElementById("after-sale-filter-end").value;
  const status = document.getElementById("after-sale-filter-status").value;
  const records = (store.afterSales || []).filter((record) => {
    const haystack = `${record.id} ${record.employee_id} ${record.employee_name}`.toLowerCase();
    const recordUnit = String(record.employee_unit || "").toLowerCase();
    const recordDate = afterSaleDateKey(record.created_at);
    return (!keyword || haystack.includes(keyword))
      && (!unit || recordUnit.includes(unit))
      && (!startDate || (recordDate && recordDate >= startDate))
      && (!endDate || (recordDate && recordDate <= endDate))
      && (!status || record.status === status);
  }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const totalPages = Math.max(1, Math.ceil(records.length / afterSalePagination.pageSize));
  afterSalePagination.page = Math.min(afterSalePagination.page, totalPages);
  const start = (afterSalePagination.page - 1) * afterSalePagination.pageSize;
  const pageRecords = records.slice(start, start + afterSalePagination.pageSize);
  const selectableCount = pageRecords.filter((record) => record.status !== "已完成").length;
  const rows = pageRecords.map((record) => `
    <tr>
      <td><input class="after-sale-row-check" type="checkbox" value="${escapeHtml(record.id)}" aria-label="選擇 ${escapeHtml(record.id)}" ${record.status === "已完成" ? "disabled" : ""} /></td>
      <td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.created_at)}</td><td>${escapeHtml(record.employee_id)}</td><td>${escapeHtml(record.employee_name)}</td><td>${escapeHtml(orderLabel(record.order_id))}</td><td>${afterSaleItemSummary(record)}</td><td><span class="after-sale-status status-${record.status === "已登記" ? "registered" : record.status === "已處理" ? "processed" : "completed"}">${escapeHtml(record.status)}</span></td><td><button type="button" data-after-sale-detail="${escapeHtml(record.id)}">查看詳情</button></td>
    </tr>`);
  renderTable("after-sale-table", [`<label class="table-check-all"><input id="after-sale-check-page" type="checkbox" aria-label="勾選當前頁" ${selectableCount ? "" : "disabled"} /><span>選擇</span></label>`, "登記編號", "登記時間", "員工編號", "姓名", "訂單 / 公司", "服裝 / 數量", "狀態", "操作"], rows, "暫無退換登記");
  document.getElementById("after-sale-pagination").innerHTML = `
    <span>共 ${records.length} 條，第 ${afterSalePagination.page} / ${totalPages} 頁</span>
    <div><label class="pagination-size"><span>每頁</span><select id="after-sale-page-size"><option value="15" ${afterSalePagination.pageSize === 15 ? "selected" : ""}>15 條/頁</option><option value="50" ${afterSalePagination.pageSize === 50 ? "selected" : ""}>50 條/頁</option><option value="100" ${afterSalePagination.pageSize === 100 ? "selected" : ""}>100 條/頁</option></select></label><button class="secondary" type="button" data-after-sale-page="prev" ${afterSalePagination.page <= 1 ? "disabled" : ""}>上一頁</button><button class="secondary" type="button" data-after-sale-page="next" ${afterSalePagination.page >= totalPages ? "disabled" : ""}>下一頁</button></div>`;
  updateAfterSaleSelection();
}

function updateAfterSaleSelection() {
  const selectable = [...document.querySelectorAll(".after-sale-row-check:not(:disabled)")];
  const count = selectable.filter((input) => input.checked).length;
  const checkPage = document.getElementById("after-sale-check-page");
  if (checkPage) {
    checkPage.checked = selectable.length > 0 && count === selectable.length;
    checkPage.indeterminate = count > 0 && count < selectable.length;
  }
  document.getElementById("after-sale-selected-count").textContent = `已選 ${count} 項`;
}

function resetAfterSaleForm() {
  const form = document.getElementById("after-sale-form");
  form.reset();
  afterSaleFormState.employeeId = "";
  document.getElementById("after-sale-employee-results").innerHTML = "";
  document.getElementById("after-sale-request-section").hidden = true;
  document.getElementById("after-sale-search-error").hidden = true;
  document.getElementById("after-sale-form-error").hidden = true;
  document.getElementById("save-after-sale").disabled = true;
}

function searchAfterSaleEmployee() {
  const query = document.getElementById("after-sale-employee-query").value.trim().toLowerCase();
  const error = document.getElementById("after-sale-search-error");
  if (!query) {
    error.textContent = "請先輸入員工編號。";
    error.hidden = false;
    return;
  }
  error.hidden = true;
  const matches = loadStore().employees.filter((item) => String(item.employee_id).toLowerCase().includes(query));
  document.getElementById("after-sale-employee-results").innerHTML = matches.length ? matches.map((employee) => `
    <button class="after-sale-employee-result" type="button" data-select-after-sale-employee="${escapeHtml(employee.id)}"><strong>${escapeHtml(employee.employee_id)} · ${escapeHtml(employee.name)}</strong><span>${escapeHtml(employee.unit_name)}｜${escapeHtml(orderLabel(employee.order_id))}</span></button>`).join("") : `<p class="garment-empty">未找到匹配員工，請核對員工編號。</p>`;
}

function selectAfterSaleEmployee(employeeId) {
  const employee = loadStore().employees.find((item) => item.id === employeeId);
  if (!employee) return;
  const garments = employeeAfterSaleGarments(employee);
  afterSaleFormState.employeeId = employeeId;
  document.getElementById("after-sale-employee-card").innerHTML = `<div><span>本次登記員工</span><strong>${escapeHtml(employee.employee_id)} · ${escapeHtml(employee.name)}</strong></div><div><span>性別 / 單位</span><strong>${escapeHtml(employee.gender)} / ${escapeHtml(employee.unit_name)}</strong></div><div><span>歸屬訂單</span><strong>${escapeHtml(orderLabel(employee.order_id))}</strong></div>`;
  document.getElementById("after-sale-garment-list").innerHTML = garments.length ? garments.map((garment) => `
    <div class="after-sale-garment-row" data-after-sale-garment="${escapeHtml(garment.id)}" data-garment-name="${escapeHtml(garment.name)}" data-max-quantity="${garment.quantity}">
      <label class="after-sale-garment-check"><input type="checkbox" /><span><strong>${escapeHtml(garment.name)}</strong>可登記數量：${garment.quantity}</span></label>
      <label><span>本次數量</span><input class="after-sale-quantity" type="number" min="1" max="${garment.quantity}" value="1" disabled /></label>
      <label><span>換貨 / 修改需求</span><textarea class="after-sale-demand" rows="2" placeholder="例如：換大一碼；袖長縮短 2cm" disabled></textarea></label>
    </div>`).join("") : `<p class="garment-empty">該員工的訂單尚未配置對應性別的服裝，請先到訂單管理完成配置。</p>`;
  document.getElementById("after-sale-request-section").hidden = false;
  document.getElementById("save-after-sale").disabled = !garments.length;
}

function saveAfterSale(event) {
  event.preventDefault();
  const employee = loadStore().employees.find((item) => item.id === afterSaleFormState.employeeId);
  const error = document.getElementById("after-sale-form-error");
  if (!employee) {
    error.textContent = "請先搜尋並選擇員工。";
    error.hidden = false;
    return;
  }
  const items = [...document.querySelectorAll("[data-after-sale-garment]")].flatMap((row) => {
    if (!row.querySelector('input[type="checkbox"]').checked) return [];
    return [{ garment_id: row.dataset.afterSaleGarment, garment_name: row.dataset.garmentName, quantity: Number(row.querySelector(".after-sale-quantity").value), demand: row.querySelector(".after-sale-demand").value.trim(), max_quantity: Number(row.dataset.maxQuantity) }];
  });
  if (!items.length) {
    error.textContent = "請至少勾選一件服裝。";
    error.hidden = false;
    return;
  }
  const invalid = items.find((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > item.max_quantity || !item.demand);
  if (invalid) {
    error.textContent = `${invalid.garment_name}：請填寫有效數量及具體換貨 / 修改需求。`;
    error.hidden = false;
    return;
  }
  const store = loadStore();
  const createdAt = nowText();
  store.afterSales ||= [];
  store.afterSales.push({ id: uid("AS"), employee_id: employee.employee_id, employee_name: employee.name, employee_gender: employee.gender, employee_unit: employee.unit_name, order_id: employee.order_id, items: items.map(({ max_quantity, ...item }) => item), remark: new FormData(event.currentTarget).get("remark")?.trim() || "", status: "已登記", created_at: createdAt, updated_at: createdAt, status_history: [{ status: "已登記", changed_at: createdAt }] });
  saveStore(store);
  document.getElementById("after-sale-create-dialog").close();
  resetAfterSaleForm();
  renderAfterSales();
  showToast("售後需求已保存，狀態為已登記。二次修改請重新登記。");
}

function openAfterSaleDetail(recordId) {
  const record = (loadStore().afterSales || []).find((item) => item.id === recordId);
  if (!record) return;
  document.getElementById("after-sale-detail-title").textContent = `售後詳情 · ${record.id}`;
  document.getElementById("after-sale-detail-subtitle").textContent = `${record.employee_id} · ${record.employee_name}｜${orderLabel(record.order_id)}`;
  document.getElementById("after-sale-detail-content").innerHTML = `
    <div class="after-sale-detail-meta"><div><span>狀態</span><strong>${escapeHtml(record.status)}</strong></div><div><span>登記時間</span><strong>${escapeHtml(record.created_at)}</strong></div><div><span>最後更新</span><strong>${escapeHtml(record.updated_at || record.created_at)}</strong></div></div>
    <div class="table-wrap"><table><thead><tr><th>服裝</th><th>數量</th><th>換貨 / 修改需求</th></tr></thead><tbody>${(record.items || []).map((item) => `<tr><td>${escapeHtml(item.garment_name)}</td><td>${Number(item.quantity) || 0}</td><td class="wrap-cell">${escapeHtml(item.demand)}</td></tr>`).join("")}</tbody></table></div>
    <p class="after-sale-detail-remark"><strong>補充說明：</strong>${escapeHtml(record.remark || "-")}</p>
    <div class="after-sale-history"><h4>狀態記錄</h4>${(record.status_history || []).map((item) => `<p><span>${escapeHtml(item.changed_at)}</span><strong>${escapeHtml(item.status)}</strong></p>`).join("")}</div>`;
  document.getElementById("after-sale-detail-dialog").showModal();
}

function applyAfterSaleStatus() {
  const ids = [...document.querySelectorAll(".after-sale-row-check:checked")].map((input) => input.value);
  const status = document.getElementById("after-sale-batch-status").value;
  if (!ids.length) return showToast("請先勾選需要修改的售後需求。");
  if (!status) return showToast("請選擇要修改的需求狀態。");
  const store = loadStore();
  const changedAt = nowText();
  (store.afterSales || []).forEach((record) => {
    if (!ids.includes(record.id) || record.status === "已完成" || record.status === status) return;
    record.status = status;
    record.updated_at = changedAt;
    record.status_history ||= [];
    record.status_history.push({ status, changed_at: changedAt });
  });
  saveStore(store);
  document.getElementById("after-sale-batch-status").value = "";
  renderAfterSales();
  showToast(status === "已完成" ? "狀態已更新為已完成，本輪需求已結束。" : `售後需求已批量更新為${status}。`);
}

function renderRecords(gender) {
  const view = document.getElementById(gender === "男" ? "view-records-male" : "view-records-female");
  const nameQuery = view.querySelector(".record-name-search").value.trim().toLowerCase();
  const employeeQuery = view.querySelector(".record-employee-search").value.trim().toLowerCase();
  const records = accessibleMeasurements().filter((record) => {
    if (record.employee?.gender !== gender) return false;
    const name = String(record.employee?.customer_name || "").toLowerCase();
    const employeeId = String(record.employee?.employee_id || "").toLowerCase();
    return (!nameQuery || name.includes(nameQuery)) && (!employeeQuery || employeeId.includes(employeeQuery));
  });
  const paging = recordPagination[gender];
  const totalPages = Math.max(1, Math.ceil(records.length / paging.pageSize));
  paging.page = Math.min(paging.page, totalPages);
  const start = (paging.page - 1) * paging.pageSize;
  const rows = records
    .slice(start, start + paging.pageSize)
    .map((record) => `
      <tr>
        <td>${versionLabel(record)}</td><td>${record.measurement_id}</td><td>${record.created_at || record.measured_at || "-"}</td><td>${record.tailor_name || "-"}</td><td>${record.employee?.employee_id || "-"}</td><td>${record.employee?.customer_name || "-"}</td><td>${orderLabel(record.employee?.order_id)}</td><td>${record.body_notes?.join("、") || "-"}</td><td>${measurementSummary(record)}</td><td>${followupCell(record)}</td><td>${hasPermission("measurement_followup") ? `<button type="button" data-followup-record="${record.measurement_id}">跟進</button>` : "-"}</td>
      </tr>
    `);
  renderTable(gender === "男" ? "male-record-table" : "female-record-table", ["版本", "記錄ID", "創建時間", "裁縫師", "員工編號", "姓名", "訂單 / 公司", "特殊體型", "量體字段", "跟進事項", "操作"], rows, "暫無量體記錄");
  const target = document.querySelector(`[data-record-pagination="${gender}"]`);
  target.innerHTML = `
    <span>共 ${records.length} 條，第 ${paging.page} / ${totalPages} 頁</span>
    <div>
      <button class="secondary" type="button" data-record-page="${gender}" data-page-action="prev" ${paging.page <= 1 ? "disabled" : ""}>上一頁</button>
      <button class="secondary" type="button" data-record-page="${gender}" data-page-action="next" ${paging.page >= totalPages ? "disabled" : ""}>下一頁</button>
    </div>`;
}

function renderSubaccounts() {
  const accounts = loadStore().subaccounts || [];
  const rows = accounts.map((account) => `<tr><td>${escapeHtml(account.name)}</td><td>${escapeHtml(account.username)}</td><td><span class="status-pill ${account.status === "enabled" ? "" : "is-disabled"}">${account.status === "enabled" ? "已啟用" : "已停用"}</span></td><td>${escapeHtml(account.last_login_at || "從未登入")}</td><td><div class="row-actions"><button type="button" data-edit-subaccount="${account.id}">編輯</button><button class="secondary" type="button" data-toggle-subaccount="${account.id}">${account.status === "enabled" ? "停用" : "啟用"}</button><button class="danger" type="button" data-delete-subaccount="${account.id}">刪除</button></div></td></tr>`);
  renderTable("subaccount-table", ["姓名", "登入賬號", "狀態", "最近登入", "操作"], rows, "暫無子賬號");
}

function appointmentBookings(store, slotId) {
  return (store.appointments || []).filter((item) => item.slot_id === slotId && item.status === "booked");
}

function appointmentSlotTime(slot) {
  return `${slot.date} ${slot.start_time}–${slot.end_time}`;
}

function renderAppointments() {
  const store = loadStore();
  const slots = [...(store.appointmentSlots || [])].sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
  const totalBookings = (store.appointments || []).filter((item) => item.status === "booked").length;
  const overbookedSlots = slots.filter((slot) => appointmentBookings(store, slot.id).length > Number(slot.max_bookings)).length;
  document.getElementById("appointment-summary").innerHTML = `<div><span>已配置時段</span><strong>${slots.length}</strong></div><div><span>當前預約人次</span><strong>${totalBookings}</strong></div><div><span>超額時段</span><strong class="${overbookedSlots ? "is-warning" : ""}">${overbookedSlots}</strong></div>`;
  const rows = slots.map((slot) => {
    const booked = appointmentBookings(store, slot.id).length;
    const overbooked = Math.max(0, booked - Number(slot.max_bookings));
    const capacityText = `${booked} / ${slot.max_bookings}${overbooked ? `（超額 ${overbooked}）` : ""}`;
    return `<tr><td>${escapeHtml(orderLabel(slot.order_id))}</td><td>${escapeHtml(slot.address)}</td><td>${escapeHtml(appointmentSlotTime(slot))}</td><td><strong class="${overbooked ? "capacity-over" : ""}">${capacityText}</strong></td><td>${slot.allow_overbook ? '<span class="status-pill is-pending">支持</span>' : "不支持"}</td><td><span class="status-pill ${slot.status === "enabled" ? "" : "is-disabled"}">${slot.status === "enabled" ? "開放中" : "已暫停"}</span></td><td><div class="row-actions"><button type="button" data-view-appointment-slot="${slot.id}">預約明細</button><button type="button" data-edit-appointment-slot="${slot.id}">編輯</button><button class="danger" type="button" data-delete-appointment-slot="${slot.id}">刪除</button></div></td></tr>`;
  });
  renderTable("appointment-slot-table", ["對應訂單", "預約地址", "服務時間", "已預約 / 最大值", "超額預約", "狀態", "操作"], rows, "暫無預約時段");
}

function openAppointmentSlotEditor(slot = null) {
  const form = document.getElementById("appointment-slot-form");
  form.reset();
  form.elements.id.value = slot?.id || "";
  form.elements.order_id.value = slot?.order_id || loadStore().orders[0]?.order_id || "";
  form.elements.address.value = slot?.address || "";
  form.elements.date.value = slot?.date || seedDate(1);
  form.elements.start_time.value = slot?.start_time || "10:00";
  form.elements.end_time.value = slot?.end_time || "12:00";
  form.elements.max_bookings.value = slot?.max_bookings || 10;
  form.elements.status.value = slot?.status || "enabled";
  form.elements.allow_overbook.checked = Boolean(slot?.allow_overbook);
  document.getElementById("appointment-slot-dialog-title").textContent = slot ? "編輯預約時段" : "新增預約時段";
  document.getElementById("appointment-slot-error").hidden = true;
  document.getElementById("appointment-slot-dialog").showModal();
}

function openAppointmentDetails(slotId) {
  const store = loadStore();
  const slot = (store.appointmentSlots || []).find((item) => item.id === slotId);
  if (!slot) return;
  const bookings = appointmentBookings(store, slotId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  document.getElementById("appointment-detail-subtitle").textContent = `${orderLabel(slot.order_id)}｜${slot.address}｜${appointmentSlotTime(slot)}｜${bookings.length} / ${slot.max_bookings} 人`;
  const rows = bookings.map((booking, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(booking.employee_id)}</td><td>${escapeHtml(booking.employee_name)}</td><td>${escapeHtml(booking.employee_unit || "-")}</td><td>${escapeHtml(booking.order_id || "-")}</td><td>${escapeHtml(booking.created_at)}</td></tr>`);
  renderTable("appointment-detail-table", ["序號", "員工編號", "姓名", "單位", "訂單", "登記時間"], rows, "此時段暫無員工預約");
  document.getElementById("appointment-detail-dialog").showModal();
}

function openSubaccountEditor(account = null) {
  const form = document.getElementById("subaccount-form");
  form.reset();
  form.elements.id.value = account?.id || "";
  form.elements.name.value = account?.name || "";
  form.elements.username.value = account?.username || "";
  form.elements.password.value = "";
  form.elements.password.required = !account;
  form.elements.status.value = account?.status || "enabled";
  [...form.querySelectorAll('input[name="permission"]')].forEach((input) => { input.checked = account ? (account.permissions || []).includes(input.value) : ["employee_view", "measurement_followup"].includes(input.value); });
  document.getElementById("subaccount-dialog-title").textContent = account ? "編輯子賬號" : "新增子賬號";
  document.getElementById("subaccount-password-tip").textContent = account ? "留空表示不修改密碼" : "至少 6 位；原型僅保存哈希值";
  document.getElementById("subaccount-form-error").hidden = true;
  document.getElementById("subaccount-dialog").showModal();
}

function openFollowupEditor(measurementId) {
  const record = accessibleMeasurements().find((item) => item.measurement_id === measurementId);
  if (!record || !hasPermission("measurement_followup")) return;
  const form = document.getElementById("followup-form");
  form.elements.measurement_id.value = measurementId;
  form.elements.followup_status.value = record.followup_status || "待跟進";
  form.elements.followup_due_date.value = record.followup_due_date || "";
  form.elements.followup_note.value = record.followup_note || "";
  document.getElementById("followup-subtitle").textContent = `${record.employee?.customer_name || "-"}｜${record.employee?.employee_id || "-"}｜${versionLabel(record)}`;
  document.getElementById("followup-dialog").showModal();
}

function renderAll() {
  renderOrderSelect();
  renderMetrics();
  renderEmployees();
  renderRecords("男");
  renderRecords("女");
  if (isOwner()) {
    renderTailors();
    renderOrders();
    renderAfterSales();
    renderAppointments();
    renderSignatureDetails();
    renderSubaccounts();
  } else {
    ["tailor-table", "order-table", "after-sale-table", "appointment-slot-table", "signature-table", "subaccount-table"].forEach((id) => { document.getElementById(id).innerHTML = ""; });
  }
  applyAccessPolicy();
}

function upsert(collection, item) {
  const store = loadStore();
  const list = store[collection];
  const index = list.findIndex((row) => row.id === item.id);
  if (index >= 0) list[index] = item;
  else list.push(item);
  saveStore(store);
  renderAll();
}

function removeItem(collection, id) {
  const store = loadStore();
  store[collection] = store[collection].filter((item) => item.id !== id);
  saveStore(store);
  renderAll();
}

function fillForm(formId, item) {
  const form = document.getElementById(formId);
  Object.entries(item).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && key !== "password") field.value = value;
  });
}

function setOrderStep(step) {
  orderEditorState.step = step;
  document.querySelectorAll("[data-order-step]").forEach((section) => section.classList.toggle("is-active", Number(section.dataset.orderStep) === step));
  document.querySelectorAll("[data-order-step-indicator]").forEach((item) => item.classList.toggle("is-active", Number(item.dataset.orderStepIndicator) === step));
  document.getElementById("order-step-prev").hidden = step === 1;
  const hasRules = orderEditorState.quantityRules.length > 0;
  const nextButton = document.getElementById("order-step-next");
  nextButton.hidden = step === 3;
  nextButton.textContent = step === 1 ? "下一步：配置數量" : "下一步：組合限制";
  document.getElementById("order-skip-rules").hidden = step !== 3 || hasRules;
  document.getElementById("order-save").hidden = step !== 3 || !hasRules;
  document.getElementById("order-type-error").hidden = true;
  document.getElementById("order-quantity-error").hidden = true;
  document.getElementById("order-rule-error").hidden = true;
}

function renderGarmentTypeLists() {
  [["男", "male-garment-types"], ["女", "female-garment-types"]].forEach(([gender, targetId]) => {
    const target = document.getElementById(targetId);
    const garments = orderEditorState.garments.filter((item) => item.gender === gender);
    target.innerHTML = garments.length ? garments.map((item) => `
      <div class="garment-type-row" data-garment-row="${item.id}">
        <input type="text" value="${escapeHtml(item.name)}" placeholder="例如：${gender === "男" ? "西裝外套" : "半裙"}" aria-label="${gender}士服裝類型" />
        <button type="button" data-remove-garment="${item.id}" aria-label="刪除${escapeHtml(item.name || "此類型")}">×</button>
      </div>
    `).join("") : `<p class="garment-empty">尚未配置${gender}士服裝，可按“新增類型”添加。</p>`;
  });
}

function syncGarmentTypeInputs() {
  document.querySelectorAll("[data-garment-row]").forEach((row) => {
    const garment = orderEditorState.garments.find((item) => item.id === row.dataset.garmentRow);
    if (garment) garment.name = row.querySelector("input").value;
  });
}

function showOrderError(targetId, message) {
  const target = document.getElementById(targetId);
  target.textContent = message;
  target.hidden = false;
}

function validateOrderTypes() {
  const form = document.getElementById("order-form");
  if (!form.elements.order_id.reportValidity() || !form.elements.company_name.reportValidity()) return false;
  syncGarmentTypeInputs();
  if (!orderEditorState.garments.length) {
    showOrderError("order-type-error", "請至少配置一個男士或女士服裝類型。");
    return false;
  }
  if (orderEditorState.garments.some((item) => !item.name.trim())) {
    showOrderError("order-type-error", "服裝類型名稱不能留空，請填寫或刪除空白項目。");
    return false;
  }
  const hasDuplicate = ["男", "女"].some((gender) => {
    const names = orderEditorState.garments.filter((item) => item.gender === gender).map((item) => item.name.trim().toLowerCase());
    return new Set(names).size !== names.length;
  });
  if (hasDuplicate) {
    showOrderError("order-type-error", "同一性別下不能配置重複的服裝類型。");
    return false;
  }
  orderEditorState.garments.forEach((item) => { item.name = item.name.trim(); });
  return true;
}

function renderGarmentQuantityConfig() {
  const target = document.getElementById("garment-quantity-config");
  target.innerHTML = ["男", "女"].map((gender) => {
    const garments = orderEditorState.garments.filter((item) => item.gender === gender);
    if (!garments.length) return "";
    return `
      <section class="quantity-gender-group">
        <div class="quantity-gender-head"><span class="gender-badge ${gender === "男" ? "male" : "female"}">${gender}</span><strong>${gender}士服裝</strong></div>
        ${garments.map((item) => `
          <div class="quantity-config-row" data-quantity-garment="${item.id}">
            <strong>${escapeHtml(item.name)}</strong>
            <label><span>默認數量</span><input class="garment-default-quantity" type="number" min="1" max="99" step="1" value="${Number(item.default_quantity) || 1}" required /></label>
            <label class="toggle-field"><input class="garment-quantity-editable" type="checkbox" ${item.quantity_editable !== false ? "checked" : ""} /><span>允許員工更改數量</span></label>
          </div>
        `).join("")}
      </section>
    `;
  }).join("");
}

function syncGarmentQuantityInputs() {
  let valid = true;
  document.querySelectorAll("[data-quantity-garment]").forEach((row) => {
    const garment = orderEditorState.garments.find((item) => item.id === row.dataset.quantityGarment);
    const quantityInput = row.querySelector(".garment-default-quantity");
    const quantity = Number(quantityInput.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      valid = false;
      quantityInput.setCustomValidity("請輸入 1 至 99 的整數");
      quantityInput.reportValidity();
    } else {
      quantityInput.setCustomValidity("");
      garment.default_quantity = quantity;
      garment.quantity_editable = row.querySelector(".garment-quantity-editable").checked;
    }
  });
  if (!valid) showOrderError("order-quantity-error", "每個服裝類型的默認數量必須是 1 至 99 的整數。");
  return valid;
}

function renderQuantityRules() {
  const target = document.getElementById("quantity-rule-list");
  if (!orderEditorState.quantityRules.length) {
    target.innerHTML = `<div class="garment-empty rule-empty"><strong>暫無組合限制</strong><span>可添加限制規則，或直接跳過並保存訂單。</span></div>`;
    setOrderStep(orderEditorState.step);
    return;
  }
  target.innerHTML = orderEditorState.quantityRules.map((rule, index) => {
    const genderGarments = orderEditorState.garments.filter((item) => item.gender === rule.gender);
    return `
      <section class="quantity-rule-card" data-quantity-rule="${rule.id}">
        <div class="quantity-rule-head"><strong>限制規則 ${index + 1}</strong><button type="button" data-remove-quantity-rule="${rule.id}">刪除規則</button></div>
        <div class="quantity-rule-fields">
          <label><span>適用性別</span><select class="rule-gender"><option value="男" ${rule.gender === "男" ? "selected" : ""}>男士</option><option value="女" ${rule.gender === "女" ? "selected" : ""}>女士</option></select></label>
          <fieldset class="rule-garment-options">
            <legend>組合服裝類型（至少選 2 項）</legend>
            <div>${genderGarments.map((garment) => `<label><input type="checkbox" value="${garment.id}" ${rule.garment_ids.includes(garment.id) ? "checked" : ""} /><span>${escapeHtml(garment.name)}</span></label>`).join("")}</div>
          </fieldset>
          <label><span>限制條件</span><select class="rule-operator"><option value="lte" ${rule.operator === "lte" ? "selected" : ""}>不多於</option><option value="eq" ${rule.operator === "eq" ? "selected" : ""}>剛好</option></select></label>
          <label><span>限制數量</span><div class="quantity-with-unit"><input class="rule-quantity" type="number" min="1" max="99" step="1" value="${Number(rule.quantity) || 1}" /><span>件</span></div></label>
        </div>
      </section>
    `;
  }).join("");
  setOrderStep(orderEditorState.step);
}

function syncQuantityRuleInputs(validate = false) {
  let valid = true;
  document.querySelectorAll("[data-quantity-rule]").forEach((row) => {
    const rule = orderEditorState.quantityRules.find((item) => item.id === row.dataset.quantityRule);
    if (!rule) return;
    rule.gender = row.querySelector(".rule-gender").value;
    rule.garment_ids = [...row.querySelectorAll('.rule-garment-options input[type="checkbox"]:checked')].map((input) => input.value);
    rule.operator = row.querySelector(".rule-operator").value;
    rule.quantity = Number(row.querySelector(".rule-quantity").value);
    if (validate && rule.garment_ids.length < 2) valid = false;
    if (validate && (!Number.isInteger(rule.quantity) || rule.quantity < 1 || rule.quantity > 99)) valid = false;
  });
  if (!valid) showOrderError("order-rule-error", "每條限制規則需選擇至少 2 個服裝類型，並填寫 1 至 99 的整數數量。");
  return valid;
}

function openEntityDialog(type, item = null) {
  const form = document.getElementById(`${type}-form`);
  const dialog = document.getElementById(`${type}-dialog`);
  const labels = { tailor: "裁縫師", order: "訂單", employee: "員工" };
  form.reset();
  form.elements.id.value = "";
  if (item) fillForm(`${type}-form`, item);
  document.getElementById(`${type}-dialog-title`).textContent = `${item ? "編輯" : "新增"}${labels[type]}`;
  if (type === "order") {
    document.getElementById("garment-quantity-config").innerHTML = "";
    document.getElementById("quantity-rule-list").innerHTML = "";
    orderEditorState.garments = Array.isArray(item?.garments) ? item.garments.map((garment) => ({
      id: garment.id || uid("G"),
      gender: garment.gender,
      name: garment.name || "",
      default_quantity: Number(garment.default_quantity) || 1,
      quantity_editable: garment.quantity_editable !== false,
    })) : [];
    orderEditorState.quantityRules = Array.isArray(item?.quantity_rules) ? item.quantity_rules.map((rule) => ({
      id: rule.id || uid("R"),
      gender: rule.gender === "女" ? "女" : "男",
      garment_ids: Array.isArray(rule.garment_ids) ? [...rule.garment_ids] : [],
      operator: rule.operator === "eq" ? "eq" : "lte",
      quantity: Number(rule.quantity) || 1,
    })) : [];
    renderGarmentTypeLists();
    setOrderStep(1);
  }
  dialog.showModal();
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function splitDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeEmployeeRows(rows) {
  if (rows.length < 2) throw new Error("文件至少需要包含表頭和一行員工資料。");
  const headers = rows[0].map((header) => String(header || "").replace(/\s+/g, ""));
  const headerMap = {
    employee_id: ["員工編號", "员工编号", "employee_id", "employeeid"],
    name: ["姓名", "name"],
    gender: ["性別", "性别", "gender"],
    unit_name: ["單位名字", "单位名字", "單位名稱", "单位名称", "unit_name", "unitname"],
    height_cm: ["身高", "身高cm", "height_cm", "height"],
    weight_kg: ["體重", "体重", "體重kg", "体重kg", "weight_kg", "weight"],
  };
  const indexes = Object.fromEntries(Object.entries(headerMap).map(([key, aliases]) => [
    key,
    headers.findIndex((header) => aliases.map((item) => item.toLowerCase()).includes(header.toLowerCase())),
  ]));
  const required = ["employee_id", "name", "gender", "unit_name"];
  const missing = required.filter((key) => indexes[key] < 0);
  if (missing.length) {
    const label = { employee_id: "員工編號", name: "姓名", gender: "性別", unit_name: "單位名字" };
    throw new Error(`缺少必填表頭：${missing.map((key) => label[key]).join("、")}。`);
  }
  return rows.slice(1).filter((values) => values.some((value) => String(value || "").trim())).flatMap((values, rowIndex) => {
    const pick = (key) => (indexes[key] >= 0 ? values[indexes[key]]?.trim() || "" : "");
    const gender = pick("gender");
    if (!["男", "女"].includes(gender)) throw new Error(`第 ${rowIndex + 2} 行性別需為「男」或「女」。`);
    const row = {
      employee_id: pick("employee_id"),
      name: pick("name"),
      gender,
      unit_name: pick("unit_name"),
      height_cm: pick("height_cm"),
      weight_kg: pick("weight_kg"),
    };
    const emptyRequired = required.filter((key) => !row[key]);
    if (emptyRequired.length) throw new Error(`第 ${rowIndex + 2} 行存在必填字段未填。`);
    return row;
  });
}

function parseEmployeeText(text) {
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("文件至少需要包含表頭和一行員工資料。");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  return normalizeEmployeeRows(lines.map((line) => splitDelimitedLine(line, delimiter)));
}

function findZipEntry(entries, path) {
  return entries.find((entry) => entry.name === path);
}

function readTextXml(xml) {
  return [...xml.getElementsByTagName("t")].map((node) => node.textContent || "").join("");
}

function cellColumnIndex(cellRef) {
  const letters = String(cellRef || "").replace(/[0-9]/g, "");
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("當前瀏覽器不支持直接解析 Excel，請另存為 CSV 後再導入。");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsx(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("Excel 文件結構不完整。");
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = [];
  let offset = centralOffset;
  while (offset < centralOffset + centralSize) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : await inflateRaw(compressed);
    entries.push({ name, data });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function parseXlsxRows(buffer) {
  const entries = await unzipXlsx(buffer);
  const decoder = new TextDecoder();
  const parser = new DOMParser();
  const sharedEntry = findZipEntry(entries, "xl/sharedStrings.xml");
  const sharedStrings = sharedEntry
    ? [...parser.parseFromString(decoder.decode(sharedEntry.data), "application/xml").getElementsByTagName("si")].map(readTextXml)
    : [];
  const sheetEntry = findZipEntry(entries, "xl/worksheets/sheet1.xml") || entries.find((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name));
  if (!sheetEntry) throw new Error("Excel 文件未找到工作表。");
  const sheetXml = parser.parseFromString(decoder.decode(sheetEntry.data), "application/xml");
  const rows = [...sheetXml.getElementsByTagName("row")].map((row) => {
    const values = [];
    [...row.getElementsByTagName("c")].forEach((cell) => {
      const index = cellColumnIndex(cell.getAttribute("r"));
      const inline = cell.getElementsByTagName("is")[0];
      const valueNode = cell.getElementsByTagName("v")[0];
      let value = "";
      if (inline) value = readTextXml(inline);
      else if (valueNode) value = cell.getAttribute("t") === "s" ? sharedStrings[Number(valueNode.textContent)] || "" : valueNode.textContent || "";
      values[index >= 0 ? index : values.length] = value.trim();
    });
    return values;
  });
  return rows;
}

async function parseEmployeeXlsx(buffer) {
  return normalizeEmployeeRows(await parseXlsxRows(buffer));
}

async function parseEmployeeFile(file) {
  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer.slice(0, 4));
  if (signature[0] === 0x50 && signature[1] === 0x4b) return parseEmployeeXlsx(buffer);
  return parseEmployeeText(new TextDecoder("utf-8").decode(buffer));
}

function tabularTextRows(text) {
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("文件至少需要包含表頭和一行量體資料。");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => splitDelimitedLine(line, delimiter));
}

async function parseTabularFile(file) {
  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer.slice(0, 4));
  return signature[0] === 0x50 && signature[1] === 0x4b
    ? parseXlsxRows(buffer)
    : tabularTextRows(new TextDecoder("utf-8").decode(buffer));
}

function normalizeHeader(value) {
  return String(value || "").replace(/^\ufeff/, "").replace(/[\s_（）()\-\/]/g, "").toLowerCase();
}

function measurementImportRecords(rows) {
  const store = loadStore();
  const headers = (rows[0] || []).map(normalizeHeader);
  const findIndex = (...aliases) => headers.findIndex((header) => aliases.map(normalizeHeader).includes(header));
  const orderIndex = findIndex("訂單號", "订单号", "order_id", "orderid");
  const employeeIndex = findIndex("員工編號", "员工编号", "employee_id", "employeeid");
  if (orderIndex < 0 || employeeIndex < 0) throw new Error("缺少必填表頭：訂單號、員工編號。");
  const measurementIndexes = Object.fromEntries(Object.entries(measurementLabels).map(([key, label]) => [key, findIndex(key, label)]));
  const remarkIndex = findIndex("備註", "备注", "remark", "final_remark");
  const tailorIndex = findIndex("裁縫師", "裁缝师", "tailor_name");
  const stageIndex = findIndex("數據階段", "数据阶段", "stage");
  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
  const nextVersions = new Map();
  store.measurements.forEach((record) => {
    const key = `${record.employee?.order_id}::${record.employee?.employee_id}`;
    nextVersions.set(key, Math.max(nextVersions.get(key) || 0, Number(record.version || 0)));
  });
  return rows.slice(1).filter((values) => values.some((value) => String(value || "").trim())).flatMap((values, rowIndex) => {
    const orderId = String(values[orderIndex] || "").trim();
    const employeeId = String(values[employeeIndex] || "").trim();
    const employee = store.employees.find((item) => item.order_id === orderId && item.employee_id === employeeId);
    if (!employee) throw new Error(`第 ${rowIndex + 2} 行找不到員工：${orderId} / ${employeeId}。`);
    const measurements = Object.fromEntries(Object.entries(measurementIndexes).filter(([, index]) => index >= 0 && String(values[index] || "").trim()).map(([key, index]) => [key, String(values[index]).trim()]));
    if (!Object.keys(measurements).length) return [];
    const key = `${orderId}::${employeeId}`;
    const version = (nextVersions.get(key) || 0) + 1;
    nextVersions.set(key, version);
    return [{
      measurement_id: uid("MS"),
      version,
      source: "import",
      stage: stageIndex >= 0 ? String(values[stageIndex] || "").trim() : "批量導入",
      created_at: createdAt,
      measured_at: createdAt,
      tailor_name: tailorIndex >= 0 ? String(values[tailorIndex] || "").trim() : "",
      employee: { order_id: orderId, employee_id: employeeId, customer_id: employee.id, customer_name: employee.name, gender: employee.gender, department: employee.unit_name, height_cm: employee.height_cm, weight_kg: employee.weight_kg },
      measurements,
      final_remark: remarkIndex >= 0 ? String(values[remarkIndex] || "").trim() : "",
    }];
  });
}

function exportMeasurementTemplate() {
  const store = loadStore();
  const measurementKeys = Object.keys(measurementLabels);
  const headers = ["訂單號", "員工編號", "姓名", "性別", "基於版本", "新版本", "數據階段", "裁縫師", ...Object.values(measurementLabels), "備註"];
  const rows = store.employees.map((employee) => {
    const latest = employeeRecords(employee)[0];
    const allVersions = store.measurements.filter((record) => record.employee?.order_id === employee.order_id && record.employee?.employee_id === employee.employee_id).map((record) => Number(record.version || 0));
    const nextVersion = Math.max(0, ...allVersions) + 1;
    const stage = nextVersion === 1 ? "原始量體" : nextVersion === 2 ? "工廠返回" : "最終版";
    return [
      employee.order_id,
      employee.employee_id,
      employee.name,
      employee.gender,
      latest ? versionLabel(latest) : "-",
      versionLabel(nextVersion),
      stage,
      latest?.tailor_name || "",
      ...measurementKeys.map((key) => latest?.measurements?.[key] || ""),
      latest ? recordRemark(latest) : "",
    ];
  });
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(","));
  const date = new Date().toISOString().slice(0, 10);
  downloadCsvBlob(new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), `量體檔案導入模板_${date}.csv`);
  showToast(`已導出 ${rows.length} 名員工的量體檔案模板。`);
}

function selectedAnalysisGarments() {
  return [...document.querySelectorAll('input[name="analysis_garment"]:checked')].map((input) => input.value);
}

function comparisonModeConfig() {
  const mode = document.querySelector('input[name="comparison_mode"]:checked').value;
  if (mode === "v1_v2") return { mode, from: 1, to: 2, label: "V1.0 原始量體 vs V2.0 工廠返回" };
  if (mode === "v2_v3") return { mode, from: 2, to: 3, label: "V2.0 工廠返回 vs V3.0 最終版" };
  if (mode === "custom") {
    const from = Number(document.getElementById("analysis-version-from").value);
    const to = Number(document.getElementById("analysis-version-to").value);
    return { mode, from, to, label: `${versionLabel(from)} vs ${versionLabel(to)}` };
  }
  return { mode, from: null, to: null, label: "上一有效版本 vs 最新有效版本" };
}

function resetComparisonWizard() {
  comparisonState.step = 1;
  comparisonState.garmentSignature = "";
  comparisonState.results = [];
  comparisonState.stats = null;
  document.getElementById("analysis-result-search").value = "";
  document.querySelector('input[name="comparison_mode"][value="v1_v2"]').checked = true;
  document.querySelectorAll('input[name="analysis_garment"]').forEach((input) => { input.checked = false; });
  document.getElementById("analysis-match-mode").value = "any";
  const maxVersion = Math.max(3, ...loadStore().measurements.map((record) => Number(record.version || 0)));
  const versionOptions = Array.from({ length: maxVersion }, (_, index) => `<option value="${index + 1}">${versionLabel(index + 1)}</option>`).join("");
  document.getElementById("analysis-version-from").innerHTML = versionOptions;
  document.getElementById("analysis-version-to").innerHTML = versionOptions;
  document.getElementById("analysis-version-from").value = "1";
  document.getElementById("analysis-version-to").value = "2";
  document.getElementById("analysis-custom-versions").hidden = true;
  document.getElementById("analysis-condition-list").innerHTML = "";
  setComparisonStep(1);
}

function setComparisonStep(step) {
  comparisonState.step = step;
  document.querySelectorAll("[data-analysis-step]").forEach((section) => section.classList.toggle("is-active", Number(section.dataset.analysisStep) === step));
  document.querySelectorAll("[data-analysis-step-indicator]").forEach((item) => item.classList.toggle("is-active", Number(item.dataset.analysisStepIndicator) === step));
  document.getElementById("analysis-prev").hidden = step === 1;
  document.getElementById("analysis-next").hidden = step === 4;
  document.getElementById("analysis-run").hidden = step !== 4;
  document.getElementById("analysis-error").hidden = true;
}

function showAnalysisError(message) {
  const error = document.getElementById("analysis-error");
  error.textContent = message;
  error.hidden = false;
}

function renderAnalysisConditions() {
  const garments = selectedAnalysisGarments();
  const signature = garments.join("|");
  if (signature === comparisonState.garmentSignature && document.getElementById("analysis-condition-list").children.length) return;
  comparisonState.garmentSignature = signature;
  const rows = garments.flatMap((garment) => analysisGarments[garment].fields.map((field) => ({ garment, field })));
  document.getElementById("analysis-condition-list").innerHTML = rows.map(({ garment, field }) => `
    <div class="analysis-condition-row" data-analysis-condition data-garment="${garment}" data-field="${field}">
      <label class="analysis-field-toggle"><input type="checkbox" class="analysis-condition-enabled" /><span>${analysisGarments[garment].label} · ${measurementLabels[field]}</span></label>
      <label><span>差異方向</span><select class="analysis-direction"><option value="absolute">絕對差異</option><option value="increase">增加</option><option value="decrease">減少</option></select></label>
      <label><span>最小差異 cm</span><input class="analysis-min" type="number" min="0" step="0.1" placeholder="例如 3" /></label>
      <label><span>最大差異 cm</span><input class="analysis-max" type="number" min="0" step="0.1" placeholder="可留空" /></label>
    </div>`).join("");
}

function collectAnalysisConditions() {
  const conditions = [...document.querySelectorAll("[data-analysis-condition]")].filter((row) => row.querySelector(".analysis-condition-enabled").checked).map((row) => ({
    garment: row.dataset.garment,
    field: row.dataset.field,
    direction: row.querySelector(".analysis-direction").value,
    minRaw: row.querySelector(".analysis-min").value.trim(),
    maxRaw: row.querySelector(".analysis-max").value.trim(),
  }));
  if (!conditions.length) throw new Error("請至少勾選一個需要分析的數值字段。");
  conditions.forEach((condition) => {
    if (condition.minRaw === "" && condition.maxRaw === "") throw new Error(`${measurementLabels[condition.field]} 請至少填寫最小或最大差異。`);
    condition.min = condition.minRaw === "" ? 0 : Number(condition.minRaw);
    condition.max = condition.maxRaw === "" ? Infinity : Number(condition.maxRaw);
    if (!Number.isFinite(condition.min) || condition.min < 0 || condition.max < condition.min) throw new Error(`${measurementLabels[condition.field]} 的差異區間不正確。`);
  });
  return conditions;
}

function conditionDescription(condition) {
  const direction = { absolute: "絕對差異", increase: "增加", decrease: "減少" }[condition.direction];
  const range = condition.max === Infinity ? `≥ ${condition.min}cm` : `${condition.min}–${condition.max}cm`;
  return `${analysisGarments[condition.garment].label} · ${measurementLabels[condition.field]}：${direction} ${range}`;
}

function renderAnalysisSummary() {
  const version = comparisonModeConfig();
  const garments = selectedAnalysisGarments();
  const conditions = collectAnalysisConditions();
  const matchMode = document.getElementById("analysis-match-mode").value;
  comparisonState.config = { version, garments, conditions, matchMode };
  document.getElementById("analysis-summary").innerHTML = `
    <p><strong>比較版本：</strong>${version.label}</p>
    <p><strong>服裝類型：</strong>${garments.map((item) => analysisGarments[item].label).join("、")}</p>
    <p><strong>匹配方式：</strong>${matchMode === "any" ? "任一條件滿足" : "全部條件滿足"}</p>
    <p><strong>差異條件：</strong><br>${conditions.map(conditionDescription).join("<br>")}</p>`;
}

function validateComparisonStep(step) {
  if (step === 1) {
    const version = comparisonModeConfig();
    if (version.mode === "custom" && version.from === version.to) throw new Error("基準版本和目標版本不能相同。");
  }
  if (step === 2 && !selectedAnalysisGarments().length) throw new Error("請至少選擇一種服裝類型。");
  if (step === 3) renderAnalysisSummary();
}

function analysisVersionPair(employee, versionConfig) {
  const records = employeeRecords(employee);
  if (versionConfig.mode === "previous_latest") return records.length >= 2 ? { before: records[1], after: records[0] } : null;
  const before = records.find((record) => Number(record.version) === versionConfig.from);
  const after = records.find((record) => Number(record.version) === versionConfig.to);
  return before && after ? { before, after } : null;
}

function evaluateAnalysisCondition(condition, before, after) {
  const beforeValue = Number(before.measurements?.[condition.field]);
  const afterValue = Number(after.measurements?.[condition.field]);
  const beforeRaw = before.measurements?.[condition.field];
  const afterRaw = after.measurements?.[condition.field];
  if (beforeRaw === "" || beforeRaw == null || afterRaw === "" || afterRaw == null || !Number.isFinite(beforeValue) || !Number.isFinite(afterValue)) return { valid: false };
  const delta = afterValue - beforeValue;
  const magnitude = condition.direction === "absolute" ? Math.abs(delta) : condition.direction === "increase" ? delta : -delta;
  const directionValid = condition.direction === "absolute" || magnitude >= 0;
  return { valid: true, matched: directionValid && magnitude >= condition.min && magnitude <= condition.max, beforeValue, afterValue, delta, magnitude };
}

function runComparisonAnalysis() {
  const config = comparisonState.config;
  const store = loadStore();
  const results = [];
  const stats = { total: store.employees.length, evaluated: 0, matched: 0, versionMissing: 0, fieldMissing: 0 };
  store.employees.forEach((employee) => {
    const pair = analysisVersionPair(employee, config.version);
    if (!pair) { stats.versionMissing += 1; return; }
    const evaluations = config.conditions.map((condition) => ({ condition, ...evaluateAnalysisCondition(condition, pair.before, pair.after) }));
    const valid = evaluations.filter((item) => item.valid);
    const fieldIncomplete = config.matchMode === "all" ? valid.length !== evaluations.length : valid.length === 0;
    if (fieldIncomplete) { stats.fieldMissing += 1; return; }
    stats.evaluated += 1;
    const employeeMatched = config.matchMode === "all" ? evaluations.every((item) => item.matched) : evaluations.some((item) => item.matched);
    if (!employeeMatched) return;
    stats.matched += 1;
    evaluations.filter((item) => config.matchMode === "all" || item.matched).forEach((item) => results.push({
      employeeId: employee.id,
      employeeCode: employee.employee_id,
      employeeName: employee.name,
      orderId: employee.order_id,
      garment: analysisGarments[item.condition.garment].label,
      field: measurementLabels[item.condition.field],
      beforeVersion: versionLabel(pair.before),
      afterVersion: versionLabel(pair.after),
      beforeValue: item.beforeValue,
      afterValue: item.afterValue,
      delta: item.delta,
      magnitude: item.magnitude,
    }));
  });
  results.sort((a, b) => b.magnitude - a.magnitude);
  comparisonState.results = results;
  comparisonState.stats = stats;
  renderAnalysisResults();
  document.getElementById("comparison-dialog").close();
  document.getElementById("analysis-results-dialog").showModal();
}

function renderAnalysisResults() {
  const stats = comparisonState.stats;
  const query = document.getElementById("analysis-result-search").value.trim().toLowerCase();
  const results = comparisonState.results.filter((item) => !query || item.employeeCode.toLowerCase().includes(query) || item.employeeName.toLowerCase().includes(query));
  document.getElementById("analysis-result-description").textContent = `${comparisonState.config.version.label}｜${comparisonState.config.matchMode === "any" ? "任一條件滿足" : "全部條件滿足"}`;
  document.getElementById("analysis-metrics").innerHTML = `
    <article><span>員工總數</span><strong>${stats.total}</strong></article>
    <article><span>參與比較</span><strong>${stats.evaluated}</strong></article>
    <article><span>命中員工</span><strong>${stats.matched}</strong></article>
    <article><span>版本缺失 / 字段缺失</span><strong>${stats.versionMissing} / ${stats.fieldMissing}</strong></article>`;
  const rows = results.map((item) => `<tr><td>${item.employeeCode}</td><td>${item.employeeName}</td><td>${orderLabel(item.orderId)}</td><td>${item.garment}</td><td>${item.field}</td><td>${item.beforeVersion}：${item.beforeValue}</td><td>${item.afterVersion}：${item.afterValue}</td><td class="${item.magnitude >= 3 ? "delta-large" : ""}">${item.delta > 0 ? "+" : ""}${item.delta.toFixed(1)}cm</td><td><button type="button" data-analysis-open-archive="${item.employeeId}">查看檔案</button></td></tr>`);
  renderTable("analysis-result-table", ["員工編號", "姓名", "歸屬訂單", "服裝類型", "字段", "基準值", "目標值", "差值", "操作"], rows, "沒有員工符合當前分析條件");
}

function exportAnalysisResults() {
  const headers = ["員工編號", "姓名", "歸屬訂單", "服裝類型", "字段", "基準版本", "基準值", "目標版本", "目標值", "差值cm"];
  const rows = comparisonState.results.map((item) => [item.employeeCode, item.employeeName, item.orderId, item.garment, item.field, item.beforeVersion, item.beforeValue, item.afterVersion, item.afterValue, item.delta.toFixed(1)]);
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(","));
  downloadCsvBlob(new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), `量體對比分析_${new Date().toISOString().slice(0, 10)}.csv`);
}

async function importMeasurements() {
  const input = document.getElementById("measurement-import-file");
  const file = input.files[0];
  if (!file) return showToast("請先選擇量體記錄文件。");
  try {
    const records = measurementImportRecords(await parseTabularFile(file));
    if (!records.length) throw new Error("文件中沒有已填寫的量體數據。");
    const store = loadStore();
    store.measurements.push(...records);
    saveStore(store);
    input.value = "";
    document.getElementById("measurement-import-dialog").close();
    renderAll();
    showToast(`成功導入 ${records.length} 條量體記錄，已自動生成新版本。`);
  } catch (error) {
    showToast(`導入失敗：${error.message}`);
  }
}

async function importEmployees() {
  const orderId = document.getElementById("import-order-select").value;
  const file = document.getElementById("employee-import-file").files[0];
  if (!orderId) {
    showToast("請先選擇歸屬訂單 / 公司。");
    return;
  }
  if (!file) {
    showToast("請先選擇員工導入文件。");
    return;
  }
  try {
    const rows = await parseEmployeeFile(file);
    const store = loadStore();
    let inserted = 0;
    let updated = 0;
    rows.forEach((row) => {
      const existingIndex = store.employees.findIndex((item) => item.order_id === orderId && item.employee_id === row.employee_id);
      const existing = existingIndex >= 0 ? store.employees[existingIndex] : null;
      const next = { ...existing, ...row, order_id: orderId, id: existing?.id || uid("E"), verification_status: existing?.verification_status || "unverified", signature_confirmation: existing?.signature_confirmation || null };
      if (existingIndex >= 0) {
        store.employees[existingIndex] = next;
        updated += 1;
      } else {
        store.employees.push(next);
        inserted += 1;
      }
    });
    saveStore(store);
    document.getElementById("employee-import-file").value = "";
    document.getElementById("employee-import-dialog").close();
    renderAll();
    showToast(`導入完成：新增 ${inserted} 筆，更新 ${updated} 筆。`);
  } catch (error) {
    showToast(`導入失敗：${error.message}`);
  }
}

function getExportFilters(forcedGender = "", panel = document) {
  const orderId = panel.querySelector(".export-order-select")?.value || "";
  const startDate = panel.querySelector(".export-start-date")?.value || "";
  const endDate = panel.querySelector(".export-end-date")?.value || "";
  if (startDate && endDate && startDate > endDate) {
    showToast("開始日期不可晚於結束日期。");
    return null;
  }
  return {
    orderId,
    gender: forcedGender,
    startDate,
    endDate,
  };
}

function recordDate(record) {
  return String(record.measured_at || "").slice(0, 10);
}

function recordMatchesExportFilters(record, filters) {
  if (filters.orderId && record.employee?.order_id !== filters.orderId) return false;
  if (filters.gender && record.employee?.gender !== filters.gender) return false;
  const measuredDate = recordDate(record);
  if (filters.startDate && (!measuredDate || measuredDate < filters.startDate)) return false;
  if (filters.endDate && (!measuredDate || measuredDate > filters.endDate)) return false;
  return true;
}

function exportFilename(filters) {
  const parts = [
    filters.orderId || "全部訂單",
    filters.gender || "全部性別",
    filters.startDate && filters.endDate ? `${filters.startDate}_至_${filters.endDate}` : filters.startDate || filters.endDate || "",
  ].filter(Boolean);
  return `${parts.join("_")}量體記錄.csv`;
}

async function exportRemoteRecords(filters) {
  const params = new URLSearchParams();
  if (filters.orderId) params.set("order_id", filters.orderId);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  const res = await fetch(`/api/admin/measurements/export?${params.toString()}`);
  if (!res.ok) throw new Error("導出失敗，請稍後再試。");
  const blob = await res.blob();
  downloadCsvBlob(blob, exportFilename(filters));
}

function downloadCsvBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportRecords(forcedGender = "", panel = document) {
  const filters = getExportFilters(forcedGender, panel);
  if (!filters) return;
  if (remoteMode) {
    try {
      await exportRemoteRecords(filters);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }
  const records = accessibleMeasurements().filter((record) => recordMatchesExportFilters(record, filters));
  const headers = ["記錄ID", "性別", "量體時間", "裁縫師", "訂單號", "公司", "員工編號", "姓名", ...Object.values(measurementLabels), "備註"];
  const keys = Object.keys(measurementLabels);
  const lines = [
    headers.map(csvEscape).join(","),
    ...records.map((record) => {
      const row = [
        record.measurement_id,
        record.employee?.gender,
        record.measured_at,
        record.tailor_name,
        record.employee?.order_id,
        orderLabel(record.employee?.order_id).split(" / ")[1] || "",
        record.employee?.employee_id,
        record.employee?.customer_name,
        ...keys.map((key) => record.measurements?.[key] || ""),
        recordRemark(record),
      ];
      return row.map(csvEscape).join(",");
    }),
  ];
  downloadCsvBlob(new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }), exportFilename(filters));
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const store = loadStore();
  const account = (store.subaccounts || []).find((item) => item.username.toLowerCase() === data.username.trim().toLowerCase());
  const error = document.getElementById("login-error");
  if (account) {
    if (account.status !== "enabled") {
      error.textContent = "賬號已停用，請聯絡系統管理員。";
      error.hidden = false;
      return;
    }
    if (await hashPassword(data.password) !== account.password_hash) {
      error.textContent = "登入賬號或密碼不正確。";
      error.hidden = false;
      return;
    }
    account.last_login_at = nowText();
    saveStore(store);
    currentUser = { id: account.id, name: account.name, username: account.username, role: "subaccount", permissions: [...(account.permissions || [])] };
  } else {
    currentUser = ownerSession(data.username.trim());
  }
  localStorage.setItem(adminSessionKey, JSON.stringify(currentUser));
  error.hidden = true;
  document.getElementById("login-view").hidden = true;
  document.getElementById("admin-shell").hidden = false;
  event.currentTarget.reset();
  switchView(isOwner() ? "dashboard" : (hasPermission("employee_view") ? "employees" : "records-male"));
  renderAll();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  currentUser = null;
  document.getElementById("login-view").hidden = false;
  document.getElementById("admin-shell").hidden = true;
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("open-appointment-slot-editor").addEventListener("click", () => openAppointmentSlotEditor());
document.getElementById("appointment-slot-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const store = loadStore();
  const error = document.getElementById("appointment-slot-error");
  const maxBookings = Number(data.max_bookings);
  const allowOverbook = form.elements.allow_overbook.checked;
  const existingBookings = data.id ? appointmentBookings(store, data.id).length : 0;
  const orderExists = store.orders.some((order) => order.order_id === data.order_id);
  const overlaps = (store.appointmentSlots || []).some((slot) => slot.id !== data.id && slot.order_id === data.order_id && slot.status === "enabled" && data.status === "enabled" && slot.address.trim().toLowerCase() === data.address.trim().toLowerCase() && slot.date === data.date && data.start_time < slot.end_time && data.end_time > slot.start_time);
  let message = "";
  if (!orderExists) message = "請選擇有效的對應訂單。";
  else if (data.end_time <= data.start_time) message = "結束時間必須晚於開始時間。";
  else if (!Number.isInteger(maxBookings) || maxBookings < 1) message = "可預約最大值必須是大於 0 的整數。";
  else if (!allowOverbook && maxBookings < existingBookings) message = `此時段已有 ${existingBookings} 人預約；不支持超額時，最大值不可低於當前人數。`;
  else if (overlaps) message = "同一地址在該日期已有重疊的開放時段，請調整服務時間。";
  if (message) {
    error.textContent = message;
    error.hidden = false;
    return;
  }
  const slot = {
    id: data.id || uid("APS"),
    order_id: data.order_id,
    address: data.address.trim(),
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    max_bookings: maxBookings,
    allow_overbook: allowOverbook,
    status: data.status,
  };
  store.appointmentSlots ||= [];
  const index = store.appointmentSlots.findIndex((item) => item.id === slot.id);
  if (index >= 0) store.appointmentSlots[index] = slot;
  else store.appointmentSlots.push(slot);
  saveStore(store);
  document.getElementById("appointment-slot-dialog").close();
  renderAll();
  showToast(data.id ? "預約時段已更新。" : "預約時段已新增，員工端可立即查看。");
});

document.getElementById("open-after-sale-create").addEventListener("click", () => {
  resetAfterSaleForm();
  document.getElementById("after-sale-create-dialog").showModal();
  document.getElementById("after-sale-employee-query").focus();
});
document.getElementById("search-after-sale-employee").addEventListener("click", searchAfterSaleEmployee);
document.getElementById("after-sale-employee-query").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchAfterSaleEmployee();
  }
});
document.getElementById("after-sale-form").addEventListener("submit", saveAfterSale);
document.getElementById("apply-after-sale-status").addEventListener("click", applyAfterSaleStatus);
document.querySelectorAll("#after-sale-filter-keyword, #after-sale-filter-unit, #after-sale-filter-start, #after-sale-filter-end, #after-sale-filter-status").forEach((field) => {
  field.addEventListener(field.tagName === "SELECT" ? "change" : "input", () => {
    afterSalePagination.page = 1;
    renderAfterSales();
  });
});
document.getElementById("clear-after-sale-filters").addEventListener("click", () => {
  document.getElementById("after-sale-filter-keyword").value = "";
  document.getElementById("after-sale-filter-unit").value = "";
  document.getElementById("after-sale-filter-start").value = "";
  document.getElementById("after-sale-filter-end").value = "";
  document.getElementById("after-sale-filter-status").value = "";
  afterSalePagination.page = 1;
  renderAfterSales();
});
document.getElementById("after-sale-table").addEventListener("change", (event) => {
  if (event.target.id === "after-sale-check-page") {
    document.querySelectorAll(".after-sale-row-check:not(:disabled)").forEach((input) => {
      input.checked = event.target.checked;
    });
    updateAfterSaleSelection();
    return;
  }
  if (event.target.matches(".after-sale-row-check")) updateAfterSaleSelection();
});
document.getElementById("after-sale-pagination").addEventListener("change", (event) => {
  if (event.target.id !== "after-sale-page-size") return;
  afterSalePagination.pageSize = Number(event.target.value);
  afterSalePagination.page = 1;
  renderAfterSales();
});
document.getElementById("after-sale-garment-list").addEventListener("change", (event) => {
  if (!event.target.matches('.after-sale-garment-check input[type="checkbox"]')) return;
  const row = event.target.closest("[data-after-sale-garment]");
  row.querySelector(".after-sale-quantity").disabled = !event.target.checked;
  row.querySelector(".after-sale-demand").disabled = !event.target.checked;
  if (event.target.checked) row.querySelector(".after-sale-demand").focus();
});

document.querySelectorAll(".record-name-search, .record-employee-search").forEach((input) => {
  input.addEventListener("input", () => {
    const gender = input.closest(".view").id === "view-records-male" ? "男" : "女";
    recordPagination[gender].page = 1;
    renderRecords(gender);
  });
});

document.querySelectorAll("#employee-filter-id, #employee-filter-name, #employee-filter-order").forEach((field) => {
  field.addEventListener(field.tagName === "SELECT" ? "change" : "input", () => {
    employeePagination.page = 1;
    renderEmployees();
  });
});

document.querySelectorAll("#signature-filter-name, #signature-filter-employee").forEach((field) => {
  field.addEventListener("input", () => {
    signatureDetailState.page = 1;
    renderSignatureDetails();
  });
});

document.getElementById("clear-signature-filters").addEventListener("click", () => {
  document.getElementById("signature-filter-name").value = "";
  document.getElementById("signature-filter-employee").value = "";
  signatureDetailState.page = 1;
  renderSignatureDetails();
});

document.getElementById("back-to-orders").addEventListener("click", () => switchView("orders"));
document.getElementById("export-signatures").addEventListener("click", exportSignatureDetails);

document.getElementById("clear-employee-filters").addEventListener("click", () => {
  document.getElementById("employee-filter-id").value = "";
  document.getElementById("employee-filter-name").value = "";
  document.getElementById("employee-filter-order").value = "";
  employeePagination.page = 1;
  renderEmployees();
});

document.getElementById("tailor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const current = loadStore().tailors.find((item) => item.id === data.id);
  if (!current && !data.password) {
    showToast("新增裁縫師時請設置登入密碼");
    return;
  }
  upsert("tailors", {
    id: data.id || uid("T"),
    name: data.name,
    username: data.username,
    has_password: Boolean(data.password || current?.has_password),
  });
  event.currentTarget.reset();
  document.getElementById("tailor-dialog").close();
  showToast("裁縫師已保存");
});

document.getElementById("order-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (orderEditorState.step < 3) {
    document.getElementById("order-step-next").click();
    return;
  }
  if (!syncQuantityRuleInputs(true)) return;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const duplicate = loadStore().orders.some((item) => item.order_id === data.order_id.trim() && item.id !== data.id);
  if (duplicate) {
    setOrderStep(1);
    showOrderError("order-type-error", "訂單號已存在，請使用其他訂單號。");
    return;
  }
  upsert("orders", {
    id: data.id || uid("O"),
    order_id: data.order_id.trim(),
    company_name: data.company_name.trim(),
    garments: orderEditorState.garments.map((item) => ({ ...item })),
    quantity_rules: orderEditorState.quantityRules.map((item) => ({ ...item, garment_ids: [...item.garment_ids] })),
  });
  event.currentTarget.reset();
  document.getElementById("order-dialog").close();
  showToast("訂單已保存");
});

document.getElementById("order-step-next").addEventListener("click", () => {
  if (orderEditorState.step === 1) {
    document.getElementById("order-type-error").hidden = true;
    if (!validateOrderTypes()) return;
    const garmentIds = new Set(orderEditorState.garments.map((item) => item.id));
    orderEditorState.quantityRules.forEach((rule) => { rule.garment_ids = rule.garment_ids.filter((id) => garmentIds.has(id)); });
    renderGarmentQuantityConfig();
    setOrderStep(2);
    return;
  }
  document.getElementById("order-quantity-error").hidden = true;
  if (!syncGarmentQuantityInputs()) return;
  renderQuantityRules();
  setOrderStep(3);
});

document.getElementById("order-step-prev").addEventListener("click", () => {
  if (orderEditorState.step === 3) {
    syncQuantityRuleInputs(false);
    renderGarmentQuantityConfig();
    setOrderStep(2);
    return;
  }
  syncGarmentQuantityInputs();
  renderGarmentTypeLists();
  setOrderStep(1);
});

document.getElementById("quantity-rule-list").addEventListener("change", (event) => {
  const genderSelect = event.target.closest(".rule-gender");
  if (!genderSelect) return;
  const row = genderSelect.closest("[data-quantity-rule]");
  syncQuantityRuleInputs(false);
  const rule = orderEditorState.quantityRules.find((item) => item.id === row.dataset.quantityRule);
  if (!rule) return;
  rule.gender = genderSelect.value;
  rule.garment_ids = [];
  renderQuantityRules();
});

document.getElementById("employee-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const current = loadStore().employees.find((item) => item.id === data.id);
  const identityChanged = current && (current.order_id !== data.order_id || current.employee_id !== data.employee_id);
  upsert("employees", {
    ...current,
    ...data,
    id: data.id || uid("E"),
    verification_status: identityChanged ? "unverified" : current?.verification_status || "unverified",
    signature_confirmation: identityChanged ? null : current?.signature_confirmation || null,
    verified_at: identityChanged ? "" : current?.verified_at || "",
  });
  event.currentTarget.reset();
  document.getElementById("employee-dialog").close();
  renderOrderSelect();
  showToast("員工已保存");
});

document.getElementById("import-employees").addEventListener("click", importEmployees);
document.getElementById("import-measurements").addEventListener("click", importMeasurements);
document.getElementById("export-measurement-template").addEventListener("click", exportMeasurementTemplate);
document.getElementById("open-subaccount-editor").addEventListener("click", () => openSubaccountEditor());
document.getElementById("subaccount-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const store = loadStore();
  const existing = (store.subaccounts || []).find((account) => account.id === data.get("id"));
  const error = document.getElementById("subaccount-form-error");
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const duplicate = (store.subaccounts || []).some((account) => account.id !== data.get("id") && account.username.toLowerCase() === username.toLowerCase());
  if (duplicate || (!existing && password.length < 6) || (existing && password && password.length < 6)) {
    error.textContent = duplicate ? "登入賬號已存在，請更換。" : "登入密碼至少需要 6 位。";
    error.hidden = false;
    return;
  }
  const account = {
    id: existing?.id || uid("A"),
    name: String(data.get("name") || "").trim(),
    username,
    password_hash: password ? await hashPassword(password) : existing?.password_hash,
    status: data.get("status"),
    permissions: data.getAll("permission"),
    last_login_at: existing?.last_login_at || "",
  };
  store.subaccounts ||= [];
  if (existing) store.subaccounts[store.subaccounts.findIndex((item) => item.id === existing.id)] = account;
  else store.subaccounts.push(account);
  saveStore(store);
  document.getElementById("subaccount-dialog").close();
  renderAll();
  showToast("子賬號已保存，可使用新賬號登入。");
});
document.getElementById("followup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const store = loadStore();
  const record = store.measurements.find((item) => item.measurement_id === data.measurement_id);
  if (!record || !accessibleMeasurements(store).some((item) => item.measurement_id === data.measurement_id) || !hasPermission("measurement_followup")) return;
  record.followup_status = data.followup_status;
  record.followup_due_date = data.followup_due_date;
  record.followup_note = String(data.followup_note || "").trim();
  record.followup_owner = currentUser?.name || currentUser?.username || "管理員";
  record.followup_updated_at = nowText();
  saveStore(store);
  document.getElementById("followup-dialog").close();
  renderAll();
  if (document.getElementById("archive-dialog").open) openArchive(document.getElementById("archive-dialog").dataset.employeeId);
  showToast("量體事項跟進記錄已更新。");
});
document.getElementById("open-comparison-analysis").addEventListener("click", () => {
  resetComparisonWizard();
  document.getElementById("comparison-dialog").showModal();
});
document.querySelectorAll('input[name="comparison_mode"]').forEach((input) => input.addEventListener("change", () => {
  document.getElementById("analysis-custom-versions").hidden = input.value !== "custom";
}));
document.getElementById("analysis-next").addEventListener("click", () => {
  try {
    validateComparisonStep(comparisonState.step);
    if (comparisonState.step === 2) renderAnalysisConditions();
    setComparisonStep(comparisonState.step + 1);
  } catch (error) {
    showAnalysisError(error.message);
  }
});
document.getElementById("analysis-prev").addEventListener("click", () => setComparisonStep(comparisonState.step - 1));
document.getElementById("analysis-run").addEventListener("click", runComparisonAnalysis);
document.getElementById("analysis-result-search").addEventListener("input", renderAnalysisResults);
document.getElementById("export-analysis-results").addEventListener("click", exportAnalysisResults);

document.getElementById("record-edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const store = loadStore();
  const record = store.measurements.find((item) => item.measurement_id === data.measurement_id);
  if (!record) return;
  record.measurements = Object.fromEntries(Object.keys(measurementLabels).filter((key) => String(data[key] || "").trim()).map((key) => [key, String(data[key]).trim()]));
  record.final_remark = String(data.remark || "").trim();
  record.updated_at = new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
  saveStore(store);
  document.getElementById("record-edit-dialog").close();
  renderAll();
  const archive = document.getElementById("archive-dialog");
  if (archive.open) openArchive(archive.dataset.employeeId);
  showToast("量體版本已修改。");
});

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const store = loadStore();
  if (button.dataset.addGarment) {
    syncGarmentTypeInputs();
    orderEditorState.garments.push({ id: uid("G"), gender: button.dataset.addGarment, name: "", default_quantity: 1, quantity_editable: true });
    renderGarmentTypeLists();
    const targetId = button.dataset.addGarment === "男" ? "male-garment-types" : "female-garment-types";
    document.querySelector(`#${targetId} [data-garment-row]:last-child input`)?.focus();
  }
  if (button.dataset.removeGarment) {
    syncGarmentTypeInputs();
    orderEditorState.garments = orderEditorState.garments.filter((item) => item.id !== button.dataset.removeGarment);
    renderGarmentTypeLists();
  }
  if (button.hasAttribute("data-add-quantity-rule")) {
    syncQuantityRuleInputs(false);
    const eligibleGender = ["女", "男"].find((gender) => orderEditorState.garments.filter((item) => item.gender === gender).length >= 2);
    if (!eligibleGender) {
      showOrderError("order-rule-error", "至少需为同一性别配置 2 个服装类型，才能添加组合限制。");
    } else {
      orderEditorState.quantityRules.push({ id: uid("R"), gender: eligibleGender, garment_ids: [], operator: "lte", quantity: 4 });
      renderQuantityRules();
    }
  }
  if (button.dataset.removeQuantityRule) {
    syncQuantityRuleInputs(false);
    orderEditorState.quantityRules = orderEditorState.quantityRules.filter((item) => item.id !== button.dataset.removeQuantityRule);
    renderQuantityRules();
  }
  if (button.dataset.openSignatures) openSignatureDetails(button.dataset.openSignatures);
  if (button.dataset.selectAfterSaleEmployee) selectAfterSaleEmployee(button.dataset.selectAfterSaleEmployee);
  if (button.dataset.afterSaleDetail) openAfterSaleDetail(button.dataset.afterSaleDetail);
  if (button.dataset.afterSalePage) {
    afterSalePagination.page += button.dataset.afterSalePage === "next" ? 1 : -1;
    renderAfterSales();
  }
  if (button.dataset.revokeSignature) {
    const employee = store.employees.find((item) => item.id === button.dataset.revokeSignature);
    if (employee && window.confirm(`確定撤銷 ${employee.name} 的驗證？撤銷後員工可重新修改數量並簽字。`)) {
      employee.verification_status = "unverified";
      employee.signature_confirmation = null;
      employee.verified_at = "";
      saveStore(store);
      renderSignatureDetails();
      showToast("驗證已撤銷，員工可重新確認數量並簽字。");
    }
  }
  if (button.dataset.openEditor) openEntityDialog(button.dataset.openEditor);
  if (button.dataset.editTailor) openEntityDialog("tailor", store.tailors.find((item) => item.id === button.dataset.editTailor));
  if (button.dataset.deleteTailor) removeItem("tailors", button.dataset.deleteTailor);
  if (button.dataset.editOrder) openEntityDialog("order", store.orders.find((item) => item.id === button.dataset.editOrder));
  if (button.dataset.deleteOrder) removeItem("orders", button.dataset.deleteOrder);
  if (button.dataset.editEmployee) openEntityDialog("employee", store.employees.find((item) => item.id === button.dataset.editEmployee));
  if (button.dataset.deleteEmployee) removeItem("employees", button.dataset.deleteEmployee);
  if (button.dataset.openArchive) openArchive(button.dataset.openArchive);
  if (button.dataset.followupRecord) openFollowupEditor(button.dataset.followupRecord);
  if (button.dataset.editSubaccount) openSubaccountEditor((store.subaccounts || []).find((account) => account.id === button.dataset.editSubaccount));
  if (button.dataset.viewAppointmentSlot) openAppointmentDetails(button.dataset.viewAppointmentSlot);
  if (button.dataset.editAppointmentSlot) openAppointmentSlotEditor((store.appointmentSlots || []).find((slot) => slot.id === button.dataset.editAppointmentSlot));
  if (button.dataset.deleteAppointmentSlot) {
    const booked = appointmentBookings(store, button.dataset.deleteAppointmentSlot).length;
    if (booked) {
      showToast(`此時段已有 ${booked} 人預約，請先暫停時段，不能直接刪除。`);
    } else if (window.confirm("確定刪除此預約時段？")) {
      store.appointmentSlots = (store.appointmentSlots || []).filter((slot) => slot.id !== button.dataset.deleteAppointmentSlot);
      saveStore(store);
      renderAll();
      showToast("預約時段已刪除。");
    }
  }
  if (button.dataset.toggleSubaccount) {
    const account = (store.subaccounts || []).find((item) => item.id === button.dataset.toggleSubaccount);
    if (account) account.status = account.status === "enabled" ? "disabled" : "enabled";
    saveStore(store);
    renderAll();
    showToast(`子賬號已${account?.status === "enabled" ? "啟用" : "停用"}。`);
  }
  if (button.dataset.deleteSubaccount) {
    if (!window.confirm("確定刪除此子賬號？刪除後將無法再登入。")) return;
    store.subaccounts = (store.subaccounts || []).filter((account) => account.id !== button.dataset.deleteSubaccount);
    saveStore(store);
    renderAll();
    showToast("子賬號已刪除。");
  }
  if (button.dataset.analysisOpenArchive) {
    document.getElementById("analysis-results-dialog").close();
    openArchive(button.dataset.analysisOpenArchive);
  }
  if (button.dataset.openImport) document.getElementById(`${button.dataset.openImport === "employees" ? "employee" : "measurement"}-import-dialog`).showModal();
  if (button.dataset.editRecord) openRecordEditor(button.dataset.editRecord);
  if (button.dataset.deleteRecord) {
    if (!window.confirm("確定從該員工的量體檔案中移除此版本？原始量體記錄將繼續保留。")) return;
    const nextStore = loadStore();
    const record = nextStore.measurements.find((item) => item.measurement_id === button.dataset.deleteRecord);
    if (record) record.archive_removed_at = new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
    saveStore(nextStore);
    renderAll();
    openArchive(document.getElementById("archive-dialog").dataset.employeeId);
    showToast("檔案版本已移除，原始量體記錄仍然保留。");
  }
  if (button.hasAttribute("data-close-archive")) document.getElementById("archive-dialog").close();
  if (button.hasAttribute("data-close-record-edit")) document.getElementById("record-edit-dialog").close();
  if (button.hasAttribute("data-close-subaccount")) document.getElementById("subaccount-dialog").close();
  if (button.hasAttribute("data-close-appointment-slot")) document.getElementById("appointment-slot-dialog").close();
  if (button.hasAttribute("data-close-appointment-detail")) document.getElementById("appointment-detail-dialog").close();
  if (button.hasAttribute("data-close-followup")) document.getElementById("followup-dialog").close();
  if (button.hasAttribute("data-close-import")) button.closest("dialog").close();
  if (button.hasAttribute("data-close-entity")) button.closest("dialog").close();
  if (button.hasAttribute("data-close-comparison")) document.getElementById("comparison-dialog").close();
  if (button.hasAttribute("data-close-analysis-results")) document.getElementById("analysis-results-dialog").close();
  if (button.hasAttribute("data-close-after-sale-create")) document.getElementById("after-sale-create-dialog").close();
  if (button.hasAttribute("data-close-after-sale-detail")) document.getElementById("after-sale-detail-dialog").close();
  if (button.dataset.exportRecords) exportRecords(button.dataset.exportRecords, button.closest("[data-record-export-panel]"));
  if (button.dataset.recordPage) {
    const paging = recordPagination[button.dataset.recordPage];
    paging.page += button.dataset.pageAction === "next" ? 1 : -1;
    renderRecords(button.dataset.recordPage);
  }
  if (button.dataset.employeePage) {
    employeePagination.page += button.dataset.employeePage === "next" ? 1 : -1;
    renderEmployees();
  }
  if (button.dataset.signaturePage) {
    signatureDetailState.page += button.dataset.signaturePage === "next" ? 1 : -1;
    renderSignatureDetails();
  }
  if (button.hasAttribute("data-clear-export-filters")) {
    const panel = button.closest("[data-record-export-panel]");
    panel.querySelector(".export-order-select").value = "";
    panel.querySelector(".export-start-date").value = "";
    panel.querySelector(".export-end-date").value = "";
  }
});

loadStore();
if (currentUser) {
  document.getElementById("login-view").hidden = true;
  document.getElementById("admin-shell").hidden = false;
  switchView(isOwner() ? "dashboard" : (hasPermission("employee_view") ? "employees" : "records-male"));
}
(async () => {
  try {
    await syncFromServer();
  } catch (error) {
    showToast(error.message);
  }
  renderAll();
})();

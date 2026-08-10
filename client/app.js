const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");
const flowSteps = document.querySelectorAll(".flow-stepper li");
const resetSteps = document.querySelectorAll(".reset-stepper li");
const flowPages = document.querySelectorAll(".flow-page");
const resetPages = document.querySelectorAll(".reset-page");
const flowResult = document.getElementById("flow-result");
let currentEmployee = null;
let resetCodeSent = false;
let signatureDirty = false;
let confirmedData = null;
let selectedAfterSaleOrderId = "";
const sharedAdminStoreKey = "mc-measure-admin-prototype-state";

const fallbackOrders = [{
  order_id: "ORDER001",
  company_name: "澳設集團 2026 制服",
  garments: [
    { id: "G001", gender: "男", name: "襯衫", default_quantity: 2 },
    { id: "G002", gender: "男", name: "西褲", default_quantity: 2 },
    { id: "G003", gender: "女", name: "襯衫", default_quantity: 2 },
    { id: "G004", gender: "女", name: "半裙", default_quantity: 2 },
    { id: "G005", gender: "男", name: "毛衣", default_quantity: 2 },
    { id: "G006", gender: "女", name: "連衣裙", default_quantity: 2 },
    { id: "G007", gender: "女", name: "西褲", default_quantity: 2 },
  ],
}];

const employees = {
  EMP001: {
    orderId: "ORDER001",
    employeeId: "EMP001",
    name: "陳嘉儀",
    gender: "女",
    department: "深圳總部",
    phone: "+8613812345678",
    email: "jiayi.chen@example.com",
    maskedPhone: "+86 **** **** 5678",
  },
  EMP002: {
    orderId: "ORDER001",
    employeeId: "EMP002",
    name: "林美琪",
    gender: "女",
    department: "澳門分部",
    phone: "+85361234567",
    email: "mei.lam@example.com",
    maskedPhone: "+853 **** 4567",
  },
};

function escapeClientHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function maskPhone(phone) {
  const value = String(phone || "");
  return value ? `${value.slice(0, 4)} **** ${value.slice(-4)}` : "未提供手機號";
}

function loadSharedAdminStore() {
  try {
    const store = JSON.parse(localStorage.getItem(sharedAdminStoreKey) || "null");
    if (store && store.afterSaleStatusVersion !== 2) {
      store.afterSales = (store.afterSales || []).map((record) => ({
        ...record,
        status: record.status === "已完成" ? "已處理" : record.status === "已發回" ? "已完成" : record.status,
        status_history: (record.status_history || []).map((entry) => ({
          ...entry,
          status: entry.status === "已完成" ? "已處理" : entry.status === "已發回" ? "已完成" : entry.status,
        })),
      }));
      store.afterSaleStatusVersion = 2;
      localStorage.setItem(sharedAdminStoreKey, JSON.stringify(store));
    }
    return store;
  } catch {
    return null;
  }
}

function sharedEmployee(orderId, employeeId) {
  const store = loadSharedAdminStore();
  const record = store?.employees?.find((item) => item.order_id === orderId && item.employee_id === employeeId);
  if (!record) return null;
  return {
    orderId: record.order_id,
    employeeId: record.employee_id,
    name: record.name,
    gender: record.gender,
    department: record.unit_name || "-",
    phone: record.phone || "",
    email: record.email || "",
    maskedPhone: record.maskedPhone || maskPhone(record.phone),
    signatureConfirmation: record.verification_status === "verified" ? record.signature_confirmation : null,
  };
}

function renderSharedOrderOptions() {
  const sharedOrders = loadSharedAdminStore()?.orders;
  const orders = Array.isArray(sharedOrders) && sharedOrders.length ? sharedOrders : fallbackOrders;
  const options = orders.map((order) => `<option value="${escapeClientHtml(order.order_id)}">${escapeClientHtml(order.order_id)} - ${escapeClientHtml(order.company_name)}</option>`).join("");
  document.querySelector('[name="order_id"]').innerHTML = options;
  document.querySelector('[name="reset_order_id"]').innerHTML = options;
}

function nowClientText() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-");
}

function clientUid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

function getClientOrders() {
  const sharedOrders = loadSharedAdminStore()?.orders;
  return Array.isArray(sharedOrders) && sharedOrders.length ? sharedOrders : fallbackOrders;
}

function getEmployeeOrders() {
  if (!currentEmployee) return [];
  return getClientOrders().filter((order) => order.order_id === currentEmployee.orderId);
}

function getEmployeeAfterSaleRecords() {
  const records = loadSharedAdminStore()?.afterSales;
  if (!currentEmployee || !Array.isArray(records)) return [];
  return records
    .filter((record) => record.employee_id === currentEmployee.employeeId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function afterSaleStatusClass(status) {
  if (status === "已處理") return "processed";
  if (status === "已完成") return "completed";
  return "registered";
}

function renderClientOrders() {
  const profile = document.getElementById("client-profile-card");
  const cards = document.getElementById("client-order-cards");
  const records = document.getElementById("client-after-sale-records");
  if (!currentEmployee) {
    profile.innerHTML = '<div class="empty-state"><strong>請先登入</strong><span>登入後即可查看訂單及提交退換申請。</span></div>';
    cards.innerHTML = '<button class="primary-action" type="button" data-jump="login">前往登入</button>';
    records.innerHTML = "";
    return;
  }

  profile.innerHTML = `<div><span>當前員工</span><strong>${escapeClientHtml(currentEmployee.employeeId)} · ${escapeClientHtml(currentEmployee.name)}</strong></div><div><span>性別 / 分部</span><strong>${escapeClientHtml(currentEmployee.gender)} / ${escapeClientHtml(currentEmployee.department)}</strong></div>`;
  const employeeOrders = getEmployeeOrders();
  cards.innerHTML = employeeOrders.length ? employeeOrders.map((order) => `
    <article class="client-order-card">
      <div><span>訂單 / 項目</span><strong>${escapeClientHtml(order.order_id)}</strong><p>${escapeClientHtml(order.company_name)}</p></div>
      <div class="button-row">
        <button class="secondary-action" type="button" data-open-confirmation>服裝確認</button>
        <button class="primary-action" type="button" data-open-client-after-sale="${escapeClientHtml(order.order_id)}">退換登記</button>
      </div>
    </article>`).join("") : '<div class="empty-state"><strong>暫無可選訂單</strong><span>請聯絡工作人員核對員工的歸屬訂單。</span></div>';

  const employeeRecords = getEmployeeAfterSaleRecords();
  records.innerHTML = employeeRecords.length ? employeeRecords.map((record) => `
    <article class="after-sale-record-card">
      <div class="record-card-head"><strong>${escapeClientHtml(record.id)}</strong><span class="after-sale-status status-${afterSaleStatusClass(record.status)}">${escapeClientHtml(record.status)}</span></div>
      <p>${escapeClientHtml(record.order_id)} · ${escapeClientHtml(record.created_at)}</p>
      <div class="record-item-list">${(record.items || []).map((item) => `<div><strong>${escapeClientHtml(item.garment_name)}</strong><span>${escapeClientHtml(item.demand)}</span></div>`).join("")}</div>
      ${record.remark ? `<p class="record-remark">補充說明：${escapeClientHtml(record.remark)}</p>` : ""}
    </article>`).join("") : '<div class="empty-state"><strong>暫無退換申請</strong><span>從上方訂單點擊「退換登記」即可自主提交。</span></div>';
}

function openClientAfterSale(orderId) {
  const order = getEmployeeOrders().find((item) => item.order_id === orderId);
  if (!currentEmployee || !order) return;
  selectedAfterSaleOrderId = orderId;
  document.getElementById("client-after-sale-order-card").innerHTML = `<div><span>申請員工</span><strong>${escapeClientHtml(currentEmployee.employeeId)} · ${escapeClientHtml(currentEmployee.name)}</strong></div><div><span>選中訂單</span><strong>${escapeClientHtml(order.order_id)} · ${escapeClientHtml(order.company_name)}</strong></div>`;
  const garments = (order.garments || []).filter((garment) => garment.gender === currentEmployee.gender);
  document.getElementById("client-after-sale-garments").innerHTML = garments.length ? garments.map((garment) => {
    return `<div class="after-sale-garment-row" data-client-after-sale-garment="${escapeClientHtml(garment.id || garment.name)}" data-garment-name="${escapeClientHtml(garment.name)}">
      <label class="after-sale-garment-check"><input type="checkbox" /><span><strong>${escapeClientHtml(garment.name)}</strong>勾選後填寫需求</span></label>
      <label class="field"><span>換貨 / 修改需求</span><textarea class="client-after-sale-demand" rows="2" placeholder="例如：換大一碼；袖長縮短 2cm" disabled></textarea></label>
    </div>`;
  }).join("") : '<div class="empty-state"><strong>暫無可登記服裝</strong><span>該訂單尚未配置符合員工性別的服裝。</span></div>';
  document.getElementById("client-after-sale-error").hidden = true;
  document.getElementById("client-order-list").hidden = true;
  document.getElementById("client-after-sale-create").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeClientAfterSale() {
  selectedAfterSaleOrderId = "";
  document.getElementById("client-after-sale-form").reset();
  document.getElementById("client-after-sale-create").hidden = true;
  document.getElementById("client-order-list").hidden = false;
  renderClientOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function persistSignatureConfirmation(data) {
  const store = loadSharedAdminStore();
  const employee = store?.employees?.find((item) => item.order_id === data.employee.orderId && item.employee_id === data.employee.employeeId);
  if (!employee) return false;
  employee.signature_confirmation = {
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    isPregnant: data.isPregnant,
    phone: data.phone,
    email: data.email,
    measurementRequired: data.measurementRequired,
    selectedSkuList: data.selectedSkuList,
    signatureImage: data.signatureImage,
    signedAt: data.signedAt,
    confirmStatus: "confirmed",
  };
  employee.verification_status = "verified";
  employee.verified_at = data.signedAt;
  localStorage.setItem(sharedAdminStoreKey, JSON.stringify(store));
  return true;
}

function switchView(viewName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });
  views.forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
  if (viewName === "orders") renderClientOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setSteps(stepItems, index) {
  stepItems.forEach((item, itemIndex) => {
    item.classList.toggle("is-current", itemIndex === index);
  });
}

function setFlowPage(index) {
  flowPages.forEach((page, pageIndex) => {
    page.classList.toggle("is-active", pageIndex === index);
  });
  setSteps(flowSteps, index);
  flowResult.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setResetPage(index) {
  resetPages.forEach((page, pageIndex) => {
    page.classList.toggle("is-active", pageIndex === index);
  });
  setSteps(resetSteps, index);
}

function showNotice(element, type, title, message) {
  element.hidden = false;
  element.className = `notice ${type || ""}`.trim();
  element.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
}

function getConfirmFormData() {
  const formData = new FormData(document.getElementById("confirm-form"));
  const isPregnant = formData.get("is_pregnant") === "yes";
  return {
    employee: currentEmployee,
    heightCm: formData.get("height_cm").trim(),
    weightKg: formData.get("weight_kg").trim(),
    isPregnant,
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    measurementRequired: !isPregnant,
    selectedSkuList: isPregnant ? [] : getSelectedSkus(),
  };
}

function getSelectedSkus() {
  return [...document.querySelectorAll(".sku-row")].flatMap((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const qtyInput = row.querySelector(".sku-qty");
    if (!checkbox.checked) {
      return [];
    }
    return [{
      skuId: checkbox.value,
      skuName: checkbox.dataset.name,
      skuType: checkbox.dataset.type,
      quantity: Number(qtyInput.value),
    }];
  });
}

function getSkuTotal() {
  return getSelectedSkus().reduce((sum, sku) => sum + sku.quantity, 0);
}

function updateSkuTotal() {
  const total = getSkuTotal();
  document.getElementById("sku-total").textContent = `${total} / 4`;
}

function renderSummary(target, data, includeSignature = false) {
  const skuTotal = data.selectedSkuList.reduce((sum, sku) => sum + sku.quantity, 0);
  const skuMarkup = data.selectedSkuList.length
    ? data.selectedSkuList.map((sku) => `<div><strong>${sku.skuName}</strong><span>${sku.skuType}</span><em>${sku.quantity} 件</em></div>`).join("")
    : `<div><strong>SKU</strong><span>孕婦員工不參與 SKU 選擇</span><em>0 件</em></div>`;

  target.innerHTML = `
    <dl class="confirm-list">
      <div><dt>姓名</dt><dd>${data.employee.name}</dd></div>
      <div><dt>員工 ID</dt><dd>${data.employee.employeeId}</dd></div>
      <div><dt>分部</dt><dd>${data.employee.department}</dd></div>
      <div><dt>身高</dt><dd>${data.isPregnant ? "無需填寫" : `${data.heightCm} cm`}</dd></div>
      <div><dt>體重</dt><dd>${data.isPregnant ? "無需填寫" : `${data.weightKg} kg`}</dd></div>
      <div><dt>懷孕</dt><dd>${data.isPregnant ? "是" : "否"}</dd></div>
      <div><dt>手機</dt><dd>${data.phone || "未填寫"}</dd></div>
      <div><dt>郵箱</dt><dd>${data.email || "未填寫"}</dd></div>
      ${data.signedAt ? `<div><dt>簽字時間</dt><dd>${data.signedAt}</dd></div>` : ""}
    </dl>
    <div class="sku-confirm-list">${skuMarkup}</div>
    ${includeSignature && data.signatureImage ? `<img class="signature-preview" src="${data.signatureImage}" alt="電子簽名" />` : ""}
    ${includeSignature ? `<p class="locked-note">如需修改，請聯絡我司工作人員。</p>` : ""}
  `;
}

function resetFlowForEmployee(employee) {
  currentEmployee = employee;
  document.getElementById("employee-id-text").textContent = employee.employeeId;
  document.getElementById("employee-name-text").textContent = employee.name;
  document.getElementById("employee-gender-text").textContent = employee.gender;
  document.getElementById("department-text").textContent = employee.department;
  document.querySelector('[name="phone"]').value = employee.phone || "";
  document.querySelector('[name="email"]').value = employee.email || "";
  document.querySelector('[name="is_pregnant"]').value = "no";
  document.querySelector(".pregnancy-field").hidden = employee.gender !== "女";
  document.querySelector(".info-measure-fields").hidden = false;
  document.getElementById("pregnant-tip").hidden = true;
  document.querySelectorAll(".sku-row").forEach((row) => {
    row.querySelector('input[type="checkbox"]').checked = false;
    const qty = row.querySelector(".sku-qty");
    qty.value = "";
    qty.disabled = true;
  });
  updateSkuTotal();
  clearSignature();
  setFlowPage(0);
}

function validateInfo(data) {
  if (!data.isPregnant) {
    const height = Number(data.heightCm);
    const weight = Number(data.weightKg);
    if (!Number.isInteger(height) || height < 100 || height > 230) {
      return "請輸入 100-230 之間的整數身高。";
    }
    if (!/^\d+(\.\d)?$/.test(data.weightKg) || weight < 30 || weight > 200) {
      return "請輸入 30-200 之間、最多 1 位小數的體重。";
    }
  }
  if (data.isPregnant && !data.phone) {
    return "請留下聯絡電話。";
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "請輸入正確的郵箱格式。";
  }
  if (data.phone && !/^\+(86\d{11}|852[5-9]\d{7}|8536\d{7})$/.test(data.phone)) {
    return "手機號需包含 +86 / +852 / +853 區號，且不可包含空格或橫線。";
  }
  return "";
}

function validateSku() {
  const selected = getSelectedSkus();
  if (!selected.length) {
    return "請至少選擇一個 SKU。";
  }
  if (selected.some((sku) => !Number.isInteger(sku.quantity) || sku.quantity < 1)) {
    return "已勾選 SKU 的數量必須為正整數。";
  }
  if (getSkuTotal() !== 4) {
    return "服裝總數量必須等於 4 件。";
  }
  return "";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.jump));
});

document.getElementById("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const orderId = formData.get("order_id");
  const employeeId = formData.get("employee_id").trim();
  const password = formData.get("password").trim();
  const result = document.getElementById("login-result");
  const employee = sharedEmployee(orderId, employeeId) || employees[employeeId];

  if (!employee || employee.orderId !== orderId) {
    showNotice(result, "error", "登入失敗", "未找到該員工賬號，請確認訂單 / 項目和員工 ID。");
    return;
  }
  if (!password) {
    showNotice(result, "error", "登入失敗", "請輸入密碼。");
    return;
  }

  currentEmployee = employee;
  resetFlowForEmployee(employee);
  if (employee.signatureConfirmation?.confirmStatus === "confirmed") {
    confirmedData = { ...employee.signatureConfirmation, employee };
    renderSummary(document.getElementById("locked-summary"), confirmedData, true);
    showNotice(result, "success", "登入成功", "服裝確認已完成，您仍可從訂單自主提交退換申請。");
    window.setTimeout(() => switchView("orders"), 350);
    return;
  }
  showNotice(result, "success", "登入成功", "請選擇訂單後繼續服裝確認或提交退換申請。");
  window.setTimeout(() => switchView("orders"), 350);
});

document.getElementById("client-order-cards").addEventListener("click", (event) => {
  if (event.target.closest('[data-jump="login"]')) {
    switchView("login");
    return;
  }
  const afterSaleButton = event.target.closest("[data-open-client-after-sale]");
  if (afterSaleButton) {
    openClientAfterSale(afterSaleButton.dataset.openClientAfterSale);
    return;
  }
  if (event.target.closest("[data-open-confirmation]")) {
    if (currentEmployee?.signatureConfirmation?.confirmStatus === "confirmed") switchView("locked");
    else switchView("flow");
  }
});

document.getElementById("client-after-sale-garments").addEventListener("change", (event) => {
  if (!event.target.matches('.after-sale-garment-check input[type="checkbox"]')) return;
  const row = event.target.closest("[data-client-after-sale-garment]");
  row.querySelector(".client-after-sale-demand").disabled = !event.target.checked;
});

document.getElementById("cancel-client-after-sale").addEventListener("click", closeClientAfterSale);

document.getElementById("client-after-sale-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const error = document.getElementById("client-after-sale-error");
  const items = [...document.querySelectorAll("[data-client-after-sale-garment]")].flatMap((row) => {
    if (!row.querySelector('input[type="checkbox"]').checked) return [];
    return [{
      garment_id: row.dataset.clientAfterSaleGarment,
      garment_name: row.dataset.garmentName,
      quantity: 1,
      demand: row.querySelector(".client-after-sale-demand").value.trim(),
    }];
  });
  if (!items.length) {
    showNotice(error, "error", "未選擇服裝", "請至少勾選一件需要退換或修改的服裝。");
    return;
  }
  const invalid = items.find((item) => !item.demand);
  if (invalid) {
    showNotice(error, "error", "資料未填完整", `${escapeClientHtml(invalid.garment_name)}：請填寫具體換貨 / 修改需求。`);
    return;
  }
  const store = loadSharedAdminStore() || {};
  const createdAt = nowClientText();
  store.afterSaleStatusVersion = 2;
  store.afterSales = Array.isArray(store.afterSales) ? store.afterSales : [];
  store.afterSales.push({
    id: clientUid("AS"),
    employee_id: currentEmployee.employeeId,
    employee_name: currentEmployee.name,
    employee_gender: currentEmployee.gender,
    employee_unit: currentEmployee.department,
    order_id: selectedAfterSaleOrderId,
    items,
    remark: new FormData(event.currentTarget).get("remark")?.trim() || "",
    source: "客戶端申請",
    status: "已登記",
    created_at: createdAt,
    updated_at: createdAt,
    status_history: [{ status: "已登記", changed_at: createdAt }],
  });
  localStorage.setItem(sharedAdminStoreKey, JSON.stringify(store));
  closeClientAfterSale();
  const records = document.getElementById("client-after-sale-records");
  records.insertAdjacentHTML("beforebegin", '<div class="notice success client-after-sale-success"><strong>登記成功</strong><span>退換申請已提交，狀態為「已登記」。</span></div>');
  window.setTimeout(() => document.querySelector(".client-after-sale-success")?.remove(), 3000);
});

document.querySelector('[name="is_pregnant"]').addEventListener("change", (event) => {
  const isPregnant = event.target.value === "yes";
  document.querySelector(".info-measure-fields").hidden = isPregnant;
  document.getElementById("pregnant-tip").hidden = !isPregnant;
});

document.getElementById("save-info").addEventListener("click", () => {
  const data = getConfirmFormData();
  const error = validateInfo(data);
  if (error) {
    showNotice(flowResult, "error", "資料校驗失敗", error);
    return;
  }
  if (data.isPregnant) {
    renderSummary(document.getElementById("confirm-summary"), data);
    setFlowPage(2);
    return;
  }
  setFlowPage(1);
});

document.querySelectorAll(".sku-row").forEach((row) => {
  const checkbox = row.querySelector('input[type="checkbox"]');
  const qty = row.querySelector(".sku-qty");
  checkbox.addEventListener("change", () => {
    qty.disabled = !checkbox.checked;
    qty.value = checkbox.checked ? "1" : "";
    updateSkuTotal();
  });
  qty.addEventListener("input", updateSkuTotal);
});

document.getElementById("save-sku").addEventListener("click", () => {
  const error = validateSku();
  if (error) {
    showNotice(flowResult, "error", "SKU 校驗失敗", error);
    return;
  }
  const data = getConfirmFormData();
  renderSummary(document.getElementById("confirm-summary"), data);
  setFlowPage(2);
});

document.querySelectorAll("[data-flow-back]").forEach((button) => {
  button.addEventListener("click", () => {
    const current = [...flowPages].findIndex((page) => page.classList.contains("is-active"));
    const data = getConfirmFormData();
    if (current === 2 && data.isPregnant) {
      setFlowPage(0);
      return;
    }
    setFlowPage(Math.max(0, current - 1));
  });
});

document.getElementById("go-signature").addEventListener("click", () => {
  if (!window.confirm("請確認以上服裝品類及數量無誤。簽字確認後，系統將記錄您的確認結果和簽字時間，您將無法自行修改。如需修改，請聯絡我司工作人員處理。")) {
    return;
  }
  setFlowPage(3);
});

const canvas = document.getElementById("signature-pad");
const ctx = canvas.getContext("2d");
ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.strokeStyle = "#1d2835";
let drawing = false;

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  return {
    x: (source.clientX - rect.left) * (canvas.width / rect.width),
    y: (source.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function startDrawing(event) {
  event.preventDefault();
  drawing = true;
  signatureDirty = true;
  const point = getCanvasPoint(event);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

function draw(event) {
  if (!drawing) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

function stopDrawing() {
  drawing = false;
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  signatureDirty = false;
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

document.getElementById("clear-signature").addEventListener("click", clearSignature);

document.getElementById("back-confirm").addEventListener("click", () => {
  flowResult.hidden = true;
  setFlowPage(2);
});

document.getElementById("submit-signature").addEventListener("click", () => {
  if (!signatureDirty) {
    showNotice(flowResult, "error", "請簽字確認", "請簽字確認");
    return;
  }

  confirmedData = {
    ...getConfirmFormData(),
    signatureImage: canvas.toDataURL("image/png"),
    signedAt: new Date().toLocaleString("zh-HK", { hour12: false }),
    confirmStatus: "confirmed",
  };
  persistSignatureConfirmation(confirmedData);
  renderSummary(document.getElementById("completed-summary"), confirmedData, true);
  renderSummary(document.getElementById("locked-summary"), confirmedData, true);
  setFlowPage(4);
});

document.getElementById("check-employee").addEventListener("click", () => {
  const form = document.getElementById("reset-form");
  const formData = new FormData(form);
  const orderId = formData.get("reset_order_id").trim();
  const employeeId = formData.get("reset_employee_id").trim();
  const result = document.getElementById("reset-result");
  const employee = sharedEmployee(orderId, employeeId) || employees[employeeId];

  if (!employee || employee.orderId !== orderId) {
    showNotice(result, "error", "未找到員工", "未找到該員工賬號，請聯絡管理員。");
    return;
  }

  document.getElementById("masked-phone").querySelector("strong").textContent = employee.maskedPhone;
  result.hidden = true;
  setResetPage(1);
});

renderSharedOrderOptions();

document.getElementById("send-code").addEventListener("click", (event) => {
  event.currentTarget.textContent = "驗證碼已發送";
  resetCodeSent = true;
  showNotice(document.getElementById("reset-result"), "", "驗證碼已發送", "原型模式下請輸入任意 6 位數字。");
});

document.getElementById("reset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const verifyCode = formData.get("verify_code").trim();
  const newPassword = formData.get("new_password").trim();
  const confirmPassword = formData.get("confirm_password").trim();
  const result = document.getElementById("reset-result");

  if (!resetCodeSent) {
    showNotice(result, "error", "請先獲取驗證碼", "請點擊獲取驗證碼後再提交新密碼。");
    return;
  }
  if (!/^\d{6}$/.test(verifyCode)) {
    showNotice(result, "error", "驗證碼錯誤", "驗證碼錯誤或已過期。");
    return;
  }
  if (newPassword.length < 6 || newPassword.length > 20) {
    showNotice(result, "error", "密碼格式錯誤", "請輸入 6-20 位新密碼。");
    return;
  }
  if (newPassword !== confirmPassword) {
    showNotice(result, "error", "兩次密碼不一致", "兩次輸入的密碼不一致。");
    return;
  }

  result.hidden = true;
  setResetPage(2);
});

document.getElementById("back-login").addEventListener("click", () => {
  const result = document.getElementById("reset-result");
  const sendCode = document.getElementById("send-code");

  document.getElementById("reset-form").reset();
  sendCode.textContent = "獲取驗證碼";
  resetCodeSent = false;
  result.hidden = true;
  setResetPage(0);
  switchView("login");
});

resetFlowForEmployee(employees.EMP001);

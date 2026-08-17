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
let selectedAppointmentOrderId = "";
const appointmentSelectorState = { address: "", date: "", slotId: "", calendarMonth: "", calendarOpen: false };
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
    profile.innerHTML = '<div class="empty-state"><strong>請先登入</strong><span>登入後即可查看訂單、申請記錄及量體預約。</span></div>';
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
        <button class="primary-action" type="button" data-open-appointment="${escapeClientHtml(order.order_id)}">量體預約</button>
      </div>
    </article>`).join("") : '<div class="empty-state"><strong>暫無可選訂單</strong><span>請聯絡工作人員核對員工的歸屬訂單。</span></div>';

  const employeeRecords = getEmployeeAfterSaleRecords();
  records.innerHTML = employeeRecords.length ? employeeRecords.map((record) => `
    <article class="after-sale-record-card">
      <div class="record-card-head"><strong>${escapeClientHtml(record.id)}</strong><span class="after-sale-status status-${afterSaleStatusClass(record.status)}">${escapeClientHtml(record.status)}</span></div>
      <p>${escapeClientHtml(record.order_id)} · ${escapeClientHtml(record.created_at)}</p>
      <div class="record-item-list">${(record.items || []).map((item) => `<div><strong>${escapeClientHtml(item.garment_name)}</strong><span>數量：${escapeClientHtml(item.quantity || 1)}</span><span>修改備註：${escapeClientHtml(item.demand || "-")}</span></div>`).join("")}</div>
      <p class="record-remark">整體備註：${escapeClientHtml(record.remark || "-")}</p>
    </article>`).join("") : '<div class="empty-state"><strong>暫無申請記錄</strong><span>員工到店修改後，由門市在管理後台錄入，記錄將顯示在此處。</span></div>';
}

function clientAppointmentBookings(store, slotId) {
  return (store?.appointments || []).filter((item) => item.slot_id === slotId && item.status === "booked");
}

function clientAppointmentTime(slot) {
  return `${slot.date} ${slot.start_time}–${slot.end_time}`;
}

function clientSlotOrderId(slot, store) {
  if (slot.order_id) return slot.order_id;
  return store?.orders?.length === 1 ? store.orders[0].order_id : "";
}

function appointmentMonthLabel(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

function renderAppointmentCalendar(dates) {
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))].sort();
  if (!months.includes(appointmentSelectorState.calendarMonth)) {
    appointmentSelectorState.calendarMonth = appointmentSelectorState.date?.slice(0, 7) || months[0];
  }
  const monthValue = appointmentSelectorState.calendarMonth;
  const [year, month] = monthValue.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const availableDates = new Set(dates);
  const cells = Array.from({ length: firstWeekday }, () => '<span class="appointment-calendar-day is-empty"></span>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthValue}-${String(day).padStart(2, "0")}`;
    const enabled = availableDates.has(date);
    cells.push(`<button class="appointment-calendar-day ${appointmentSelectorState.date === date ? "is-selected" : ""}" type="button" data-select-appointment-date="${date}" ${enabled ? "" : "disabled"} aria-label="${date}">${day}</button>`);
  }
  const monthIndex = months.indexOf(monthValue);
  return `<div class="appointment-calendar">
    <div class="appointment-calendar-head">
      <button type="button" data-calendar-month="${months[monthIndex - 1] || ""}" ${monthIndex <= 0 ? "disabled" : ""} aria-label="上一個月">‹</button>
      <strong>${appointmentMonthLabel(monthValue)}</strong>
      <button type="button" data-calendar-month="${months[monthIndex + 1] || ""}" ${monthIndex < 0 || monthIndex >= months.length - 1 ? "disabled" : ""} aria-label="下一個月">›</button>
    </div>
    <div class="appointment-calendar-week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
    <div class="appointment-calendar-grid">${cells.join("")}</div>
  </div>`;
}

function showAppointmentModal(title, message) {
  const modal = document.getElementById("appointment-modal");
  document.getElementById("appointment-modal-title").textContent = title;
  document.getElementById("appointment-modal-message").textContent = message;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector("button[data-close-appointment-modal]").focus();
}

function closeAppointmentModal() {
  document.getElementById("appointment-modal").hidden = true;
  document.body.classList.remove("modal-open");
}

function renderClientAppointments() {
  const profile = document.getElementById("appointment-profile-card");
  const slotList = document.getElementById("client-appointment-slots");
  const recordList = document.getElementById("client-appointment-records");
  const store = loadSharedAdminStore();
  if (!currentEmployee) {
    profile.innerHTML = '<div class="empty-state"><strong>請先登入</strong><span>登入後即可查看可預約時段並登記。</span></div>';
    slotList.innerHTML = '<button class="primary-action" type="button" data-jump="login">前往登入</button>';
    recordList.innerHTML = "";
    return;
  }
  const appointmentOrderId = selectedAppointmentOrderId || currentEmployee.orderId;
  const appointmentOrder = getClientOrders().find((order) => order.order_id === appointmentOrderId);
  profile.innerHTML = `<div><span>預約員工</span><strong>${escapeClientHtml(currentEmployee.employeeId)} · ${escapeClientHtml(currentEmployee.name)}</strong></div><div><span>對應訂單</span><strong>${escapeClientHtml(appointmentOrderId)}${appointmentOrder ? ` · ${escapeClientHtml(appointmentOrder.company_name)}` : ""}</strong></div>`;
  const orderSlots = [...(store?.appointmentSlots || [])].filter((slot) => clientSlotOrderId(slot, store) === appointmentOrderId);
  const slotIds = new Set(orderSlots.map((slot) => slot.id));
  const myAppointments = (store?.appointments || []).filter((item) => item.employee_id === currentEmployee.employeeId && item.status === "booked" && (item.order_id === appointmentOrderId || slotIds.has(item.slot_id)));
  const availableSlots = orderSlots.filter((slot) => {
    if (slot.status !== "enabled") return false;
    if (myAppointments.some((item) => item.slot_id === slot.id)) return false;
    const booked = clientAppointmentBookings(store, slot.id).length;
    if (booked >= Number(slot.max_bookings) && !slot.allow_overbook) return false;
    const cancelledBefore = (store?.appointments || []).some((item) => item.slot_id === slot.id && item.employee_id === currentEmployee.employeeId && item.status === "cancelled");
    if (cancelledBefore && !slot.allow_overbook) return false;
    return true;
  }).sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
  if (availableSlots.length) {
    const addresses = [...new Set(availableSlots.map((slot) => String(slot.address || "未設置地址").trim()))];
    if (!addresses.includes(appointmentSelectorState.address)) appointmentSelectorState.address = addresses[0];
    const addressSlots = availableSlots.filter((slot) => String(slot.address || "未設置地址").trim() === appointmentSelectorState.address);
    const dates = [...new Set(addressSlots.map((slot) => slot.date))].sort();
    if (!dates.includes(appointmentSelectorState.date)) appointmentSelectorState.date = dates[0];
    if (!dates.some((date) => date.startsWith(appointmentSelectorState.calendarMonth))) appointmentSelectorState.calendarMonth = appointmentSelectorState.date.slice(0, 7);
    const timeSlots = addressSlots.filter((slot) => slot.date === appointmentSelectorState.date);
    if (!timeSlots.some((slot) => slot.id === appointmentSelectorState.slotId)) appointmentSelectorState.slotId = "";
    slotList.innerHTML = `<section class="appointment-selector-card">
      <label class="appointment-selector-row"><span>量體地址</span><select id="appointment-address-select" aria-label="量體地址">${addresses.map((address) => `<option value="${escapeClientHtml(address)}" ${address === appointmentSelectorState.address ? "selected" : ""}>${escapeClientHtml(address)}</option>`).join("")}</select></label>
      <button class="appointment-selector-row appointment-date-row" type="button" data-open-appointment-calendar><span>預約日期</span><strong>${escapeClientHtml(appointmentSelectorState.date)}</strong></button>
      <div class="appointment-time-selector">
        <h2>預約時間段</h2>
        <div class="appointment-time-grid">${timeSlots.map((slot) => {
          const booked = clientAppointmentBookings(store, slot.id).length;
          const capacityText = `已預約 ${booked}/${Number(slot.max_bookings)}`;
          return `<button class="appointment-time-option ${appointmentSelectorState.slotId === slot.id ? "is-selected" : ""}" type="button" data-select-appointment-slot="${slot.id}"><strong>${escapeClientHtml(slot.start_time)}–${escapeClientHtml(slot.end_time)}</strong><span>${capacityText}</span></button>`;
        }).join("")}</div>
      </div>
      <button class="primary-action appointment-confirm-button" type="button" data-confirm-appointment ${appointmentSelectorState.slotId ? "" : "disabled"}>確認預約</button>
      ${appointmentSelectorState.calendarOpen ? `<div class="appointment-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-calendar-title">
        <button class="appointment-calendar-backdrop" type="button" data-close-appointment-calendar aria-label="關閉日期選擇"></button>
        <div class="appointment-calendar-dialog">
          <div class="appointment-calendar-title"><strong id="appointment-calendar-title">選擇預約日期</strong><button type="button" data-close-appointment-calendar aria-label="關閉">×</button></div>
          ${renderAppointmentCalendar(dates)}
        </div>
      </div>` : ""}
    </section>`;
  } else {
    appointmentSelectorState.address = "";
    appointmentSelectorState.date = "";
    appointmentSelectorState.slotId = "";
    appointmentSelectorState.calendarMonth = "";
    appointmentSelectorState.calendarOpen = false;
    slotList.innerHTML = `<div class="empty-state"><strong>暫無可預約時段</strong><span>${escapeClientHtml(appointmentOrderId)} 目前沒有可登記的服務時間。</span></div>`;
  }
  document.body.classList.toggle("calendar-open", appointmentSelectorState.calendarOpen);
  recordList.innerHTML = myAppointments.length ? myAppointments.map((booking) => {
    const slot = (store?.appointmentSlots || []).find((item) => item.id === booking.slot_id);
    return `<article class="appointment-record-card"><div><strong>${slot ? escapeClientHtml(clientAppointmentTime(slot)) : "時段已調整"}</strong><span>${slot ? escapeClientHtml(slot.address) : "請聯絡門店確認最新安排"}</span></div><button class="secondary-action" type="button" data-cancel-appointment="${booking.id}">取消預約</button></article>`;
  }).join("") : '<div class="empty-state"><strong>暫無預約</strong><span>從上方選擇服務時段完成登記。</span></div>';
}

function bookAppointment(slotId) {
  if (!currentEmployee) {
    switchView("login");
    return;
  }
  const store = loadSharedAdminStore();
  const slot = store?.appointmentSlots?.find((item) => item.id === slotId);
  const appointmentOrderId = selectedAppointmentOrderId || currentEmployee.orderId;
  if (!store || !slot || slot.status !== "enabled" || clientSlotOrderId(slot, store) !== appointmentOrderId) {
    window.alert("該時段已暫停或不存在，請刷新後重新選擇。");
    renderClientAppointments();
    return;
  }
  store.appointments = Array.isArray(store.appointments) ? store.appointments : [];
  if (store.appointments.some((item) => item.slot_id === slotId && item.employee_id === currentEmployee.employeeId && item.status === "booked")) {
    window.alert("您已預約此時段，無需重複登記。");
    renderClientAppointments();
    return;
  }
  const cancelledBefore = store.appointments.some((item) => item.slot_id === slotId && item.employee_id === currentEmployee.employeeId && item.status === "cancelled");
  if (cancelledBefore && !slot.allow_overbook) {
    window.alert("該預約取消後不可重新登記，請選擇其他可預約時段。");
    renderClientAppointments();
    return;
  }
  const booked = clientAppointmentBookings(store, slotId).length;
  if (booked >= Number(slot.max_bookings) && !slot.allow_overbook) {
    window.alert("該時段剛剛已滿額，請選擇其他服務時間。");
    renderClientAppointments();
    return;
  }
  if (!window.confirm(`確認預約 ${clientAppointmentTime(slot)}？\n地址：${slot.address}`)) return;
  store.appointments.push({
    id: clientUid("APB"),
    slot_id: slotId,
    employee_id: currentEmployee.employeeId,
    employee_name: currentEmployee.name,
    employee_unit: currentEmployee.department,
    order_id: appointmentOrderId,
    status: "booked",
    created_at: nowClientText(),
  });
  localStorage.setItem(sharedAdminStoreKey, JSON.stringify(store));
  renderClientAppointments();
  showAppointmentModal("預約登記成功", "門店將按此時段安排店員和裁縫師。");
}

function cancelAppointment(bookingId) {
  const store = loadSharedAdminStore();
  const booking = store?.appointments?.find((item) => item.id === bookingId && item.employee_id === currentEmployee?.employeeId && item.status === "booked");
  if (!booking || !window.confirm("確定取消此預約？取消後名額會立即釋放。")) return;
  booking.status = "cancelled";
  booking.cancelled_at = nowClientText();
  localStorage.setItem(sharedAdminStoreKey, JSON.stringify(store));
  renderClientAppointments();
  showAppointmentModal("預約已取消", "該時段名額已立即釋放。");
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
  if (viewName === "appointments") renderClientAppointments();
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
  selectedAppointmentOrderId = employee.orderId;
  appointmentSelectorState.address = "";
  appointmentSelectorState.date = "";
  appointmentSelectorState.slotId = "";
  appointmentSelectorState.calendarMonth = "";
  appointmentSelectorState.calendarOpen = false;
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
    showNotice(result, "success", "登入成功", "服裝確認已完成，您可查看申請記錄或前往量體預約。");
    window.setTimeout(() => switchView("orders"), 350);
    return;
  }
  showNotice(result, "success", "登入成功", "請選擇訂單後繼續服裝確認或前往量體預約。");
  window.setTimeout(() => switchView("orders"), 350);
});

document.getElementById("client-order-cards").addEventListener("click", (event) => {
  if (event.target.closest('[data-jump="login"]')) {
    switchView("login");
    return;
  }
  const appointmentButton = event.target.closest("[data-open-appointment]");
  if (appointmentButton) {
    selectedAppointmentOrderId = appointmentButton.dataset.openAppointment;
    appointmentSelectorState.address = "";
    appointmentSelectorState.date = "";
    appointmentSelectorState.slotId = "";
    appointmentSelectorState.calendarMonth = "";
    appointmentSelectorState.calendarOpen = false;
    switchView("appointments");
    return;
  }
  if (event.target.closest("[data-open-confirmation]")) {
    if (currentEmployee?.signatureConfirmation?.confirmStatus === "confirmed") switchView("locked");
    else switchView("flow");
  }
});

document.getElementById("client-appointment-slots").addEventListener("click", (event) => {
  const jump = event.target.closest("[data-jump]");
  if (jump) {
    switchView(jump.dataset.jump);
    return;
  }
  const slotButton = event.target.closest("[data-select-appointment-slot]");
  if (slotButton) {
    appointmentSelectorState.slotId = slotButton.dataset.selectAppointmentSlot;
    renderClientAppointments();
    return;
  }
  if (event.target.closest("[data-open-appointment-calendar]")) {
    appointmentSelectorState.calendarOpen = true;
    appointmentSelectorState.calendarMonth = appointmentSelectorState.date.slice(0, 7);
    renderClientAppointments();
    return;
  }
  if (event.target.closest("[data-close-appointment-calendar]")) {
    appointmentSelectorState.calendarOpen = false;
    renderClientAppointments();
    return;
  }
  const dateButton = event.target.closest("[data-select-appointment-date]");
  if (dateButton) {
    appointmentSelectorState.date = dateButton.dataset.selectAppointmentDate;
    appointmentSelectorState.slotId = "";
    appointmentSelectorState.calendarOpen = false;
    renderClientAppointments();
    return;
  }
  const monthButton = event.target.closest("[data-calendar-month]");
  if (monthButton && !monthButton.disabled) {
    appointmentSelectorState.calendarMonth = monthButton.dataset.calendarMonth;
    renderClientAppointments();
    return;
  }
  if (event.target.closest("[data-confirm-appointment]") && appointmentSelectorState.slotId) bookAppointment(appointmentSelectorState.slotId);
});

document.getElementById("client-appointment-slots").addEventListener("change", (event) => {
  if (event.target.id === "appointment-address-select") {
    appointmentSelectorState.address = event.target.value;
    appointmentSelectorState.date = "";
    appointmentSelectorState.slotId = "";
    appointmentSelectorState.calendarMonth = "";
    appointmentSelectorState.calendarOpen = false;
    renderClientAppointments();
  }
});

document.getElementById("appointment-modal").addEventListener("click", (event) => {
  if (event.target.closest("[data-close-appointment-modal]")) closeAppointmentModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.getElementById("appointment-modal").hidden) closeAppointmentModal();
  if (event.key === "Escape" && appointmentSelectorState.calendarOpen) {
    appointmentSelectorState.calendarOpen = false;
    renderClientAppointments();
  }
});

document.getElementById("client-appointment-records").addEventListener("click", (event) => {
  const button = event.target.closest("[data-cancel-appointment]");
  if (button) cancelAppointment(button.dataset.cancelAppointment);
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

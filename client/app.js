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

function switchView(viewName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewName);
  });
  views.forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
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
  const employee = employees[employeeId];

  if (!employee || employee.orderId !== orderId) {
    showNotice(result, "error", "登入失敗", "未找到該員工賬號，請確認訂單 / 項目和員工 ID。");
    return;
  }
  if (!password) {
    showNotice(result, "error", "登入失敗", "請輸入密碼。");
    return;
  }

  showNotice(result, "success", "登入成功", "請繼續補充個人資料並完成服裝需求確認。");
  resetFlowForEmployee(employee);
  window.setTimeout(() => switchView("flow"), 350);
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
  const employee = employees[employeeId];

  if (!employee || employee.orderId !== orderId) {
    showNotice(result, "error", "未找到員工", "未找到該員工賬號，請聯絡管理員。");
    return;
  }

  document.getElementById("masked-phone").querySelector("strong").textContent = employee.maskedPhone;
  result.hidden = true;
  setResetPage(1);
});

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

const pages = [...document.querySelectorAll(".page")];
const steps = [...document.querySelectorAll("#stepper li")];
const toast = document.getElementById("toast");
const employeeForm = document.getElementById("employee-form");
const orderSelect = document.getElementById("order-select");
const employeeQuery = employeeForm.elements.employee_id;
const employeeCard = document.getElementById("employee-card");
const archivePicker = document.getElementById("archive-picker");
const archiveOptions = document.getElementById("archive-options");
const measureForm = document.getElementById("measure-form");
const roster = document.getElementById("employee-roster");
const pinEmployee = document.getElementById("pin-employee");
const garmentTabs = document.getElementById("garment-tabs");
const workspaceSave = document.getElementById("workspace-save");
const workspaceReturn = document.getElementById("workspace-return");
const tailorTools = document.getElementById("tailor-tools");
const workspaceScreen = window.matchMedia("(min-width: 900px) and (orientation: landscape)");

const workspace = {
  drafts: new Map(),
  pins: new Set(),
  pinKey: "",
  query: "",
  entryPage: null,
};

const state = {
  page: 0,
  apiBase: "",
  token: "",
  tailorName: "",
  employee: null,
  archiveId: "",
  operation: null,
  lockedRecord: null,
  flow: [0, 1, 7, 2, 3, 4, 10, 9, 8],
};

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const otherProductSizeOptions = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const selectOptions = {
  size: sizeOptions,
  other_size: otherProductSizeOptions,
  suit_fit: ["修身A", "合體B", "寬鬆C"],
  female_suit_fit: ["修身", "寬鬆"],
  pants_fit: ["直筒", "修腳"],
  tie_length: ["正常", "加長"],
};
const radioOptions = {
  male_suit_size: ["46A", "46B", "46C", "48A", "48B", "48C", "50A", "50B", "50C", "52A", "52B", "52C", "54A", "54B", "54C", "54D", "不適用"],
  female_suit_size: ["155/82", "160/84", "160/88", "160/86", "160/90", "165/92", "165/94", "165/96", "170/98", "170/102", "170/104", "170/100", "170/108", "不適用"],
  female_pants_size: ["160/70", "165/72", "165/74", "165/76", "170/78", "170/80", "170/82", "170/84", "175/88", "170/86", "不適合"],
  male_sweater_size: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "不適用"],
  female_sweater_size: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "不適用"],
};
const adminStoreKey = "mc-measure-admin-prototype-state";
const commonRequiredFieldNames = new Set(["suit_size", "sweater_size"]);
const maleRequiredFieldNames = new Set(["shirt_collar", "suit_chest_body"]);
const femaleRequiredFieldNames = new Set(["suit_chest_body"]);

const mockEmployees = {
  EMP001: {
    order_id: "ORDER001",
    employee_id: "EMP001",
    customer_id: "CUST001",
    customer_name: "陳嘉儀",
    gender: "女",
    department: "澳門分部",
    branch: "總行",
    phone: "+85361234567",
    height_cm: "166",
    weight_kg: "54.5",
    wear_type: "female",
    measurement_list: [],
  },
  EMP002: {
    order_id: "ORDER001",
    employee_id: "EMP002",
    customer_id: "CUST002",
    customer_name: "李國輝",
    gender: "男",
    department: "香港分部",
    branch: "中環行",
    phone: "+85251234567",
    height_cm: "176",
    weight_kg: "72",
    wear_type: "male",
    measurement_list: [],
  },
};

function loadAdminStore() {
  try {
    return JSON.parse(localStorage.getItem(adminStoreKey)) || null;
  } catch {
    return null;
  }
}

function saveAdminStore(store) {
  localStorage.setItem(adminStoreKey, JSON.stringify(store));
}

function shouldUseServerApi() {
  return Boolean(state.apiBase);
}

function mockOrders() {
  const orderIds = [...new Set(Object.values(mockEmployees).map((employee) => employee.order_id))];
  return orderIds.map((orderId) => ({ order_id: orderId, company_name: orderId }));
}

async function loadOrders() {
  if (shouldUseServerApi()) {
    const res = await fetch(`${state.apiBase}/api/admin/state`);
    if (!res.ok) throw new Error("讀取訂單列表失敗");
    const data = await res.json();
    return data.orders || [];
  }
  const store = loadAdminStore();
  return store?.orders || mockOrders();
}

async function renderOrderOptions() {
  const select = document.getElementById("order-select");
  try {
    const orders = await loadOrders();
    select.innerHTML = `<option value="">請選擇訂單</option>${orders.map((order) => `<option value="${escapeHtml(order.order_id)}">${escapeHtml(order.order_id)}${order.company_name ? ` / ${escapeHtml(order.company_name)}` : ""}</option>`).join("")}`;
  } catch (error) {
    select.innerHTML = `<option value="">訂單讀取失敗</option>`;
    showToast(error.message);
  }
}

function getAdminEmployee(orderId, employeeId) {
  const store = loadAdminStore();
  const employee = store?.employees?.find((item) => item.order_id === orderId && item.employee_id === employeeId);
  if (!employee) return null;
  const order = store.orders?.find((item) => item.order_id === employee.order_id);
  return {
    order_id: employee.order_id,
    employee_id: employee.employee_id,
    customer_id: employee.id || employee.employee_id,
    customer_name: employee.name,
    gender: employee.gender,
    department: employee.unit_name,
    branch: order?.company_name || employee.company_name || "-",
    phone: employee.phone || "",
    email: employee.email || "",
    height_cm: employee.height_cm || "",
    weight_kg: employee.weight_kg || "",
    wear_type: employee.gender === "女" ? "female" : "male",
  };
}

function appendAdminMeasurement(record) {
  const store = loadAdminStore();
  if (!store) return;
  store.measurements = store.measurements || [];
  store.measurements.unshift(record);
  saveAdminStore(store);
}

const fieldGroups = {
  suit: [
    ["shirt_collar", "領圍（襯衫）", "number", "male"],
    ["suit_chest_body", "胸圍（淨體）", "number", "male"],
    ["suit_size", "尺碼", "male_suit_size", "male"],
    ["suit_fit", "版型", "suit_fit", "male"],
    ["suit_body_notes", "特體", "multi", "male", ["平肩", "溜肩", "大背骨", "駝背", "健身", "挺胸", "凸肚", "抬手不適，袖窿深抬高"]],
    ["suit_belly", "肚圍（淨體）", "number", "male"],
    ["suit_shoulder", "肩寬", "signed_number", "male"],
    ["suit_chest_garment", "胸圍（成衣）", "signed_number", "male"],
    ["suit_mid_waist_garment", "中腰（成衣）", "signed_number", "male"],
    ["suit_sleeve_length", "袖長（外套）", "signed_number", "male"],
    ["suit_sleeve_width", "袖肥", "number", "male"],
    ["suit_back_center_length", "後中長（外套）", "signed_number", "male"],
    ["suit_chest_body", "胸圍（淨體）", "number", "female"],
    ["suit_size", "尺碼", "female_suit_size", "female"],
    ["suit_fit", "版型", "female_suit_fit", "female"],
    ["suit_body_notes", "特體", "multi", "female", ["平肩", "溜肩", "大背骨", "駝背", "凸肚", "挺胸", "抬手不適，袖窿深抬高"]],
    ["suit_belly", "肚圍（淨體）", "number", "female"],
    ["suit_shoulder", "肩寬", "signed_number", "female"],
    ["suit_chest_garment", "胸圍（成衣）", "signed_number", "female"],
    ["suit_mid_waist_garment", "中腰（成衣）", "signed_number", "female"],
    ["suit_sleeve_length", "袖長（外套）", "signed_number", "female"],
    ["suit_inner_sleeve_length", "袖長（內上衣）", "number", "female"],
    ["suit_sleeve_width", "袖肥", "number", "female"],
    ["suit_back_center_length", "後中長（外套）", "signed_number", "female"],
    ["suit_inner_back_center_length", "後中長（內上衣）", "signed_number", "female"],
  ],
  pants: [
    ["pants_waist", "褲腰圍", "number", "male"],
    ["pants_fit", "習慣", "pants_fit", "male"],
    ["pants_body_notes", "特體", "multi", "male", ["翹臀", "平臀", "落臀"]],
    ["pants_hip_body", "臀圍（淨體）", "number", "male"],
    ["pants_crotch_body", "橫檔（淨體）", "number", "male"],
    ["pants_calf", "小腿圍（淨體）", "number", "male"],
    ["pants_length", "褲長", "number", "male"],
    ["pants_total_rise", "總浪", "number", "male"],
    ["pants_waist", "褲腰圍", "number", "female"],
    ["pants_size", "尺碼", "female_pants_size", "female"],
    ["pants_fit", "習慣", "pants_fit", "female"],
    ["pants_body_notes", "特體", "multi", "female", ["翹臀", "平臀", "落臀", "大腿加"]],
    ["pants_hip_body", "臀圍（淨體）", "number", "female"],
    ["pants_crotch_body", "橫檔（淨體）", "number", "female"],
    ["pants_calf", "小腿圍（淨體）", "number", "female"],
    ["pants_leg_opening", "腳口（成衣）", "number", "female"],
    ["pants_length", "褲長", "number", "female"],
    ["pants_total_rise", "總浪", "number", "female"],
    ["pants_waist_garment", "褲腰圍（成衣）", "number", "female"],
    ["pants_hip_garment", "臀圍（成衣）", "number", "female"],
    ["pants_crotch_garment", "橫檔（成衣）", "number", "female"],
    ["pants_total_rise_garment", "總浪（成衣）", "number", "female"],
    ["pants_mid", "中檔（成衣）", "number", "female"],
    ["pants_leg_opening_garment", "腳口（成衣）", "number", "female"],
    ["pants_length_garment", "褲長（成衣）", "number", "female"],
  ],
  shirt: [
    ["shirt_size", "尺碼", "size"],
    ["shirt_collar", "領圍", "number"],
    ["shirt_back_center_length", "後中長", "number"],
    ["shirt_chest_garment", "胸圍（成衣）", "number"],
    ["shirt_mid_waist_garment", "中腰（成衣）", "number"],
    ["shirt_shoulder", "肩寬", "number"],
    ["shirt_sleeve_length", "袖長", "number"],
    ["shirt_sleeve_width", "袖肥", "number"],
    ["shirt_cuff", "袖口", "number"],
  ],
  skirt: [
    ["skirt_length", "裙長", "number"],
  ],
  dress: [
    ["dress_front_length", "裙長（前長）", "number"],
  ],
  other: [
    ["tie_length", "領帶", "tie_length", "male"],
    ["sweater_size", "毛衣尺碼", "male_sweater_size", "male"],
    ["sweater_size", "毛衣尺碼", "female_sweater_size", "female"],
  ],
};

const fieldNotes = {
  male: {
    suit: {
      shirt_collar: "注意手勢在前中，加 2 指。同客人原領圍合適可覆製原領口。",
      suit_chest_body: "注意手勢在前中，加 2 指。",
      suit_size: "詢問客人習慣修身 / 寬鬆。填寫例：46B。",
      suit_fit: "詢問客人習慣修身 / 寬鬆。",
      suit_body_notes: "觀察上身特體情況。",
      suit_shoulder: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。注意袖和肩活動順暢。",
      suit_chest_garment: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
      suit_mid_waist_garment: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
      suit_sleeve_length: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。注意手勢在右側，虎口上 2cm，以客人意願為準。",
      suit_sleeve_width: "是否有加，不能減，沒有可不填。（最多 +2）注意手勢在右側。",
      suit_back_center_length: "外套標準頸椎點到腿根點，以客人意願為準。是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
    },
    pants: {
      pants_waist: "注意手勢在前中，加 2 指。",
      pants_fit: "詢問客人習慣。",
      pants_body_notes: "觀察下身特體情況。",
      pants_hip_body: "注意手勢在右側，加 2 指。",
      pants_crotch_body: "注意手勢在右側，加 1 指。",
      pants_calf: "注意手勢在右側，加 1 指。",
      pants_length: "注意手勢在右側，腰線提好褲腰，上口到腳底。",
      pants_total_rise: "詢問客人是否高腰，把腰線比劃出來確認。",
    },
  },
  female: {
    suit: {
      suit_chest_body: "注意手勢在前中，加 2 指。",
      suit_size: "詢問客人習慣修身 / 寬鬆。",
      suit_fit: "詢問客人習慣修身 / 寬鬆。",
      suit_body_notes: "觀察上身特體情況。",
      suit_shoulder: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。注意袖和肩活動順暢。",
      suit_chest_garment: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
      suit_mid_waist_garment: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
      suit_sleeve_length: "是否有加減，沒有可不填。填寫例：(2) 或 (-2)。注意在右側量，一般為虎口往上 2cm，以客人意願為準。",
      suit_inner_sleeve_length: "注意在右側量，量肩到手關節，九分尺寸。",
      suit_sleeve_width: "是否有加，不能減，沒有可不填。（最多 +2）注意在右側量。",
      suit_back_center_length: "外套標準頸椎骨到臀高點，以客人意願為準。是否有加減，沒有可不填。填寫例：(2) 或 (-2)。",
      suit_inner_back_center_length: "內上衣標準頸椎骨到臀高點上 5cm，以客人意願為準。",
    },
    pants: {
      pants_waist: "注意手勢在前中，加 2 指。",
      pants_size: "按標準套碼版選擇尺碼；沒有試可不填。",
      pants_body_notes: "觀察下身特體情況。",
      pants_hip_body: "注意手勢在右側，加 2 指。",
      pants_crotch_body: "注意手勢在右側，加 1 指。",
      pants_calf: "注意手勢在右側，加 1 指。",
      pants_leg_opening: "如客人有穿原工褲才量。全圍。",
      pants_length: "注意腰線。手勢在右側，提一下褲腰上口到腳底。",
      pants_total_rise: "詢問客人是否高腰，把腰線比劃出來確認。",
      pants_leg_opening_garment: "注意是全圍尺寸。",
    },
    skirt: {
      skirt_length: "注意腰線。手勢在右側，褲腰上口到膝上 3cm。",
    },
    dress: {
      dress_front_length: "右側肩頸點到膝上 3cm。",
    },
  },
};

function isFemaleEmployee() {
  return state.employee?.gender === "女";
}

function getFieldsForGroup(group) {
  const fields = (fieldGroups[group] || []).filter(([, , , genderLimit]) => {
    if (!genderLimit) return true;
    return genderLimit === "female" ? isFemaleEmployee() : !isFemaleEmployee();
  });
  const byName = new Map(fields.map((field) => [field[0], field]));
  const orderedNames = isFemaleEmployee()
    ? {
        suit: [
          "suit_chest_body",
          "suit_size",
          "suit_fit",
          "suit_body_notes",
          "suit_belly",
          "suit_shoulder",
          "suit_chest_garment",
          "suit_mid_waist_garment",
          "suit_sleeve_length",
          "suit_inner_sleeve_length",
          "suit_sleeve_width",
          "suit_back_center_length",
          "suit_inner_back_center_length",
        ],
        pants: [
          "pants_waist",
          "pants_size",
          "pants_fit",
          "pants_body_notes",
          "pants_hip_body",
          "pants_crotch_body",
          "pants_calf",
          "pants_leg_opening",
          "pants_length",
          "pants_total_rise",
          "pants_waist_garment",
          "pants_hip_garment",
          "pants_crotch_garment",
          "pants_total_rise_garment",
          "pants_mid",
          "pants_leg_opening_garment",
          "pants_length_garment",
        ],
        skirt: ["skirt_length"],
        dress: ["dress_front_length"],
        other: ["sweater_size"],
      }
    : {
        suit: [
          "shirt_collar",
          "suit_chest_body",
          "suit_size",
          "suit_fit",
          "suit_body_notes",
          "suit_belly",
          "suit_shoulder",
          "suit_chest_garment",
          "suit_mid_waist_garment",
          "suit_sleeve_length",
          "suit_sleeve_width",
          "suit_back_center_length",
        ],
        pants: [
          "pants_waist",
          "pants_fit",
          "pants_body_notes",
          "pants_hip_body",
          "pants_crotch_body",
          "pants_calf",
          "pants_length",
          "pants_total_rise",
        ],
        other: ["tie_length", "sweater_size"],
      };
  const names = orderedNames[group];
  if (!names) return fields;
  return names.map((name) => byName.get(name)).filter(Boolean);
}

function getMeasureHint(group) {
  const isFemale = isFemaleEmployee();
  const hints = {
    suit: isFemale ? "按女士表「上衣套碼」填寫；沒有調整可不填。" : "按男士表「上衣套碼」填寫；沒有調整可不填。",
    pants: isFemale ? "按女士表「褲子」填寫；沒有調整可不填。" : "按男士表「褲子」填寫；沒有調整可不填。",
    shirt: "提示：「領圍」建議優先量度。",
    skirt: "提示：「裙臀圍（成衣）」建議優先量度。",
    dress: isFemale ? "按女士表「連衣裙」填寫。" : "提示：建議依次量度「胸圍」-「中腰」-「臀圍」-「衣長」。",
    other: isFemale ? "請選擇毛衣尺碼。" : "請選擇領帶款式及毛衣尺碼。",
  };
  return hints[group] || "";
}

function getFieldNote(group, name) {
  const gender = isFemaleEmployee() ? "female" : "male";
  return fieldNotes[gender]?.[group]?.[name] || "";
}

function isRequiredField(name) {
  if (commonRequiredFieldNames.has(name)) return true;
  return isFemaleEmployee() ? femaleRequiredFieldNames.has(name) : maleRequiredFieldNames.has(name);
}

function showRequiredMark(name) {
  return isRequiredField(name) || name === "suit_belly";
}

function isFieldActive(name) {
  if (name !== "suit_belly") return true;
  return getValue("suit_body_notes").split("、").includes("凸肚");
}

function updateConditionalFields() {
  const bellyField = document.querySelector('[data-conditional-field="suit_belly"]');
  if (!bellyField) return;
  const input = bellyField.querySelector('[name="suit_belly"]');
  const active = isFieldActive("suit_belly");
  bellyField.hidden = !active;
  if (input) {
    input.disabled = !active;
    input.required = active;
    if (!active) input.value = "";
  }
}

function renderMeasureHints() {
  Object.keys(fieldGroups).forEach((group) => {
    const target = document.getElementById(`${group}-hint`);
    if (!target) return;
    target.textContent = getMeasureHint(group);
  });
}

const apiMap = {
  suit_chest_body: "chest_suit",
  suit_chest_garment: "front_chest_suit",
  suit_mid_waist_body: "top_waist_suit",
  suit_mid_waist_garment: "abdomen_suit",
  suit_shoulder: "shoulder_suit",
  suit_back_center_length: "back_length_suit",
  suit_sleeve_width: "sleeve_bicep_suit",
  suit_cuff: "sleeve_cuff_suit",
  suit_sleeve_length: "sleeve_length_suit",
  pants_waist: "bottom_waist_lower_trousers",
  pants_hip_body: "bottom_hip_lower_trousers",
  pants_hip_garment: "bottom_hip_lower_trousers",
  pants_crotch_body: "crotch_width_lower_trousers",
  pants_crotch_garment: "mid_thigh_lower_trousers",
  pants_mid: "knee_lower_trousers",
  pants_calf: "lower_leg_lower_trousers",
  pants_leg_opening: "hem_opening_lower_trousers",
  pants_total_rise: "full_rise_lower_trousers",
  pants_length: "trouser_length_lower_trousers",
  shirt_collar: "neck_shirt",
  shirt_back_center_length: "back_length_shirt",
  shirt_chest_garment: "chest_shirt",
  shirt_mid_waist_garment: "top_waist_shirt",
  shirt_shoulder: "shoulder_shirt",
  shirt_sleeve_length: "sleeve_length_shirt",
  shirt_sleeve_width: "sleeve_bicep_shirt",
  shirt_cuff: "sleeve_cuff_shirt",
  skirt_waist: "bottom_waist_lower_dress",
  skirt_hip_garment: "bottom_hip_lower_dress",
  skirt_length: "trouser_length_lower_dress",
  dress_chest_garment: "chest_shirt",
  dress_mid_waist_garment: "top_waist_shirt",
  dress_shoulder: "shoulder_shirt",
  dress_sleeve_length: "sleeve_length_shirt",
  dress_sleeve_width: "sleeve_bicep_shirt",
  dress_cuff: "sleeve_cuff_shirt",
};

function renderFields() {
  renderMeasureHints();
  Object.keys(fieldGroups).forEach((group) => {
    const fields = getFieldsForGroup(group);
    const target = document.getElementById(`${group}-fields`);
    target.innerHTML = fields.map(([name, label, type, , options]) => {
      const fieldId = `field-${group}-${name}`;
      const note = getFieldNote(group, name);
      const noteHtml = note ? `<small class="field-note">${note}</small>` : "";
      const required = isRequiredField(name);
      const requiredHtml = showRequiredMark(name) ? `<strong class="required-mark">*</strong>` : "";
      const requiredAttr = required ? " required" : "";
      const conditionalAttrs = name === "suit_belly" ? ' data-conditional-field="suit_belly" hidden' : "";
      let input = "";
      if (type === "number" || type === "signed_number") {
        input = `<div class="unit-input"><input id="${fieldId}" name="${name}" type="text" pattern="-?\\d+(\\.\\d)?" autocomplete="off" autocapitalize="off" spellcheck="false"${requiredAttr} /></div>`;
      } else if (type === "multi") {
        input = `<div class="inline-options">${options.map((option) => `<label><input name="${name}" type="checkbox" value="${option}" /> ${option}</label>`).join("")}</div>`;
      } else if (radioOptions[type]) {
        input = `<div class="inline-options">${radioOptions[type].map((option) => `<label><input name="${name}" type="radio" value="${option}"${requiredAttr} /> ${option}</label>`).join("")}</div>`;
      } else if (selectOptions[type]) {
        input = `<select id="${fieldId}" name="${name}"${requiredAttr}><option value="">${required ? "請選擇" : "不選"}</option>${selectOptions[type].map((option) => `<option value="${option}">${option}</option>`).join("")}</select>`;
      } else {
        input = `<input id="${fieldId}" name="${name}" autocomplete="off"${requiredAttr} />`;
      }
      const titleHtml =
        type === "multi" || radioOptions[type]
          ? `<div class="measure-title"><span>${label}${requiredHtml}</span>${noteHtml}</div>`
          : `<div class="measure-title"><label class="measure-label" for="${fieldId}">${label}${requiredHtml}</label>${noteHtml}</div>`;
      if (type === "multi" || radioOptions[type]) return `<div class="field measure-field is-wide"${conditionalAttrs}>${titleHtml}<div class="field-control">${input}</div></div>`;
      return `<div class="field measure-field"${conditionalAttrs}>${titleHtml}<div class="field-control">${input}</div></div>`;
    }).join("");
    updateConditionalFields();
  });
}

function configureFlowForEmployee(productDraft) {
  const isFemale = isFemaleEmployee();
  const configured = TailorProducts.start(productDraft);
  state.flow = isFemale ? [0, 1, 2, 3, 5, 6, 10, 9, 8] : [0, 1, 2, 3, 10, 9, 8];
  if (configured) state.flow = [0, 1, 11, 9, 8];
  const labels = configured ? ["登入", "基本資料", "產品量身", "確認提交", "完成"] : isFemale
    ? ["登入", "基本資料", "上衣套碼", "褲子", "一步裙", "連衣裙", "其它產品", "確認提交", "完成"]
    : ["登入", "基本資料", "上衣套碼", "褲子", "其它產品", "確認提交", "完成"];
  steps.forEach((step, index) => {
    step.textContent = labels[index] || "";
    step.hidden = index >= labels.length;
    step.dataset.flowIndex = String(index);
    step.setAttribute("role", "button");
    step.tabIndex = index < labels.length ? 0 : -1;
  });
  updatePageStepLabels(isFemale);
}

function updatePageStepLabels(isFemale) {
  const labelsByPage = isFemale
    ? { 2: "Step 1", 3: "Step 2", 5: "Step 3", 6: "Step 4", 10: "Step 5", 9: "Final Check" }
    : { 2: "Step 1", 3: "Step 2", 10: "Step 3", 9: "Final Check" };
  Object.entries(labelsByPage).forEach(([pageId, label]) => {
    const target = document.querySelector(`.page[data-page="${pageId}"] .section-head p`);
    if (target) target.textContent = label;
  });
}

function currentFlowIndex(pageId = state.page) {
  return state.flow.indexOf(pageId);
}

function setPage(pageId) {
  if (pageId === 1 && !shouldUseServerApi()) {
    rememberWorkspaceEmployee();
    state.operation = null;
    state.lockedRecord = null;
  }
  state.page = pageId;
  if (state.flow.slice(2, -2).includes(pageId)) workspace.entryPage = pageId;
  tailorTools.hidden = pageId === 0 || !state.token || shouldUseServerApi();
  pages.forEach((page) => page.classList.toggle("is-active", Number(page.dataset.page) === pageId));
  const activeIndex = currentFlowIndex(pageId);
  steps.forEach((step, stepIndex) => {
    step.classList.toggle("is-current", stepIndex === activeIndex);
    step.classList.toggle("is-done", stepIndex < activeIndex);
  });
  if (pageId === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
  syncWorkspaceLayout();
  archivePicker.hidden = pageId !== 1 || !state.employee || shouldUseServerApi();
  if (!archivePicker.hidden) renderArchivePicker();
  document.getElementById("new-record").textContent = shouldUseServerApi() ? "錄入下一筆" : "返回檔案列表";
  document.getElementById("save-notice").textContent = state.operation?.mode === "edit"
    ? `保存後將更新 V${state.operation.version}。`
    : "保存後將建立一筆新量體記錄。";
  if (isWorkspace()) {
    renderWorkspace();
    document.querySelector(".measurement-body").scrollTop = 0;
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

async function request(path, options = {}) {
  const res = await fetch(`${state.apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.message && data.message !== "success" && !data.jwt && !data.measurement_id)) {
    throw new Error(data.message || "請求失敗");
  }
  return data;
}

function normalizeGender(employee) {
  const raw = String(employee.gender || employee.wear_type || employee.cloth_type || "").toLowerCase();
  if (raw === "male" || raw === "男") return "男";
  if (raw === "female" || raw === "女") return "女";
  return employee.gender || "-";
}

function normalizeEmployee(data, orderId, employeeId) {
  return {
    order_id: orderId,
    employee_id: employeeId,
    customer_id: data.customer_id || data.customerId || "",
    customer_name: data.customer_name || data.customerName || data.name || "",
    gender: normalizeGender(data),
    department: data.department || data.division || "-",
    branch: data.branch || data.store || data.row_name || "-",
    phone: data.phone || "",
    email: data.email || "",
    height_cm: data.height_cm || data.heightCm || "",
    weight_kg: data.weight_kg || data.weightKg || "",
    wear_type: data.wear_type || data.cloth_type || "",
    measurement_list: data.measurement_list || [],
  };
}

function renderEmployee(employee) {
  const rows = [
    ["姓名", employee.customer_name],
    ["員工編號", employee.employee_id],
    ["性別", employee.gender],
    ["身高", employee.height_cm && `${employee.height_cm} cm`],
    ["體重", employee.weight_kg && `${employee.weight_kg} kg`],
    ["部門", employee.department],
    ["電話", employee.phone],
    ["郵箱", employee.email, "employee-email"],
    ["行名", employee.branch],
  ];
  employeeCard.hidden = false;
  employeeCard.innerHTML = `<div class="info-grid">${rows.map(([label, value, className]) => `<div${className ? ` class="${className}"` : ""}><span>${label}</span><strong>${escapeHtml(value || "—")}</strong></div>`).join("")}</div>`
    + (shouldUseServerApi() ? "" : `<div class="employee-edit-actions">
      <button type="button" class="secondary-action" data-edit-profile="size">修改身高體重</button>
      <button type="button" class="secondary-action" data-edit-profile="department">修改部門</button>
    </div>`);
}

function matchesEmployee(record, employee) {
  return record.employee?.order_id === employee.order_id && record.employee?.employee_id === employee.employee_id;
}

function archiveEntries(store, employee) {
  const records = (store?.measurements || []).filter(record => matchesEmployee(record, employee));
  // Older tailor records have no version. Keep existing numbers, including removed versions.
  const used = new Set(records.map(record => Number(record.version)).filter(version => Number.isFinite(version) && version > 0));
  let nextLegacy = 1;
  return records.reverse().map(record => {
    let version = Number(record.version);
    if (!Number.isFinite(version) || version <= 0) {
      while (used.has(nextLegacy)) nextLegacy++;
      version = nextLegacy++;
    }
    return {record, version};
  }).sort((a, b) => b.version - a.version);
}

function visibleArchives() {
  return archiveEntries(loadAdminStore(), state.employee).filter(({record}) => !record.archive_removed_at);
}

function archiveMetadata({record, version}) {
  return `<span><small>版本號</small><strong>V${version}</strong></span>
    <span><small>建立時間</small><strong>${escapeHtml(record.created_at || record.measured_at || "—")}</strong></span>
    <span><small>裁縫師</small><strong>${escapeHtml(record.tailor_name || "—")}</strong></span>`;
}

function renderArchivePicker() {
  const entries = visibleArchives();
  if (!entries.some(({record}) => record.measurement_id === state.archiveId)) {
    state.archiveId = entries[0]?.record.measurement_id || "";
  }
  document.getElementById("archive-count").textContent = `共 ${entries.length} 個版本`;
  archiveOptions.innerHTML = entries.map(entry => `<label class="archive-option">
    <input type="radio" name="archive-version" value="${escapeHtml(entry.record.measurement_id)}" ${entry.record.measurement_id === state.archiveId ? "checked" : ""} />
    ${archiveMetadata(entry)}
  </label>`).join("") || '<p class="roster-empty">目前沒有量體檔案，可錄入第一份。</p>';
  for (const mode of ["edit", "copy"]) {
    archivePicker.querySelector(`[data-archive-action="${mode}"]`).disabled = !state.archiveId;
  }
  archivePicker.querySelector('[data-archive-action="resume"]').hidden = !workspace.drafts.has(employeeKey(state.employee.order_id, state.employee.employee_id));
  document.getElementById("open-archive-history").disabled = !entries.length;
}

function isWorkspace() {
  return workspaceScreen.matches && state.page !== 0 && Boolean(state.token) && !shouldUseServerApi();
}

function syncWorkspaceLayout() {
  const shell = document.querySelector(".app-shell");
  const header = shell.querySelector(".app-header");
  const active = isWorkspace();
  if (active === shell.classList.contains("is-workspace")) return;
  shell.classList.toggle("is-workspace", active);
  document.querySelectorAll(".workspace-only").forEach(element => { element.hidden = !active; });
  document.getElementById("stepper").hidden = active;
  document.getElementById("employee-query-label").textContent = active ? "查詢員工" : "員工編號";
  employeeQuery.required = !active;
  employeeQuery.placeholder = active ? "輸入員工編號或姓名" : "";
  if (active) {
    header.insertBefore(tailorTools, document.getElementById("session-chip"));
    garmentTabs.before(employeeCard);
    document.querySelector(".workspace-empty").after(archivePicker);
    orderSelect.value = state.employee?.order_id || orderSelect.value || (orderSelect.options.length === 2 ? orderSelect.options[1].value : "");
    employeeQuery.value = workspace.query;
    window.scrollTo(0, 0);
  } else {
    header.after(tailorTools);
    employeeForm.after(employeeCard);
    employeeCard.after(archivePicker);
    garmentTabs.hidden = true;
    employeeQuery.value = state.employee?.employee_id || "";
  }
}

function employeeKey(orderId, employeeId) {
  return JSON.stringify([orderId, employeeId]);
}

function measurementRows(store, orderId) {
  const orders = new Set((store.orders || []).map(order => order.order_id));
  const measured = new Set((store.measurements || [])
    .filter(record => record.employee && !record.archive_removed_at)
    .map(({employee}) => employeeKey(employee.order_id, employee.employee_id)));
  const rows = new Map();
  for (const employee of store.employees || []) {
    if (!orders.has(employee.order_id) || (orderId && employee.order_id !== orderId)) continue;
    const key = employeeKey(employee.order_id, employee.employee_id);
    if (!rows.has(key)) rows.set(key, {employee, measured: measured.has(key)});
  }
  return [...rows.values()];
}

function readWorkspacePins() {
  try {
    workspace.pins = new Set(JSON.parse(localStorage.getItem(workspace.pinKey) || "[]"));
  } catch {
    workspace.pins = new Set();
  }
}

function renderRoster() {
  const orderId = orderSelect.value;
  const employees = orderId ? measurementRows(loadAdminStore() || {}, orderId) : [];
  const selected = state.employee?.employee_id;
  const rows = employees.filter(({employee}) => [employee.employee_id, employee.name]
    .some(value => String(value || "").toLowerCase().includes(workspace.query)))
    .map(row => {
      const {employee} = row;
      const key = employeeKey(orderId, employee.employee_id);
      return { ...row, pinned: workspace.pins.has(key), draft: workspace.drafts.get(key) };
    }).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  document.getElementById("roster-count").textContent = orderId ? `${rows.length} 人` : "";
  const focusedId = roster.contains(document.activeElement) ? document.activeElement.dataset.employeeId : null;
  roster.innerHTML = rows.map(({ employee, measured, pinned, draft }) => {
    const active = orderId === state.employee?.order_id && employee.employee_id === selected;
    let status = measured ? "已錄入" : "待錄入";
    if (active && state.operation && !state.lockedRecord) status = "錄入中";
    else if (draft?.hasInput) status = "草稿";
    return `<button type="button" class="roster-employee" data-employee-id="${escapeHtml(employee.employee_id)}" aria-pressed="${active}">
      <span class="roster-name">${escapeHtml(employee.name || "未填寫姓名")}</span>
      <span class="roster-id">${escapeHtml(employee.employee_id)}</span>
      ${pinned ? '<span class="roster-pin" aria-label="已置頂" title="已置頂">★</span>' : ""}
      <span class="roster-status" data-status="${status}">${status}</span>
    </button>`;
  }).join("") || `<p class="roster-empty">${!orderId ? "請先選擇訂單。" : workspace.query ? "沒有符合查詢條件的員工。" : "此訂單暫無員工。"}</p>`;
  if (focusedId) [...roster.querySelectorAll("button")].find(button => button.dataset.employeeId === focusedId)?.focus({ preventScroll: true });
}

function renderWorkspace() {
  renderRoster();
  const employee = state.employee;
  const pinned = employee && workspace.pins.has(employeeKey(employee.order_id, employee.employee_id));
  pinEmployee.hidden = !employee;
  pinEmployee.setAttribute("aria-pressed", String(Boolean(pinned)));
  pinEmployee.textContent = pinned ? "★ 取消置頂" : "☆ 置頂員工";
  document.querySelector(".workspace-empty").hidden = Boolean(employee);
  document.querySelector(".workspace-actions").hidden = !state.operation || state.page === 8;
  const context = document.getElementById("workspace-archive-context");
  context.hidden = !state.operation;
  context.textContent = archiveOperationLabel();
  workspaceReturn.hidden = state.page !== 9;
  workspaceSave.textContent = state.page === 9 ? "保存錄入" : "核對並保存";
  garmentTabs.hidden = !state.operation || TailorProducts.enabled() || state.page === 8;
  garmentTabs.innerHTML = garmentTabs.hidden ? "" : state.flow.slice(2, -2).map(page => {
    const label = { 2: "上衣", 3: "褲裝", 5: "一步裙", 6: "連衣裙", 10: "其它產品" }[page];
    return `<button type="button" data-garment-page="${page}" class="${state.page === page ? "is-active" : ""}" aria-pressed="${state.page === page}">${label}</button>`;
  }).join("");
}

function rememberWorkspaceEmployee() {
  if (!state.employee || !state.operation || state.lockedRecord) return;
  const fields = workspaceDraftFields();
  const values = new Map();
  for (const field of fields) {
    if ((field.type === "checkbox" || field.type === "radio") ? !field.checked : !field.value) continue;
    if (!values.has(field.name)) values.set(field.name, []);
    values.get(field.name).push(field.value);
  }
  const products = TailorProducts.draft();
  const hasInput = values.size > 0 || products.hasInput;
  workspace.drafts.set(employeeKey(state.employee.order_id, state.employee.employee_id), {
    values, products, hasInput, operation: state.operation, entryPage: workspace.entryPage, page: state.page,
  });
}

function workspaceDraftFields() {
  return [...measureForm.elements].filter(field => field.name && !field.closest("#configured-products")
    && (field.name === "body_notes" || state.flow.includes(Number(field.closest(".page")?.dataset.page))));
}

function selectWorkspaceEmployee(employeeId) {
  const orderId = orderSelect.value;
  if (state.employee?.order_id === orderId && state.employee.employee_id === employeeId) return;
  const raw = getAdminEmployee(orderId, employeeId);
  if (!raw) { renderRoster(); showToast("未找到該員工"); return; }
  toast.hidden = true;
  openLocalEmployee(raw, orderId, employeeId);
}

function openLocalEmployee(raw, orderId, employeeId) {
  rememberWorkspaceEmployee();
  state.employee = normalizeEmployee(raw, orderId, employeeId);
  state.archiveId = "";
  state.operation = null;
  state.lockedRecord = null;
  workspace.entryPage = null;
  document.getElementById("confirm-employee").hidden = true;
  renderEmployee(state.employee);
  setPage(1);
}

function archiveOperationLabel() {
  const operation = state.operation;
  if (!operation) return "";
  if (operation.mode === "edit") return `修改 V${operation.version}`;
  if (operation.mode === "copy") return `複製 V${operation.version} 並另存新檔案`;
  return "錄入新檔案";
}

function archivedRemark(record) {
  if (record.remark != null) return record.remark;
  const remark = record.final_remark || "";
  const notes = record.body_notes || [];
  if (!notes.length) return remark;
  const prefix = `特殊體型：${notes.join("、")}`;
  return remark === prefix ? "" : remark.startsWith(`${prefix}；`) ? remark.slice(prefix.length + 1) : remark;
}

function startArchiveOperation(mode) {
  const key = employeeKey(state.employee.order_id, state.employee.employee_id);
  const savedDraft = workspace.drafts.get(key);
  const draft = mode === "resume" ? savedDraft : null;
  const entry = mode === "edit" || mode === "copy" ? visibleArchives().find(({record}) => record.measurement_id === state.archiveId) : null;
  if ((mode === "edit" || mode === "copy") && !entry) {
    renderArchivePicker();
    showToast("請重新選擇量體檔案");
    return;
  }
  if (!draft && savedDraft?.hasInput && !window.confirm("開始新的操作將清除這位員工的未保存草稿。是否繼續？")) return;
  const source = entry?.record;
  let products;
  try {
    products = draft?.products || (source ? TailorProducts.archiveDraft(source) : undefined);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const values = draft?.values || new Map();
  if (source) {
    for (const [name, value] of Object.entries(source.measurements || {})) values.set(name, [String(value ?? "")]);
    values.set("remark", [archivedRemark(source)]);
    values.set("body_notes", source.body_notes || []);
  }
  workspace.drafts.delete(key);
  state.operation = draft?.operation || {mode, source, version: entry?.version};
  state.lockedRecord = null;
  workspace.entryPage = draft?.entryPage || null;
  measureForm.reset();
  configureFlowForEmployee(products);
  renderFields();
  for (const field of workspaceDraftFields()) {
    const fieldValues = values.get(field.name);
    if (!fieldValues) continue;
    if (field.type === "checkbox") field.checked = fieldValues.flatMap(value => value.split(/[、，,]/)).includes(field.value);
    else if (field.type === "radio") field.checked = fieldValues.includes(field.value);
    else field.value = fieldValues[0] || "";
  }
  updateConditionalFields();
  setPage(state.flow.includes(draft?.page) ? draft.page : state.flow[2]);
}

function getValue(name) {
  const fields = [...document.querySelectorAll(`[name="${name}"]`)];
  if (!fields.length) return "";
  if (fields[0].type === "checkbox") {
    return fields.filter((field) => field.checked).map((field) => field.value).join("、");
  }
  if (fields[0].type === "radio") {
    return fields.find((field) => field.checked)?.value || "";
  }
  return fields[0].value.trim() || "";
}

function selectedBodyNotes() {
  return [...document.querySelectorAll('[name="body_notes"]:checked')].map((item) => item.value);
}

function combinedBodyNotes(values = {}) {
  const notes = selectedBodyNotes();
  ["suit_body_notes", "pants_body_notes"].forEach((key) => {
    if (!values[key]) return;
    String(values[key]).split(/[、，,]/).forEach((note) => {
      if (note && !notes.includes(note)) notes.push(note);
    });
  });
  return notes;
}

function beijingNowParts() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(d);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function beijingNowWithSeconds() {
  const parts = beijingNowParts();
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function beijingNowIsoOffset() {
  const parts = beijingNowParts();
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function displayTimeToBeijingIso(value) {
  const normalized = String(value || "").trim().replace(" ", "T");
  return normalized ? `${normalized}+08:00` : beijingNowIsoOffset();
}

function isoNowWithSeconds() {
  return beijingNowWithSeconds();
}

function localNowWithSeconds() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function validateGroup(group) {
  const missing = getFieldsForGroup(group).find(([name]) => {
    if (!isFieldActive(name)) return false;
    if (isRequiredField(name) && !getValue(name)) {
      if (state.operation?.mode === "edit" && !state.operation.source.measurements?.[name]) return false;
      return true;
    }
    if (name === "suit_belly" && !getValue(name)) return true;
    return false;
  });
  if (missing) return `「${missing[1]}」為必填。`;

  const invalid = getFieldsForGroup(group).find(([name, , type, , options]) => {
    if (!isFieldActive(name)) return false;
    const raw = getValue(name);
    if (!raw) return false;
    if (type === "multi") return raw.split("、").some((value) => !options.includes(value));
    if (radioOptions[type]) return !radioOptions[type].includes(raw);
    if (selectOptions[type]) return !selectOptions[type].includes(raw);
    if (type !== "number" && type !== "signed_number") return false;
    return !/^-?\d+(\.\d)?$/.test(raw);
  });
  if (invalid && invalid[2] === "multi") return `「${invalid[1]}」包含無效選項。`;
  if (invalid && radioOptions[invalid[2]]) return `「${invalid[1]}」只能選擇 ${radioOptions[invalid[2]].join("、")}。`;
  if (invalid && selectOptions[invalid[2]]) return `「${invalid[1]}」只能選擇 ${selectOptions[invalid[2]].join("、")}。`;
  if (invalid && (invalid[2] === "number" || invalid[2] === "signed_number")) return `「${invalid[1]}」需為數字，可為負值，最多 1 位小數。`;
  if (invalid) return `「${invalid[1]}」格式不正確。`;
  return "";
}

function activeGarmentGroups() {
  return state.flow
    .map((pageId) => document.querySelector(`.page[data-page="${pageId}"]`)?.dataset.garment)
    .filter(Boolean);
}

function buildRecord() {
  const source = state.operation?.source;
  const values = {...source?.measurements};
  activeGarmentGroups().forEach((group) => {
    getFieldsForGroup(group).forEach(([name, , type]) => {
      const value = getValue(name);
      const choices = radioOptions[type] || selectOptions[type];
      const preserveLegacyChoice = choices && !value && values[name] && !choices.includes(String(values[name]));
      if (!preserveLegacyChoice) delete values[name];
      if (isFieldActive(name) && value) values[name] = value;
    });
  });
  const products = TailorProducts.enabled() ? TailorProducts.record() : {};
  for (const product of products.product_measurements || []) {
    for (const field of product.fields) delete values[`${product.product_id}.${field.field_id}`];
  }
  const bodyNotes = combinedBodyNotes(values);
  const representedNotes = new Set([
    ...[...measureForm.querySelectorAll('[name="body_notes"]')].map(field => field.value),
    ...String(source?.measurements?.suit_body_notes || "").split(/[、，,]/),
    ...String(source?.measurements?.pants_body_notes || "").split(/[、，,]/),
  ]);
  for (const note of source?.body_notes || []) {
    if (!representedNotes.has(note) && !bodyNotes.includes(note)) bodyNotes.push(note);
  }
  const remark = getValue("remark");
  const {measurement_list, ...employee} = state.employee;
  return {
    locked: Boolean(state.lockedRecord),
    tailor_name: state.tailorName,
    measured_at: state.lockedRecord?.measured_at || "",
    employee: shouldUseServerApi() ? state.employee : employee,
    ...products,
    measurements: {...values, ...products.measurements},
    body_notes: bodyNotes,
    remark,
    final_remark: [bodyNotes.length ? `特殊體型：${bodyNotes.join("、")}` : "", remark].filter(Boolean).join("；"),
    unit: "cm",
  };
}

function buildApiPayload(record) {
  const payload = {
    order_id: record.employee.order_id,
    employee_id: record.employee.employee_id,
    measure_type: "measure",
    remark: record.final_remark,
    client_submitted_at: beijingNowIsoOffset(),
    timezone: "Asia/Shanghai",
    template_payload: record,
  };
  Object.entries(record.measurements).forEach(([key, raw]) => {
    const apiKey = apiMap[key];
    if (!apiKey || raw === "") return;
    const value = Number(raw);
    payload[apiKey] = Number.isNaN(value) ? raw : value;
  });
  return payload;
}

function renderSummary(target, record) {
  if (!record.employee) return;
  const measuredAt = record.measured_at || "提交後由服務器生成";
  const rows = [
    ["裁縫師", record.tailor_name || "-"],
    ["量體時間", measuredAt],
    ["員工編號", record.employee.employee_id],
    ["姓名", record.employee.customer_name || "-"],
    ["性別", record.employee.gender],
    ["分區", record.employee.department],
    ["行名", record.employee.branch],
    ["特殊體型", record.body_notes.length ? record.body_notes.join("、") : "未選擇"],
  ];
  if (record.version || state.operation) rows.unshift(["量體檔案", record.version ? `V${record.version}` : archiveOperationLabel()]);
  const fields = activeGarmentGroups().flatMap(getFieldsForGroup).filter(([name]) => record.measurements[name]);
  const measurements = fields.length ? `<section class="product-summary"><h3>本次錄入</h3>${fields.map(([name, label, type]) => `<div><span>${label}</span><strong>${escapeHtml(record.measurements[name])}${type === "number" || type === "signed_number" ? " cm" : ""}</strong></div>`).join("")}</section>` : "";
  target.innerHTML = `<div class="summary-grid">${rows.map(([k, v]) => `<div><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}</div>` + measurements + TailorProducts.summary(record);
}

function resetForNextRecord() {
  TailorProducts.reset();
  state.employee = null;
  state.archiveId = "";
  state.operation = null;
  state.lockedRecord = null;
  workspace.entryPage = null;
  employeeCard.hidden = true;
  document.getElementById("confirm-employee").disabled = true;
  measureForm.reset();
  updateConditionalFields();
  setPage(1);
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.apiBase = String(form.get("api_base") || "").replace(/\/$/, "");
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "").trim();

  try {
    if (shouldUseServerApi()) {
      const data = await request("/tailor/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      state.token = data.jwt || "";
      state.tailorName = data.user_name || username;
    } else {
      const store = loadAdminStore() || MeasureWorkflow.read();
      const tailor = store?.tailors?.find((item) => item.username === username);
      if (store && !tailor) throw new Error("未找到該裁縫師賬號");
      state.token = "mock-token";
      state.tailorName = tailor?.name || username;
      workspace.pinKey = `mc-tailor-workspace-pins:${username}`;
      readWorkspacePins();
      dashboardFiltersAccount = username;
      temporaryDashboardFilters.clear();
      dashboardWorkspaceOrder = undefined;
    }
    workspace.drafts.clear();
    workspace.query = "";
    employeeQuery.value = "";
    document.getElementById("session-chip").textContent = state.tailorName;
    await renderOrderOptions();
    showToast("登入成功");
    resetForNextRecord();
  } catch (error) {
    showToast(`登入失敗：${error.message}`);
  }
});

employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderId = String(form.get("order_id") || "").trim();
  const employeeId = String(form.get("employee_id") || "").trim();
  if (isWorkspace()) {
    workspace.query = employeeId.toLowerCase();
    renderRoster();
    roster.scrollTop = 0;
    return;
  }

  try {
    const raw = shouldUseServerApi()
      ? await request("/tailor/get_customer_measure", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, employee_id: employeeId }),
        })
      : getAdminEmployee(orderId, employeeId);
    if (!raw || (!shouldUseServerApi() && raw.order_id !== orderId)) throw new Error("未找到該員工");
    if (!shouldUseServerApi()) {
      openLocalEmployee(raw, orderId, employeeId);
      return;
    }
    measureForm.reset();
    workspace.entryPage = null;
    state.employee = normalizeEmployee(raw, orderId, employeeId);
    configureFlowForEmployee();
    renderFields();
    renderEmployee(state.employee);
    document.getElementById("confirm-employee").hidden = false;
    document.getElementById("confirm-employee").disabled = false;
    showToast("已匹配員工資料，請確認");
  } catch (error) {
    state.employee = null;
    document.getElementById("employee-card").hidden = true;
    document.getElementById("confirm-employee").disabled = true;
    archivePicker.hidden = true;
    showToast(`查詢失敗：${error.message}`);
  }
});

document.getElementById("confirm-employee").addEventListener("click", () => {
  if (!state.employee) return;
  setPage(state.flow[2]);
});

document.querySelectorAll("[data-prev]").forEach((button) => {
  button.addEventListener("click", () => {
    const index = currentFlowIndex();
    setPage(state.flow[Math.max(0, index - 1)]);
  });
});

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.closest(".page");
    const group = page.dataset.garment;
    const error = group ? validateGroup(group) : "";
    if (error) {
      showToast(error);
      return;
    }
    const index = currentFlowIndex();
    setPage(state.flow[Math.min(state.flow.length - 1, index + 1)]);
  });
});

steps.forEach((step) => {
  const jumpToStep = () => {
    const index = Number(step.dataset.flowIndex);
    const targetPage = state.flow[index];
    if (state.lockedRecord && targetPage !== 8) {
      showToast("本次量體記錄已鎖定，不可返回修改。");
      return;
    }
    if (!state.token && targetPage > 0) {
      showToast("請先登入裁縫師賬號。");
      return;
    }
    if (!state.employee && targetPage > 1) {
      showToast("請先查詢並確認員工資料。");
      return;
    }
    if (targetPage > 1 && !shouldUseServerApi() && !state.operation) {
      showToast("請先選擇量體檔案操作。");
      return;
    }
    if (targetPage === 8 && !state.lockedRecord) {
      showToast("請先提交量體資料。");
      return;
    }
    if (Number.isInteger(targetPage)) setPage(targetPage);
  };
  step.addEventListener("click", jumpToStep);
  step.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    jumpToStep();
  });
});

function validateMeasurement() {
  if (TailorProducts.enabled()) {
    const error = TailorProducts.validateAll();
    if (error) { showToast(error); setPage(11); return false; }
  }
  const groupPageMap = { suit: 2, pants: 3, shirt: 4, skirt: 5, dress: 6, other: 10 };
  for (const group of activeGarmentGroups()) {
    const error = validateGroup(group);
    if (error) {
      showToast(error);
      setPage(groupPageMap[group]);
      return false;
    }
  }
  return true;
}

function showLockedRecord() {
  const {version, measurement_id} = state.lockedRecord;
  document.getElementById("locked-message").textContent = version ? `V${version} 已保存 · ${measurement_id}` : `量體記錄：${measurement_id}`;
  renderSummary(document.getElementById("locked-summary"), state.lockedRecord);
}

function archiveContent(record) {
  return JSON.stringify([record.measurements, record.product_measurements, record.body_notes, record.remark, record.final_remark, record.updated_at]);
}

function saveLocalMeasurement(record, timeFields, measurementId) {
  const store = loadAdminStore();
  const employee = store?.employees?.find(item => item.order_id === record.employee.order_id && item.employee_id === record.employee.employee_id);
  if (!employee) throw new Error("此員工已移除，請重新查詢。");
  const entries = archiveEntries(store, employee);
  const {mode, source} = state.operation;
  const original = source && entries.find(entry => entry.record.measurement_id === source.measurement_id);
  if (source && (!original || original.record.archive_removed_at || original.version !== state.operation.version
    || archiveContent(original.record) !== archiveContent(source))) {
    throw new Error("所選檔案已有變更，請返回檔案列表重新選擇。");
  }
  for (const entry of entries) entry.record.version = entry.version;
  const now = timeFields.measured_at;
  let saved;
  if (mode === "edit") {
    const existing = original.record;
    Object.assign(existing, {
      measurements: record.measurements,
      ...(record.product_measurements ? {product_measurements: record.product_measurements, measurement_labels: record.measurement_labels} : {}),
      body_notes: record.body_notes,
      remark: record.remark,
      final_remark: record.final_remark,
      updated_at: now,
      updated_by: state.tailorName,
      locked: true,
    });
    saved = existing;
  } else {
    const version = Math.max(0, ...entries.map(entry => entry.version)) + 1;
    saved = {
      ...record, ...timeFields, measurement_id: measurementId, version, created_at: now, locked: true,
      ...(mode === "copy" ? {source_measurement_id: source.measurement_id} : {}),
      employee: {...record.employee, height_cm: employee.height_cm || "", weight_kg: employee.weight_kg || "", department: employee.unit_name || "-"},
    };
    store.measurements ||= [];
    store.measurements.unshift(saved);
  }
  saveAdminStore(store);
  workspace.drafts.delete(employeeKey(employee.order_id, employee.employee_id));
  state.archiveId = saved.measurement_id;
  return saved;
}

async function submitMeasurement() {
  if (state.lockedRecord || !state.employee || (!shouldUseServerApi() && !state.operation) || !validateMeasurement()) return;
  const submitButton = document.getElementById("submit-measure");
  if (submitButton.disabled) return;
  submitButton.disabled = true;
  workspaceSave.disabled = true;
  const record = buildRecord();
  try {
    let measurementId = `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let serverTimeFields = {};
    if (shouldUseServerApi()) {
      const data = await request("/tailor/measure_body", {
        method: "POST",
        body: JSON.stringify(buildApiPayload(record)),
      });
      measurementId = data.measurement_id || measurementId;
      serverTimeFields = {
        measured_at: data.measured_at,
        measure_date: data.measure_date,
        measurement_date: data.measurement_date,
        finish_date: data.finish_date,
        timezone: data.timezone || "Asia/Shanghai",
      };
    } else {
      const measuredAt = isoNowWithSeconds();
      serverTimeFields = {
        measured_at: measuredAt,
        measure_date: displayTimeToBeijingIso(measuredAt),
        measurement_date: displayTimeToBeijingIso(measuredAt),
        finish_date: displayTimeToBeijingIso(measuredAt),
        timezone: "Asia/Shanghai",
      };
    }
    if (!serverTimeFields.measured_at) throw new Error("服務器未返回量體時間，請聯絡技術人員檢查部署版本。");
    if (shouldUseServerApi()) {
      const lockedRecord = { ...record, ...serverTimeFields, measurement_id: measurementId, locked: true };
      localStorage.setItem(`mc-measure-${measurementId}`, JSON.stringify(lockedRecord));
      appendAdminMeasurement(lockedRecord);
      state.lockedRecord = lockedRecord;
    } else {
      state.lockedRecord = saveLocalMeasurement(record, serverTimeFields, measurementId);
    }
    showLockedRecord();
    showToast(shouldUseServerApi() ? "提交成功，本次記錄已鎖定" : "量體檔案已保存");
    setPage(8);
  } catch (error) {
    showToast(`提交失敗：${error.message}`);
  } finally {
    submitButton.disabled = false;
    workspaceSave.disabled = false;
  }
}
document.getElementById("submit-measure").addEventListener("click", submitMeasurement);

document.querySelector('[name="remark"]')?.addEventListener("input", () => {
  if (state.page === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
});

document.addEventListener("change", (event) => {
  if (event.target?.name !== "suit_body_notes") return;
  updateConditionalFields();
  if (state.page === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
});

document.getElementById("new-record").addEventListener("click", () => {
  if (shouldUseServerApi()) resetForNextRecord();
  else setPage(1);
});
measureForm.addEventListener("submit", event => event.preventDefault());
measureForm.addEventListener("input", () => {
  if (isWorkspace()) toast.hidden = true;
});

orderSelect.addEventListener("change", () => {
  if (shouldUseServerApi()) return;
  if (!isWorkspace()) {
    if (state.employee) resetForNextRecord();
    return;
  }
  rememberWorkspaceEmployee();
  employeeQuery.value = workspace.query = "";
  resetForNextRecord();
  roster.scrollTop = 0;
});
employeeQuery.addEventListener("input", () => {
  if (!isWorkspace() || employeeQuery.value.trim() || !workspace.query) return;
  workspace.query = "";
  renderRoster();
});
roster.addEventListener("click", event => {
  const row = event.target.closest("[data-employee-id]");
  if (row) selectWorkspaceEmployee(row.dataset.employeeId);
});
pinEmployee.addEventListener("click", () => {
  const key = employeeKey(state.employee.order_id, state.employee.employee_id);
  readWorkspacePins();
  if (!workspace.pins.delete(key)) workspace.pins.add(key);
  try {
    localStorage.setItem(workspace.pinKey, JSON.stringify([...workspace.pins]));
  } catch {
    showToast("無法在此瀏覽器保存置頂設定");
  }
  renderWorkspace();
  if (workspace.pins.has(key)) roster.scrollTop = 0;
});
garmentTabs.addEventListener("click", event => {
  const tab = event.target.closest("[data-garment-page]");
  if (!tab) return;
  setPage(Number(tab.dataset.garmentPage));
  garmentTabs.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
});
workspaceReturn.addEventListener("click", () => setPage(workspace.entryPage || state.flow[2]));
document.getElementById("workspace-archives").addEventListener("click", () => setPage(1));
workspaceSave.addEventListener("click", () => {
  if (state.page === 9) submitMeasurement();
  else if (validateMeasurement()) setPage(9);
});
workspaceScreen.addEventListener("change", () => setPage(state.page));

archiveOptions.addEventListener("change", event => {
  state.archiveId = event.target.value;
});
archivePicker.addEventListener("click", event => {
  const button = event.target.closest("[data-archive-action]");
  if (button && state.employee) startArchiveOperation(button.dataset.archiveAction);
});

const archiveHistory = document.getElementById("archive-history-dialog");
document.getElementById("open-archive-history").addEventListener("click", () => {
  const labels = new Map(Object.values(fieldGroups).flat().map(([name, label]) => [name, label]));
  document.getElementById("archive-history-list").innerHTML = visibleArchives().map(entry => {
    const {record} = entry;
    const fields = record.product_measurements?.length ? TailorProducts.summary(record)
      : Object.entries(record.measurements || {}).map(([name, value]) => `<div><span>${escapeHtml(labels.get(name) || name)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    const remark = record.final_remark || record.remark;
    return `<details class="archive-history-entry"><summary class="archive-option">${archiveMetadata(entry)}</summary>
      <section class="product-summary">${fields || '<p>此版本暫無量體字段。</p>'}${remark ? `<p>備註 · ${escapeHtml(remark)}</p>` : ""}</section></details>`;
  }).join("");
  archiveHistory.showModal();
});
document.getElementById("close-archive-history").addEventListener("click", () => archiveHistory.close());

const employeeEditor = document.getElementById("employee-edit-dialog");
const employeeEditForm = document.getElementById("employee-edit-form");
const employeeEditError = document.getElementById("employee-edit-error");
employeeCard.addEventListener("click", event => {
  const mode = event.target.closest("[data-edit-profile]")?.dataset.editProfile;
  if (!mode || !state.employee || shouldUseServerApi()) return;
  const {height_cm, weight_kg, department} = state.employee;
  const editSize = mode === "size";
  document.getElementById("employee-edit-title").textContent = editSize ? "修改身高體重" : "修改部門";
  document.getElementById("employee-size-fields").hidden = !editSize;
  document.getElementById("employee-department-field").hidden = editSize;
  employeeEditError.hidden = true;
  employeeEditForm.elements.height_cm.disabled = employeeEditForm.elements.weight_kg.disabled = !editSize;
  employeeEditForm.elements.department.disabled = editSize;
  employeeEditForm.elements.height_cm.value = height_cm;
  employeeEditForm.elements.weight_kg.value = weight_kg;
  const departments = new Set(loadAdminStore()?.departments || []);
  if (department && department !== "-") departments.add(department);
  employeeEditForm.elements.department.innerHTML = '<option value="">請選擇部門</option>' + [...departments]
    .map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  employeeEditForm.elements.department.value = department === "-" ? "" : department;
  employeeEditor.showModal();
});
document.getElementById("close-employee-edit").addEventListener("click", () => employeeEditor.close());
employeeEditForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(employeeEditForm));
  try {
    const store = loadAdminStore();
    const employee = store?.employees?.find(item => item.order_id === state.employee.order_id && item.employee_id === state.employee.employee_id);
    if (!employee) throw new Error("此員工已移除，請重新查詢。");
    if (Object.hasOwn(data, "department")) {
      if (!data.department || (data.department !== employee.unit_name && !store.departments?.includes(data.department))) {
        throw new Error("請選擇有效部門。");
      }
      employee.unit_name = data.department;
    } else {
      for (const name of ["height_cm", "weight_kg"]) {
        if (data[name] && !(Number(data[name]) > 0 && Number.isFinite(Number(data[name])))) throw new Error("身高和體重請填寫大於 0 的數值。");
        employee[name] = data[name];
      }
    }
    saveAdminStore(store);
    Object.assign(state.employee, {height_cm: employee.height_cm || "", weight_kg: employee.weight_kg || "", department: employee.unit_name || "-"});
    const mode = Object.hasOwn(data, "department") ? "department" : "size";
    employeeEditor.close();
    renderEmployee(state.employee);
    employeeCard.querySelector(`[data-edit-profile="${mode}"]`)?.focus({preventScroll: true});
    if (state.page === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
    showToast("員工資料已保存");
  } catch (error) {
    employeeEditError.textContent = error.message;
    employeeEditError.hidden = false;
  }
});

renderFields();
configureFlowForEmployee();
setPage(0);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
}

const measurementDashboard = document.getElementById("measurement-dashboard");
const dashboardOrder = document.getElementById("dashboard-order");
const dashboardDepartment = document.getElementById("dashboard-department");
const dashboardQuery = document.getElementById("dashboard-query");
const dashboardStats = document.getElementById("dashboard-stats");
const dashboardList = document.getElementById("dashboard-list");
const dashboardEmpty = document.getElementById("dashboard-empty");
const temporaryDashboardFilters = new Map();
let dashboardFiltersAccount = "";
let dashboardWorkspaceOrder;

function dashboardFiltersKey(orderId) {
  return `mc-tailor-dashboard-filters:${JSON.stringify([dashboardFiltersAccount, orderId])}`;
}

function readDashboardFilters(orderId) {
  if (temporaryDashboardFilters.has(orderId)) return temporaryDashboardFilters.get(orderId);
  try {
    return JSON.parse(localStorage.getItem(dashboardFiltersKey(orderId))) || {};
  } catch {
    return {};
  }
}

function saveDashboardFilters(status) {
  const orderId = dashboardOrder.value;
  const filters = {department: dashboardDepartment.value, status: status ?? readDashboardFilters(orderId).status};
  try {
    localStorage.setItem(dashboardFiltersKey(orderId), JSON.stringify(filters));
    temporaryDashboardFilters.delete(orderId);
  } catch {
    temporaryDashboardFilters.set(orderId, filters);
  }
  renderMeasurementDashboard();
}

function renderMeasurementDashboard(orderId = dashboardOrder.value) {
  const store = loadAdminStore() || {};
  const orders = store.orders || [];
  dashboardOrder.innerHTML = '<option value="">全部訂單</option>' + orders.map(order =>
    `<option value="${escapeHtml(order.order_id)}">${escapeHtml(order.order_id)}${order.company_name ? ` / ${escapeHtml(order.company_name)}` : ""}</option>`).join("");
  dashboardOrder.value = orders.some(order => order.order_id === orderId) ? orderId : "";
  const savedFilters = readDashboardFilters(dashboardOrder.value);
  const dashboardFilter = ["pending", "done"].includes(savedFilters?.status) ? savedFilters.status : "all";
  const selectedDepartment = savedFilters?.department || "";
  const orderRows = measurementRows(store, dashboardOrder.value).map(row => ({
    ...row,
    department: String(row.employee.unit_name || "").trim(),
  }));
  const departments = new Map(orderRows.map(({department}) => [`unit:${department}`, department]));
  const department = departments.get(selectedDepartment);
  dashboardDepartment.replaceChildren(new Option("全部部門", ""), ...Array.from(departments, ([value, name]) => new Option(name || "未分配部門", value)));
  dashboardDepartment.value = department === undefined ? "" : selectedDepartment;
  const rows = department === undefined ? orderRows : orderRows.filter(row => row.department === department);
  const done = rows.filter(row => row.measured).length;
  const counts = { all: rows.length, pending: rows.length - done, done };
  for (const button of dashboardStats.querySelectorAll("button")) {
    const filter = button.dataset.filter;
    button.setAttribute("aria-pressed", String(filter === dashboardFilter));
    button.querySelector("strong").textContent = counts[filter];
  }
  const percent = rows.length ? Math.floor(done * 100 / rows.length) : 0;
  document.getElementById("dashboard-percent").textContent = `${percent}%`;
  document.getElementById("dashboard-progress").value = percent;

  const query = dashboardQuery.value.trim().toLowerCase();
  const visible = rows.filter(({employee, measured}) =>
    (dashboardFilter === "all" || measured === (dashboardFilter === "done")) &&
    [employee.employee_id, employee.name].some(value => String(value || "").toLowerCase().includes(query)));
  document.getElementById("dashboard-list-count").textContent = `${visible.length} 人`;
  dashboardList.innerHTML = visible.map(({employee, measured, department}) => {
    const details = `${employee.order_id} · ${department || "未分配部門"}`;
    return `<li data-status="${measured ? "done" : "pending"}" title="${escapeHtml(details)}">
      <strong>${escapeHtml(employee.name || "未填寫姓名")}</strong>
      <small>${escapeHtml(employee.employee_id)}</small>
      <span class="dashboard-status">${measured ? "已量體" : "待量體"}</span>
      <span class="dashboard-status-icon" aria-hidden="true">${measured ? "✓" : "○"}</span>
    </li>`;
  }).join("");
  dashboardEmpty.hidden = visible.length > 0;
  dashboardEmpty.textContent = rows.length ? "沒有符合篩選條件的員工。" : "所選範圍暫無員工。";
}

document.getElementById("open-measurement-dashboard").addEventListener("click", () => {
  const orderId = dashboardWorkspaceOrder === orderSelect.value ? dashboardOrder.value : orderSelect.value;
  dashboardWorkspaceOrder = orderSelect.value;
  dashboardQuery.value = "";
  renderMeasurementDashboard(orderId);
  measurementDashboard.showModal();
  measurementDashboard.scrollTop = 0;
});
document.getElementById("close-measurement-dashboard").addEventListener("click", () => measurementDashboard.close());
dashboardOrder.addEventListener("change", () => renderMeasurementDashboard());
dashboardDepartment.addEventListener("change", () => saveDashboardFilters());
dashboardQuery.addEventListener("input", () => renderMeasurementDashboard());
dashboardStats.addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  saveDashboardFilters(button.dataset.filter);
});

// Read-only appointment companion; never changes employee selection or form state.
function appointmentTime(value) {
  const raw = String(value || "").trim().replace(" ", "T");
  return raw ? Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}+08:00`) : NaN;
}
function appointmentRows(store, date, orderId) {
  const slots = (store.appointmentSlots || []).filter(slot => slot.date === date && (!orderId || slot.order_id === orderId));
  return (store.appointments || []).filter(booking => booking.status === "booked").flatMap(booking => {
    const slot = slots.find(item => item.id === booking.slot_id && item.order_id === booking.order_id);
    if (!slot) return [];
    const employee = (store.employees || []).find(item => item.employee_id === booking.employee_id && item.order_id === booking.order_id);
    const start = appointmentTime(`${slot.date}T00:00:00`);
    const bookedAt = appointmentTime(booking.created_at);
    const measurement = (store.measurements || []).filter(item => {
      const at = appointmentTime(item.measured_at || item.measurement_date || item.measure_date);
      return item.employee?.employee_id === booking.employee_id && item.employee?.order_id === booking.order_id && at >= start && at < start + 86400000 && Number.isFinite(bookedAt) && at >= bookedAt;
    }).sort((a, b) => appointmentTime(b.measured_at || b.measurement_date || b.measure_date) - appointmentTime(a.measured_at || a.measurement_date || a.measure_date))[0];
    return [{booking, slot, employee, measurement}];
  }).sort((a, b) => `${a.slot.start_time}${a.booking.created_at}`.localeCompare(`${b.slot.start_time}${b.booking.created_at}`));
}
const appointmentsDialog = document.getElementById("appointments-dialog");
const appointmentDate = document.getElementById("appointment-date");
const appointmentOrder = document.getElementById("appointment-order");
const appointmentSlot = document.getElementById("appointment-slot");
const appointmentStatus = document.getElementById("appointment-status");
function appointmentToday() {
  return beijingNowWithSeconds().slice(0, 10);
}
function renderAppointments() {
  const store = loadAdminStore() || {};
  const selectedOrder = appointmentOrder.value;
  const orders = store.orders || [];
  appointmentOrder.innerHTML = '<option value="">全部訂單</option>' + orders.map(order => `<option value="${escapeHtml(order.order_id)}">${escapeHtml(order.order_id)} / ${escapeHtml(order.company_name)}</option>`).join("");
  appointmentOrder.value = orders.some(order => order.order_id === selectedOrder) ? selectedOrder : "";
  const slots = (store.appointmentSlots || []).filter(slot => slot.date === appointmentDate.value && (!appointmentOrder.value || slot.order_id === appointmentOrder.value)).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const selectedSlot = appointmentSlot.value;
  appointmentSlot.innerHTML = '<option value="">全天 · 全部時段</option>' + slots.map(slot => `<option value="${escapeHtml(slot.id)}">${escapeHtml(slot.start_time)}–${escapeHtml(slot.end_time)} / ${escapeHtml(slot.address)} / ${escapeHtml(slot.order_id)}</option>`).join("");
  appointmentSlot.value = slots.some(slot => slot.id === selectedSlot) ? selectedSlot : "";
  const rows = appointmentRows(store, appointmentDate.value, appointmentOrder.value).filter(row => !appointmentSlot.value || row.slot.id === appointmentSlot.value);
  const done = rows.filter(row => row.measurement).length;
  document.getElementById("appointment-counts").textContent = `預約 ${rows.length} 人次 · 待量身 ${rows.length - done} · 已量身 ${done}`;
  const visible = rows.filter(row => appointmentStatus.value === "all" || Boolean(row.measurement) === (appointmentStatus.value === "done"));
  document.getElementById("appointment-list").innerHTML = visible.length
    ? `<p class="appointment-names">${visible.map(({booking, employee}) => `${escapeHtml(booking.employee_id)} ${escapeHtml(employee?.name || booking.employee_name || "未填寫姓名")}`).join("；")}</p>`
    : '<p class="appointment-empty">目前條件下沒有預約人員，可切換日期、訂單或狀態查看。</p>';
}
document.getElementById("open-appointments").addEventListener("click", () => {
  if (!appointmentDate.value) appointmentDate.value = appointmentToday();
  renderAppointments();
  appointmentsDialog.showModal();
});
document.getElementById("close-appointments").addEventListener("click", () => appointmentsDialog.close());
[appointmentDate, appointmentOrder, appointmentSlot, appointmentStatus].forEach(control => control.addEventListener("change", renderAppointments));
document.getElementById("appointments-refresh").addEventListener("click", renderAppointments);
document.getElementById("appointments-today").addEventListener("click", () => {
  appointmentDate.value = appointmentToday();
  appointmentSlot.value = "";
  renderAppointments();
});
window.addEventListener("storage", event => {
  if (event.key === adminStoreKey || event.key === null) {
    if (measurementDashboard.open) renderMeasurementDashboard();
    if (appointmentsDialog.open) renderAppointments();
    if (!archivePicker.hidden) renderArchivePicker();
  }
  if (!isWorkspace()) return;
  if (event.key === workspace.pinKey || event.key === null) {
    readWorkspacePins();
    renderWorkspace();
  } else if (event.key === adminStoreKey) {
    renderRoster();
  }
});
window.addEventListener("focus", () => {
  if (measurementDashboard.open) renderMeasurementDashboard();
  if (appointmentsDialog.open) renderAppointments();
});

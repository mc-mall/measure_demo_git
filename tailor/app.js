const pages = [...document.querySelectorAll(".page")];
const steps = [...document.querySelectorAll("#stepper li")];
const toast = document.getElementById("toast");

const state = {
  page: 0,
  apiBase: "",
  token: "",
  tailorName: "",
  employee: null,
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
  return store?.orders?.length ? store.orders : mockOrders();
}

async function renderOrderOptions() {
  const select = document.getElementById("order-select");
  try {
    const orders = await loadOrders();
    select.innerHTML = `<option value="">請選擇訂單</option>${orders.map((order) => `<option value="${order.order_id}">${order.order_id}${order.company_name ? ` / ${order.company_name}` : ""}</option>`).join("")}`;
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
    height_cm: employee.height_cm || "",
    weight_kg: employee.weight_kg || "",
    wear_type: employee.gender === "女" ? "female" : "male",
    measurement_list: store.measurements?.filter((item) => item.employee?.employee_id === employee.employee_id && item.employee?.order_id === employee.order_id) || [],
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
      const fieldId = `field-${name}`;
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

function configureFlowForEmployee() {
  const isFemale = isFemaleEmployee();
  state.flow = isFemale ? [0, 1, 2, 3, 5, 6, 10, 9, 8] : [0, 1, 2, 3, 10, 9, 8];
  const labels = isFemale
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
  state.page = pageId;
  pages.forEach((page) => page.classList.toggle("is-active", Number(page.dataset.page) === pageId));
  const activeIndex = currentFlowIndex(pageId);
  steps.forEach((step, stepIndex) => {
    step.classList.toggle("is-current", stepIndex === activeIndex);
    step.classList.toggle("is-done", stepIndex < activeIndex);
  });
  if (pageId === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
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
    height_cm: data.height_cm || data.heightCm || "",
    weight_kg: data.weight_kg || data.weightKg || "",
    wear_type: data.wear_type || data.cloth_type || "",
    measurement_list: data.measurement_list || [],
  };
}

function renderEmployee(employee) {
  const card = document.getElementById("employee-card");
  card.hidden = false;
  card.innerHTML = `
    <div class="info-grid">
      <div><span>員工編號</span><strong>${employee.employee_id}</strong></div>
      <div><span>姓名</span><strong>${employee.customer_name || "-"}</strong></div>
      <div><span>性別</span><strong>${employee.gender}</strong></div>
      <div><span>身高 / 體重</span><strong>${employee.height_cm || "-"} cm / ${employee.weight_kg || "-"} kg</strong></div>
      <div><span>分區</span><strong>${employee.department}</strong></div>
      <div><span>行名</span><strong>${employee.branch}</strong></div>
    </div>
  `;
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
    values[key].split("、").forEach((note) => {
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
    if (isRequiredField(name) && !getValue(name)) return true;
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
  const values = {};
  activeGarmentGroups().forEach((group) => {
    getFieldsForGroup(group).forEach(([name]) => {
      if (!isFieldActive(name)) return;
      const value = getValue(name);
      if (value) values[name] = value;
    });
  });
  const bodyNotes = combinedBodyNotes(values);
  const remark = getValue("remark");
  return {
    locked: Boolean(state.lockedRecord),
    tailor_name: state.tailorName,
    measured_at: state.lockedRecord?.measured_at || "",
    employee: state.employee,
    measurements: values,
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
  target.innerHTML = `<div class="summary-grid">${rows.map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join("")}</div>`;
}

function resetForNextRecord() {
  state.employee = null;
  state.lockedRecord = null;
  document.getElementById("employee-card").hidden = true;
  document.getElementById("confirm-employee").disabled = true;
  document.getElementById("measure-form").reset();
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
      const store = loadAdminStore();
      const tailor = store?.tailors?.find((item) => item.username === username);
      if (store && !tailor) throw new Error("未找到該裁縫師賬號");
      state.token = "mock-token";
      state.tailorName = tailor?.name || username;
    }
    document.getElementById("session-chip").textContent = state.tailorName;
    await renderOrderOptions();
    showToast("登入成功");
    setPage(1);
  } catch (error) {
    showToast(`登入失敗：${error.message}`);
  }
});

document.getElementById("employee-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderId = String(form.get("order_id") || "").trim();
  const employeeId = String(form.get("employee_id") || "").trim();

  try {
    const raw = shouldUseServerApi()
      ? await request("/tailor/get_customer_measure", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, employee_id: employeeId }),
        })
      : getAdminEmployee(orderId, employeeId) || mockEmployees[employeeId];
    if (!raw || (!shouldUseServerApi() && raw.order_id !== orderId)) throw new Error("未找到該員工");
    state.employee = normalizeEmployee(raw, orderId, employeeId);
    configureFlowForEmployee();
    renderFields();
    renderEmployee(state.employee);
    document.getElementById("confirm-employee").disabled = false;
    showToast("已匹配員工資料，請確認");
  } catch (error) {
    state.employee = null;
    document.getElementById("employee-card").hidden = true;
    document.getElementById("confirm-employee").disabled = true;
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
    if (Number.isInteger(targetPage)) setPage(targetPage);
  };
  step.addEventListener("click", jumpToStep);
  step.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    jumpToStep();
  });
});

document.getElementById("submit-measure").addEventListener("click", async () => {
  const groupPageMap = { suit: 2, pants: 3, shirt: 4, skirt: 5, dress: 6, other: 10 };
  for (const group of activeGarmentGroups()) {
    const error = validateGroup(group);
    if (error) {
      showToast(error);
      setPage(groupPageMap[group]);
      return;
    }
  }

  const record = buildRecord();
  try {
    let measurementId = `LOCAL-${Date.now()}`;
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
    state.lockedRecord = { ...record, ...serverTimeFields, measurement_id: measurementId, locked: true };
    localStorage.setItem(`mc-measure-${measurementId}`, JSON.stringify(state.lockedRecord));
    appendAdminMeasurement(state.lockedRecord);
    document.getElementById("locked-message").textContent = `量體記錄：${measurementId}`;
    renderSummary(document.getElementById("locked-summary"), state.lockedRecord);
    showToast("提交成功，本次記錄已鎖定");
    setPage(8);
  } catch (error) {
    showToast(`提交失敗：${error.message}`);
  }
});

document.querySelector('[name="remark"]')?.addEventListener("input", () => {
  if (state.page === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
});

document.addEventListener("change", (event) => {
  if (event.target?.name !== "suit_body_notes") return;
  updateConditionalFields();
  if (state.page === 9) renderSummary(document.getElementById("summary-card"), buildRecord());
});

document.getElementById("new-record").addEventListener("click", resetForNextRecord);

renderFields();
configureFlowForEmployee();
setPage(0);

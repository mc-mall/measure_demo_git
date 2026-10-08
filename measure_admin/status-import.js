/* Pure validation: build a preview without changing shared prototype data. */
window.MeasureStatusImport = (() => {
  const clean = value => String(value ?? "").replace(/^\ufeff/, "").trim();
  const normalize = value => clean(value).replace(/[\s_]/g, "").toLowerCase();
  const aliases = {
    order: ["訂單號", "订单号", "order_id"], employee: ["員工編號", "员工编号", "employee_id"],
    sale: ["售後編號", "售后编号", "after_sale_id"], target: ["目標狀態", "目标状态", "status"],
    date: ["預計交付日期", "预计交付日期", "estimated_delivery_date"],
  };
  function status(value, mode) {
    const text = clean(value);
    const forward = ["签字确认服装", "预约量身", "完成量身", "下单到工厂", "工厂交付待派送", "完成交付"];
    const after = ["员工提交售后", "门市收货", "下单到工厂", "工厂交付待派送", "完成交付"];
    const labels = mode === "forward" ? MeasureWorkflow.forward : MeasureWorkflow.after;
    const alternate = mode === "forward" ? forward : after;
    const common = {"已下单到工厂": labels.length - 3, "下單到工廠": labels.length - 3, "工厂交付，待派送": labels.length - 2, "工廠交付待派送": labels.length - 2, "已交付": labels.length - 1, "完成交付": labels.length - 1};
    if (mode === "forward") {common["簽字確認服裝"] = 0; common["服装确认"] = 0;}
    if (mode === "after") { common["提交售后"] = 0; common["員工提交售後"] = 0; common["完成派送"] = 4; }
    return labels.includes(text) ? text : alternate.includes(text) ? labels[alternate.indexOf(text)] : Object.hasOwn(common, text) ? labels[common[text]] : "";
  }
  function date(value) {
    let text = clean(value);
    // Excel's standard 1900 date system; timestamps and fractional days are not dates.
    if (/^[0-9]{1,7}$/.test(text)) {
      const serial = Number(text);
      if (serial < 1 || serial === 60 || serial > 2958465) return "";
      text = new Date(Date.UTC(1899, 11, 31) + (serial > 60 ? serial - 1 : serial) * 86400000).toISOString().slice(0, 10);
    } else {
      const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) text = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
    return MeasureWorkflow.validDeliveryDate(text) ? text : "";
  }
  function plan(store, rows, mode, orderId = "") {
    if (!["forward", "after"].includes(mode)) throw new Error("未知流程。");
    if (rows.length < 2) throw new Error("文件需包含表頭和資料行。");
    if (rows.length > 10001) throw new Error("每次最多導入 10,000 行，請拆分文件。");
    const headers = rows[0].map(normalize);
    const columns = {};
    for (const [key, names] of Object.entries(aliases)) {
      const matches = headers.flatMap((name, index) => names.map(normalize).includes(name) ? [index] : []);
      if (matches.length > 1) throw new Error(`表頭重複：${names[0]}。`);
      columns[key] = matches[0] ?? -1;
    }
    const required = mode === "forward" ? ["order", "employee", "target"] : ["sale", "target"];
    for (const key of required) if (columns[key] < 0) throw new Error(`缺少表頭：${aliases[key][0]}。`);
    const index = new Map();
    for (const record of mode === "forward" ? store.employees : store.afterSales || []) {
      const key = mode === "forward" ? JSON.stringify([record.order_id, record.employee_id]) : record.id;
      index.set(key, [...(index.get(key) || []), record]);
    }
    const seen = new Set(); const entries = [];
    rows.slice(1).forEach((values, i) => {
      if (!values.some(value => clean(value))) return;
      const pick = key => clean(values[columns[key]]);
      const entry = {row: i + 2, key: mode === "forward" ? `${pick("order")} / ${pick("employee")}` : pick("sale"), target: pick("target"), date: pick("date"), current: "", result: "skip", message: "未填目標狀態，略過"};
      entries.push(entry);
      if (!entry.target) return;
      const fail = message => { entry.result = "error"; entry.message = message; };
      if ((mode === "forward" && (!pick("order") || !pick("employee"))) || (mode === "after" && !pick("sale"))) return fail("匹配編號不能為空");
      const key = mode === "forward" ? JSON.stringify([pick("order"), pick("employee")]) : pick("sale");
      if (seen.has(key)) return fail("文件內重複記錄，請每筆只保留一行");
      seen.add(key);
      const found = index.get(key) || [];
      if (found.length !== 1) return fail(found.length ? "匹配到多筆資料，請先修正編號" : "找不到對應記錄");
      const record = found[0]; entry.id = record.id; entry.name = record.name || record.employee_name;
      if (orderId && record.order_id !== orderId) return fail("不屬於當前訂單");
      if (mode === "after" && ((pick("order") && pick("order") !== record.order_id) || (pick("employee") && pick("employee") !== record.employee_id))) return fail("訂單號或員工編號與售後記錄不符");
      const labels = mode === "forward" ? MeasureWorkflow.forward : MeasureWorkflow.after;
      const stage = mode === "forward" ? MeasureWorkflow.progress(store, record) - 1 : labels.indexOf(record.status);
      entry.current = mode === "forward" ? labels[stage] || "尚未確認服裝" : record.status;
      entry.target = status(entry.target, mode);
      if (!entry.target) return fail("目標狀態不在此流程中");
      const target = labels.indexOf(entry.target);
      if (mode === "after" && stage < 0) return fail("此售後記錄已關閉或狀態無效");
      if (entry.date) {entry.date = date(entry.date); if (!entry.date) return fail("預計交付日期無效，請用 YYYY-MM-DD");}
      if (entry.target === "已下單到工廠" && !entry.date) return fail("下單到工廠必填預計交付日期");
      if (target === stage) {
        if (entry.date && entry.date !== record.estimated_delivery_date) return fail("狀態未變更，不能以狀態導入修改交付日期");
        entry.message = "已是目標狀態，略過"; return;
      }
      if (target !== stage + 1) return fail("只可順序進入下一階段，不可跳步或回退");
      if (entry.target !== "已下單到工廠" && entry.date && entry.date !== record.estimated_delivery_date) return fail("僅下單到工廠時可設定交付日期");
      if (mode === "after" && target === 1 && !MeasureWorkflow.receiptBatches(record).some(batch => (batch.items || []).some(item => Number(item.quantity) > 0))) return fail("請先在售後詳情完成實際簽收");
      if (mode === "after" && target === 2 && !MeasureWorkflow.readyForFactory(record)) return fail("服裝尚未收齊，請完成簽收或關閉不需送廠的申請");
      entry.result = "update"; entry.message = "可更新";
    });
    return {entries, updates: entries.filter(row => row.result === "update").length, errors: entries.filter(row => row.result === "error").length, skipped: entries.filter(row => row.result === "skip").length};
  }
  function apply(store, preview, mode, operator, changedAt) {
    if (preview.errors) throw new Error("仍有錯誤行，未保存任何更新。");
    const records = new Map((mode === "forward" ? store.employees : store.afterSales).map(record => [record.id, record]));
    for (const row of preview.entries.filter(row => row.result === "update")) {
      const record = records.get(row.id);
      const history = {status: row.target, changed_at: changedAt, operator: operator.username, operator_id: operator.id, source: "status_import"};
      if (row.target === "已下單到工廠") record.estimated_delivery_date = history.estimated_delivery_date = row.date;
      if (mode === "forward") {
        record.order_progress = MeasureWorkflow.forward.indexOf(row.target) + 1;
        (record.order_progress_history ||= []).push(history);
      } else {
        record.status = row.target; record.updated_at = changedAt;
        (record.status_history ||= []).push(history);
      }
    }
  }
  function textRows(text) {
    text = text.replace(/^\ufeff/, "");
    const delimiter = text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
    const rows = []; let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') {value += '"'; i++;}
        else if (quoted || !value) quoted = !quoted;
        else throw new Error("CSV 引號格式錯誤。");
      } else if (!quoted && (char === delimiter || char === "\n" || char === "\r")) {
        row.push(value); value = "";
        if (char !== delimiter) {rows.push(row); row = []; if (char === "\r" && text[i + 1] === "\n") i++;}
      } else value += char;
    }
    if (quoted) throw new Error("CSV 引號未關閉。");
    if (value || row.length) {row.push(value); rows.push(row);}
    return rows;
  }
  return {plan, apply, date, textRows};
})();

/* Import dialog controller. */
(() => {
  const el = id => document.getElementById(id);
  let state = {mode: "forward", orderId: "", rows: null, preview: null, page: 1, revision: 0};
  const allowed = () => state.mode === "forward" ? isOwner() : hasPermission("after_sales");
  function reset() {
    state.rows = state.preview = null; state.page = 1; state.revision++;
    el("status-import-preview").innerHTML = ""; el("status-import-summary").textContent = "";
    el("status-import-pages").innerHTML = ""; el("status-import-save").disabled = true;
  }
  function render() {
    const plan = state.preview;
    el("status-import-summary").textContent = `可更新 ${plan.updates} 行 · 錯誤 ${plan.errors} 行 · 略過 ${plan.skipped} 行。${plan.errors ? "請修正文件後重新上傳；有錯誤時整批不保存。" : "請核對後確認導入。"}`;
    el("status-import-save").disabled = Boolean(plan.errors || !plan.updates);
    const rows = plan.entries.slice((state.page - 1) * 100, state.page * 100);
    el("status-import-preview").innerHTML = `<table><thead><tr><th>行</th><th>匹配記錄</th><th>姓名</th><th>目前狀態</th><th>目標狀態</th><th>預計交付日期</th><th>校驗結果</th></tr></thead><tbody>${rows.map(row => `<tr${row.result === "error" ? ' class="status-import-error"' : ""}>${[row.row, row.key, row.name || "", row.current, row.target, row.date, row.message].map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const pages = Math.max(1, Math.ceil(plan.entries.length / 100));
    el("status-import-pages").innerHTML = `<button type="button" data-import-page="-1" ${state.page === 1 ? "disabled" : ""}>上一頁</button><span>第 ${state.page} / ${pages} 頁，每頁 100 行</span><button type="button" data-import-page="1" ${state.page === pages ? "disabled" : ""}>下一頁</button>`;
  }
  function open(mode, orderId = "") {
    state.mode = mode; state.orderId = orderId;
    if (!allowed()) return;
    reset(); el("status-import-file").value = "";
    el("status-import-title").textContent = mode === "forward" ? "導入正向訂單狀態" : "導入退換狀態";
    el("status-import-scope").textContent = mode === "forward" ? `目前訂單：${orderId}；以訂單號＋員工編號匹配。` : "以售後編號匹配。門市收貨須有實際簽收記錄，送廠前須收齊服裝。";
    el("status-import-statuses").textContent = `可用狀態：${(mode === "forward" ? MeasureWorkflow.forward : MeasureWorkflow.after).join(" → ")}`;
    el("status-import-dialog").showModal();
  }
  function downloadTemplate() {
    if (!allowed()) return;
    const store = loadStore();
    const rows = state.mode === "forward"
      ? [["訂單號", "員工編號", "姓名", "目前狀態", "目標狀態", "預計交付日期"], ...store.employees.filter(e => e.order_id === state.orderId).map(e => [e.order_id, e.employee_id, e.name, MeasureWorkflow.forward[MeasureWorkflow.progress(store, e) - 1] || "尚未確認服裝", "", ""])]
      : [["售後編號", "訂單號", "員工編號", "姓名", "目前狀態", "目標狀態", "預計交付日期"], ...filteredAfterSales.map(r => [r.id, r.order_id, r.employee_id, r.employee_name, r.status, "", ""])];
    // Prefix formula-like values with an apostrophe; keep normal business IDs untouched.
    const safe = value => csvEscape(/^[=+@\-\t\r]/.test(String(value || "")) ? "'" + value : value);
    downloadCsvBlob(new Blob(["\ufeff" + rows.map(row => row.map(safe).join(",")).join("\r\n")], {type: "text/csv;charset=utf-8"}), `${state.mode === "forward" ? "正向訂單" : "退換"}狀態導入模板.csv`);
  }
  el("status-import-file").addEventListener("change", reset);
  el("status-import-preview-button").addEventListener("click", async () => {
    if (!allowed()) return;
    reset(); const revision = state.revision;
    try {
      const file = el("status-import-file").files[0];
      if (!file) throw new Error("請選擇 CSV、TSV 或 XLSX 文件。");
      if (!/\.(csv|tsv|xlsx)$/i.test(file.name)) throw new Error("僅支持 CSV、TSV 或 XLSX，舊版 XLS 請另存為 XLSX。");
      if (file.size > 10 * 1024 * 1024) throw new Error("文件不可超過 10 MB。");
      const buffer = await file.arrayBuffer();
      const signature = new Uint8Array(buffer);
      const rows = signature[0] === 0x50 && signature[1] === 0x4b ? await parseXlsxRows(buffer, {reject1904: true}) : MeasureStatusImport.textRows(new TextDecoder().decode(buffer));
      if (revision !== state.revision) return;
      state.preview = MeasureStatusImport.plan(loadStore(), rows, state.mode, state.orderId);
      state.rows = rows; render();
    } catch (error) { if (revision === state.revision) el("status-import-summary").textContent = error.message; }
  });
  el("status-import-save").addEventListener("click", () => {
    if (!allowed() || !state.rows || !state.preview || state.preview.errors || !state.preview.updates) return;
    try {
      const store = loadStore();
      const latest = MeasureStatusImport.plan(store, state.rows, state.mode, state.orderId);
      if (JSON.stringify(latest) !== JSON.stringify(state.preview)) {
        state.preview = latest; state.page = 1; render();
        el("status-import-summary").textContent += " 資料已變動，請重新核對預覽再確認。";
        return;
      }
      MeasureStatusImport.apply(store, latest, state.mode, currentUser, nowText());
      saveStore(store);
      const count = latest.updates;
      el("status-import-dialog").close(); reset();
      if (state.mode === "forward") openOrderProgress(state.orderId); else renderAfterSales();
      showToast(`已導入更新 ${count} 筆狀態，員工端可同步查看。`);
    } catch (error) { el("status-import-summary").textContent = error.message; }
  });
  el("status-import-template").addEventListener("click", downloadTemplate);
  el("status-import-cancel").addEventListener("click", () => el("status-import-dialog").close());
  el("status-import-dialog").addEventListener("close", reset);
  el("status-import-pages").addEventListener("click", event => {
    const button = event.target.closest("[data-import-page]");
    if (button && state.preview) {state.page += Number(button.dataset.importPage); render();}
  });
  el("open-forward-status-import").addEventListener("click", () => open("forward", el("order-progress-dialog").dataset.orderId));
  el("open-after-status-import").addEventListener("click", () => open("after"));
})();

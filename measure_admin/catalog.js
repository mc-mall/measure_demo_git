/* Garment templates and product snapshots share the existing prototype store. */
(() => {
  const dialog = document.getElementById('catalog-dialog');
  const esc = escapeHtml;
  const copy = value => JSON.parse(JSON.stringify(value));
  let draft, kind;
  const isChoice = f => ['select','multiselect'].includes(f.type);
  const choiceOptions = f => String(f.options || '').split(/[,，、\n]/).map(v=>v.trim()).filter(Boolean);
  const field = (name = '') => ({ id: uid('F'), name, type: 'number', sort: 1, required: false, body: '', min: '', max: '', hint: '', options: '', defaults: {} });
  const input = (key, value, type = 'text', extra = '') => `<input data-key="${key}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'step="any"' : ''} ${extra}>`;
  const label = (text, control, className = '') => `<label class="${className}"><span>${text}</span>${control}</label>`;
  const action = (id, text, extra = '') => `<button type="button" data-catalog="${id}" ${extra}>${text}</button>`;
  function data() { const s = loadStore(); s.garmentTemplates ||= []; s.products ||= []; return s; }
  function renderLists() {
    const s = data();
    document.getElementById('pattern-table').innerHTML = `<thead><tr><th>服裝名稱</th><th>版型</th><th>尺碼字段</th><th>關聯產品</th><th>操作</th></tr></thead><tbody>${s.garmentTemplates.map(g => `<tr><td>${esc(g.name)}</td><td>${esc(g.patterns.map(p => p.name).join('、'))}</td><td>${g.fields.length} 項</td><td>${s.products.filter(p => p.garmentId === g.id).length}</td><td>${action('edit-pattern','編輯',`data-id="${g.id}" class="secondary"`)} ${action('delete-pattern','刪除',`data-id="${g.id}" class="danger"`)}</td></tr>`).join('') || '<tr><td colspan="5">尚未建立服裝版型。創建服裝後可手動錄入或導入尺碼表。</td></tr>'}</tbody>`;
    document.getElementById('product-table').innerHTML = `<thead><tr><th>產品名稱</th><th>歸屬性別</th><th>服裝</th><th>已選版型</th><th>字段</th><th>操作</th></tr></thead><tbody>${s.products.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.gender)}</td><td>${esc(p.garmentName || '自主配置')}</td><td>${esc(p.patterns.map(v => v.name).join('、') || '不使用版型')}</td><td>${p.fields.length} 項</td><td>${action('edit-product','編輯',`data-id="${p.id}" class="secondary"`)} ${action('delete-product','刪除',`data-id="${p.id}" class="danger"`)}</td></tr>`).join('') || '<tr><td colspan="6">尚未配置產品。可直接添加字段，或選擇服裝版型初始化。</td></tr>'}</tbody>`;
  }
  function open(type, id) {
    kind = type;
    const items = data()[type === 'pattern' ? 'garmentTemplates' : 'products'];
    draft = id ? copy(items.find(v => v.id === id)) : { id: uid(type === 'pattern' ? 'GT' : 'P'), name: '', gender: '男', garmentId: '', garmentName: '', patterns: [], fields: [] };
    renderEditor(); dialog.showModal();
  }
  function error(message) { const el = dialog.querySelector('.catalog-error'); el.textContent = message; el.hidden = false; el.scrollIntoView({ block: 'nearest' }); }
  function renderEditor() {
    const scrollTop = dialog.scrollTop;
    const product = kind === 'product';
    const source = data().garmentTemplates.find(g => g.id === draft.garmentId);
    // Retain a product's snapshot even if its source template is subsequently edited.
    const available = [...(source?.patterns || []), ...draft.patterns.filter(p => !source?.patterns.some(v => v.id === p.id))];
    dialog.innerHTML = `<form id="catalog-form">
      <div class="dialog-head"><div><h3>${product ? '產品配置' : '服裝版型'}</h3><p>${product ? '直接配置量體字段；如有預設尺碼，可選服裝與版型初始化。' : '同一服裝下，每個版型一列、每個尺碼字段一行。'}</p></div>${action('cancel','取消','class="secondary"')}</div>
      <div class="dialog-form-grid">${label(product ? '產品名稱 *' : '服裝名稱 *',input('name',draft.name,'text','required maxlength="128"'))}${product ? label('歸屬性別 *',`<select data-key="gender"><option ${draft.gender === '男' ? 'selected' : ''}>男</option><option ${draft.gender === '女' ? 'selected' : ''}>女</option></select>`) : ''}</div>
      ${product ? `<section class="catalog-section">${label('服裝版型來源（選填）',`<select id="catalog-garment"><option value="">不綁定服裝版型，自主配置字段</option>${data().garmentTemplates.map(g => `<option value="${g.id}" ${g.id === draft.garmentId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>`)}${draft.garmentId ? `<div class="catalog-selection-head"><strong>適用版型（選填） <span class="catalog-count">已選 ${draft.patterns.length} / ${available.length}</span></strong><div>${action('select-all-patterns','全選','class="ghost"')} ${action('clear-patterns','清空','class="ghost"')}</div></div><div class="catalog-patterns catalog-product-patterns">${available.map(p => `<label><input type="checkbox" data-pattern="${p.id}" ${draft.patterns.some(v => v.id === p.id) ? 'checked' : ''}>${esc(p.name)}</label>`).join('') || '<span class="catalog-muted">請先在衣服版型管理建立服裝及版型。</span>'}</div><div class="catalog-toolbar">${action('initialize','初始化產品字段',`class="secondary" ${draft.patterns.length ? '' : 'disabled'}`)}<span class="catalog-muted">複製版型尺碼、淨體默認值、範圍及備註；後續修改獨立保存。</span></div>` : '<p class="catalog-muted">無預設尺碼的產品可直接添加字段。例如：毛衣 → 尺碼 → 單選 S、M、L。</p>'}</section>` : `<section class="catalog-section"><div class="catalog-toolbar">${action('add-pattern','＋ 添加版型','class="secondary"')}${action('template','下載導入模板（CSV）','class="secondary"')}<label class="catalog-file">導入 Excel / CSV<input id="catalog-file" type="file" accept=".xlsx,.csv,.tsv,.txt"></label></div><p class="catalog-muted">第一行為服裝名稱；第二行為「字段、各版型名稱、淨體、最小值、最大值、備註」。讀取第一張工作表，導入後可核對修改再保存。空白表示未設定，0 為有效數值。</p><div class="catalog-patterns">${draft.patterns.map(p => `<div class="catalog-pattern-chip">${input('pattern-name',p.name,'text',`data-pattern-id="${p.id}" required placeholder="例如 46A" aria-label="版型名稱" maxlength="64"`)}${action('remove-pattern','移除',`data-id="${p.id}" class="ghost"`)}</div>`).join('')}</div></section>`}
      <section class="catalog-section"><div class="catalog-toolbar"><h3>${product ? '量體字段' : '版型尺碼數據'}</h3>${action('add-field','＋ 添加字段','class="secondary"')}</div>${product ? renderProductFields() : renderMatrix()}</section>
      <p class="catalog-error" role="alert" hidden></p><div class="dialog-actions catalog-footer"><span class="catalog-muted">資料保存在當前瀏覽器</span><button type="submit">保存${product ? '產品' : '版型'}</button></div>
    </form>`;
    dialog.scrollTop = scrollTop;
  }
  function renderMatrix() {
    return `<div class="table-wrap catalog-matrix"><table><thead><tr><th>字段 *</th>${draft.patterns.map(p => `<th>${esc(p.name)} 默認值</th>`).join('')}<th>淨體默認值</th><th>最小值</th><th>最大值</th><th>備註</th><th>操作</th></tr></thead><tbody>${draft.fields.map(f => `<tr data-field="${f.id}"><td>${input('name',f.name,'text','required aria-label="字段名稱"')}</td>${draft.patterns.map(p => `<td>${input('default',f.defaults[p.id] ?? '','number',`data-pattern-id="${p.id}" aria-label="${esc(p.name)} 默認值"`)}</td>`).join('')}<td>${input('body',f.body,'number','aria-label="淨體默認值"')}</td><td>${input('min',f.min,'number','aria-label="最小值"')}</td><td>${input('max',f.max,'number','aria-label="最大值"')}</td><td>${input('hint',f.hint,'text','aria-label="備註"')}</td><td>${action('remove-field','刪除',`data-id="${f.id}" class="danger"`)}</td></tr>`).join('') || `<tr><td colspan="${draft.patterns.length + 6}">添加字段或導入尺碼表開始錄入。</td></tr>`}</tbody></table></div>`;
  }
  function renderProductFields() {
    return draft.fields.map(f => `<article class="catalog-field" data-field="${f.id}"><div class="catalog-field-grid">
      ${label('字段名稱 *',input('name',f.name,'text','required'),'catalog-field-name')}${label('類型',`<select data-key="type">${Object.entries({text:'文本',number:'數字',select:'單選',multiselect:'多選'}).map(([v,n]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`,'catalog-field-type')}${label('排序',input('sort',f.sort,'number','min="0"'),'catalog-field-sort')}<label class="catalog-check"><input data-key="required" type="checkbox" ${f.required ? 'checked' : ''}>必填</label>
      ${f.type === 'number' ? label('最小值',input('min',f.min,'number')) + label('最大值',input('max',f.max,'number')) + label('淨體默認值',input('body',f.body,'number')) : ''}
      ${label('填寫提示 / 備註',input('hint',f.hint,'text','placeholder="例如：單位 cm、量法說明"'),'catalog-field-hint')}
      ${action('remove-field','刪除',`data-id="${f.id}" class="danger catalog-field-delete" aria-label="刪除${esc(f.name || '字段')}"`)}</div>
      ${isChoice(f) ? renderChoiceEditor(f) : !draft.patterns.length ? '<p class="catalog-muted">未使用版型；師傅可直接錄入此字段。</p>' : `<div class="catalog-defaults"><div class="catalog-defaults-heading"><strong>版型默認值</strong><span class="catalog-muted">${draft.patterns.length} 個版型 · 空白為未設定</span></div><div class="catalog-defaults-grid ${f.type === 'number' ? '' : 'catalog-text-defaults'}">${draft.patterns.map(p => label(p.name,input('default',f.defaults[p.id] ?? '',f.type === 'number' ? 'number' : 'text',`data-pattern-id="${p.id}" aria-label="${esc(f.name)} · ${esc(p.name)} 默認值"`))).join('') || '<span class="catalog-muted">尚未選擇版型</span>'}</div></div>`}</article>`).join('') || '<p class="catalog-muted">勾選版型並點擊「初始化產品字段」，或手動添加字段。</p>';
  }
  function choicePreview(f) {
    const opts = choiceOptions(f);
    return opts.map(v=>`<span class="catalog-choice-preview"><span aria-hidden="true">${f.type==='select'?'○':'□'}</span>${esc(v)}</span>`).join('') || '<span class="catalog-muted">填寫選項後，在此預覽師傅端的選擇內容。</span>';
  }
  function renderChoiceEditor(f) {
    return `<div class="catalog-choice-editor"><div class="catalog-toolbar"><strong>產品通用 · ${f.type==='select'?'單選':'多選'}</strong><span class="catalog-muted">所有版型共用；師傅按實際情況選擇，初始不預選。</span>${action('body-options','填入「特體」示例',`data-id="${f.id}" class="secondary"`)}</div><div class="catalog-choice-layout">${label('可選項目 *（每行一項，也可用頓號或逗號分隔）',`<textarea data-key="options" rows="3" placeholder="平肩\n溜肩\n凸肚\n挺胸\n驼背" required>${esc(f.options || '')}</textarea>`)}<div class="catalog-choice-preview-list">${choicePreview(f)}</div></div>${Object.values(f.defaults || {}).some(v=>v!=='')?'<p class="catalog-muted">此字段原有的版型默認值已停用，保存後移除；選項內容保留。</p>':''}</div>`;
  }
  function validate(value, product) {
    if (!value.name.trim()) throw new Error('請填寫名稱。');
    if (!product && !value.patterns.length) throw new Error('請至少添加一個版型。');
    if (product && value.patterns.length && !value.garmentId) throw new Error('使用版型時請選擇服裝來源。');
    const unique = (items, title) => { const names = items.map(v => v.name.trim()); if (names.some(n => !n) || new Set(names).size !== names.length) throw new Error(`${title}不能為空或重複。`); };
    unique(value.patterns, '版型名稱'); unique(value.fields, '字段名稱');
    if (!value.fields.length) throw new Error('請至少添加一個字段。');
    value.fields.forEach(f => {
      if (f.type === 'number') {
        const vals = [f.min, f.max, f.body, ...value.patterns.map(p => f.defaults[p.id] ?? '')];
        if (vals.some(v => v !== '' && !Number.isFinite(Number(v)))) throw new Error(`${f.name}：尺碼必須為有效數字。`);
        if (f.min !== '' && f.max !== '' && Number(f.min) > Number(f.max)) throw new Error(`${f.name}：最小值不能大於最大值。`);
        for (const p of value.patterns) { const v = f.defaults[p.id] ?? ''; if (v !== '' && ((f.min !== '' && Number(v) < Number(f.min)) || (f.max !== '' && Number(v) > Number(f.max)))) throw new Error(`${f.name} / ${p.name}：默認值超出範圍。`); }
      }
      if (['select','multiselect'].includes(f.type)) {
        const options = choiceOptions(f);
        if (!options.length || new Set(options).size !== options.length) throw new Error(`${f.name}：請填寫不重複的選項。`);

      }
    });
  }
  function parseImport(rows) {
    const clean = rows.filter(r => r.some(v => String(v ?? '').trim() !== ''));
    if (clean.length < 3 || !String(clean[0][0] || '').trim()) throw new Error('請使用模板：第一行服裝名稱，第二行字段與版型表頭，第三行起填尺碼。');
    const headers = Array.from(clean[1], v => String(v ?? '').trim());
    const bodyAt = headers.findIndex(h => ['淨體','净体'].includes(h));
    if (!['字段','欄位'].includes(headers[0]) || bodyAt < 2 || !['最小值'].includes(headers[bodyAt + 1]) || headers[bodyAt + 2] !== '最大值' || !['備註','备注'].includes(headers[bodyAt + 3])) throw new Error('表頭須為：字段、版型名稱…、淨體、最小值、最大值、備註。');
    const patterns = headers.slice(1,bodyAt).map(name => ({id:uid('PT'),name}));
    const fields = clean.slice(2).map((r,i) => ({...field(String(r[0] ?? '').trim()), sort:i+1, body:String(r[bodyAt] ?? '').trim(), min:String(r[bodyAt+1] ?? '').trim(), max:String(r[bodyAt+2] ?? '').trim(), hint:String(r[bodyAt+3] ?? '').trim(), defaults:Object.fromEntries(patterns.map((p,j) => [p.id,String(r[j+1] ?? '').trim()]))}));
    const result = {...draft,name:String(clean[0][0]).trim(),patterns,fields};
    validate(result,false); return result;
  }
  function downloadTemplate() {
    const rows = [['西装外套'],['字段','46A','46B','46C','净体','最小值','最大值','备注'],['胸围（成衣）',90,94,98,0,70,98,'单位 cm'],['中腰围（成衣）',80,90,100,0,'','',''],...['袖长（成衣）','袖肥（成衣）','肩宽（成衣）','后中长（成衣）'].map(n=>[n,'','','',0,'','',''])];
    const blob = new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='服装版型导入模板.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  dialog.addEventListener('input', e => {
    const el = e.target, key = el.dataset.key;
    if (!key) return;
    if (key === 'pattern-name') { draft.patterns.find(p=>p.id===el.dataset.patternId).name = el.value; return; }
    const f = draft.fields.find(v=>v.id===el.closest('[data-field]')?.dataset.field);
    if (key === 'default') f.defaults[el.dataset.patternId] = el.value;
    else (f || draft)[key] = el.type === 'checkbox' ? el.checked : el.value;
    if (key === 'options' && f) el.closest('[data-field]').querySelector('.catalog-choice-preview-list').innerHTML=choicePreview(f);
  });
  dialog.addEventListener('change', async e => {
    const el = e.target;
    if (['type', 'pattern-name'].includes(el.dataset.key)) renderEditor();
    if (el.id === 'catalog-garment') {
      if (draft.patterns.length && !confirm('切換服裝將清空版型選擇及版型默認值，保留已有字段和通用選項。是否繼續？')) { el.value=draft.garmentId; return; }
      const g=data().garmentTemplates.find(v=>v.id===el.value); draft.garmentId=g?.id||''; draft.garmentName=g?.name||''; draft.patterns=[]; draft.fields.forEach(f=>{ f.defaults={}; delete f.sourceFieldId; }); renderEditor();
    }
    if (el.dataset.pattern) {
      const id=el.dataset.pattern;
      if (el.checked) { const p=data().garmentTemplates.find(g=>g.id===draft.garmentId)?.patterns.find(p=>p.id===id); if(p) { draft.patterns.push(copy(p)); const order=data().garmentTemplates.find(g=>g.id===draft.garmentId).patterns.map(v=>v.id); draft.patterns.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)); } }
      else { draft.patterns=draft.patterns.filter(p=>p.id!==id); }
      renderEditor();
    }
    if (el.id === 'catalog-file' && el.files[0]) {
      try {
        const file = el.files[0], buffer = await file.arrayBuffer(), signature = new Uint8Array(buffer);
        const text = new TextDecoder('utf-8').decode(buffer).replace(/^\ufeff/, '');
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const delimiter = lines[1]?.includes('\t') ? '\t' : ',';
        const rows = signature[0] === 0x50 && signature[1] === 0x4b ? await parseXlsxRows(buffer) : lines.map(line => splitDelimitedLine(line, delimiter));
        const next=parseImport(rows);
        if ((draft.fields.length || draft.patterns.length) && !confirm('導入將替換當前編輯中的版型及字段，保存後才會生效。是否繼續？')) return;
        // Preserve template identities when importing replacements by name.
        next.patterns.forEach(p=>{ const old=draft.patterns.find(v=>v.name===p.name); if(old) { next.fields.forEach(f=>{f.defaults[old.id]=f.defaults[p.id]; delete f.defaults[p.id];}); p.id=old.id; } });
        next.fields.forEach(f=>{const old=draft.fields.find(v=>v.name===f.name); if(old) f.id=old.id;});
        draft=next; renderEditor(); showToast('導入完成，請核對數據後保存。');
      } catch(err) { error(`導入失敗：${err.message}`); } finally { el.value=''; }
    }
  });
  dialog.addEventListener('submit', e=>{
    e.preventDefault(); if(!isOwner()) return;
    try {
      validate(draft,kind==='product'); const s=data(), key=kind==='product'?'products':'garmentTemplates';
      draft.name=draft.name.trim(); draft.patterns.forEach(p=>p.name=p.name.trim()); draft.fields.forEach(f=>f.name=f.name.trim());
      if(s[key].some(v=>v.id!==draft.id && v.name===draft.name && (kind==='pattern'||v.gender===draft.gender))) throw new Error('同名配置已存在，請修改名稱或編輯已有配置。');
      draft.fields.forEach(f=>{ if(isChoice(f)) { f.scope='common'; f.options=choiceOptions(f).join(','); f.defaults={}; f.body=''; f.min=''; f.max=''; } else f.scope=draft.patterns.length?'pattern':'direct'; });
      draft.fields.sort((a,b)=>Number(a.sort)-Number(b.sort)); draft.updatedAt=nowText();
      const i=s[key].findIndex(v=>v.id===draft.id); if(i<0)s[key].push(copy(draft)); else s[key][i]=copy(draft);
      saveStore(s); dialog.close(); renderLists(); showToast('配置已保存。');
    } catch(err) { error(err.message); }
  });
  document.addEventListener('click', e=>{
    const b=e.target.closest('[data-catalog]'); if(!b||!isOwner()) return;
    const a=b.dataset.catalog, id=b.dataset.id;
    if(a==='new-pattern'||a==='new-product') return open(a==='new-pattern'?'pattern':'product');
    if(a==='edit-pattern'||a==='edit-product') return open(a==='edit-pattern'?'pattern':'product',id);
    if(a==='delete-pattern'||a==='delete-product') {
      const s=data(), key=a==='delete-pattern'?'garmentTemplates':'products';
      if(key==='garmentTemplates' && s.products.some(p=>p.garmentId===id)) return showToast('此服裝已綁定產品，請先解除產品綁定或刪除產品。');
      if(confirm('確定刪除此配置？')) {s[key]=s[key].filter(v=>v.id!==id);saveStore(s);renderLists();} return;
    }
    if(a==='cancel') {dialog.close();return;}
    if(a==='template') {downloadTemplate();return;}
    if(a==='select-all-patterns') {
      const source=data().garmentTemplates.find(g=>g.id===draft.garmentId);
      draft.patterns=[...(source?.patterns || []).map(p=>copy(draft.patterns.find(v=>v.id===p.id) || p)),...draft.patterns.filter(p=>!source?.patterns.some(v=>v.id===p.id))];
    }
    if(a==='clear-patterns') draft.patterns=[];
    if(a==='add-pattern') draft.patterns.push({id:uid('PT'),name:''});
    if(a==='remove-pattern') {draft.patterns=draft.patterns.filter(p=>p.id!==id);draft.fields.forEach(f=>delete f.defaults[id]);}
    if(a==='body-options') { const f=draft.fields.find(f=>f.id===id); if(f.options?.trim()&&!confirm('用特體示例替換當前選項？')) return; f.options='平肩\n溜肩\n凸肚\n挺胸\n驼背'; if(!f.name.trim()) f.name='特體'; }
    if(a==='add-field') draft.fields.push({...field(),sort:draft.fields.length+1});
    if(a==='remove-field') draft.fields=draft.fields.filter(f=>f.id!==id);
    if(a==='initialize') {
      const g=data().garmentTemplates.find(v=>v.id===draft.garmentId);
      if(!g||!draft.patterns.length) return error('請先選擇服裝並勾選版型。');
      if(draft.fields.length&&!confirm('重新初始化會替換現有字段及手動修改，是否繼續？')) return;
      if(draft.patterns.some(p=>!g.patterns.some(v=>v.id===p.id))) return error('所選版型已從版型庫移除，請取消勾選後再初始化。');
      draft.patterns=draft.patterns.map(p=>copy(g.patterns.find(v=>v.id===p.id)));
      draft.fields=g.fields.map((f,i)=>({...copy(f),id:uid('PF'),sourceFieldId:f.id,sort:i+1,defaults:Object.fromEntries(draft.patterns.map(p=>[p.id,f.defaults[p.id]??'']))}));
      draft.garmentName=g.name;
    }
    renderEditor();
  });
  document.querySelectorAll('[data-view="patterns"],[data-view="products"]').forEach(b=>b.addEventListener('click',renderLists));
  window.addEventListener('storage',renderLists);
  renderLists();
})();

/* Product snapshots remain stable for the duration of one measurement. */
window.TailorProducts = (() => {
  const root = document.getElementById('configured-products');
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let products = [], entries = {}, active = 0, enabled = false, expandedField = '';
  const isChoice = f => ['select','multiselect'].includes(f.type);
  const options = f => String(f.options || '').split(/[,，、\n]/).map(v=>v.trim()).filter(Boolean);
  const copy = v => JSON.parse(JSON.stringify(v));
  function start() {
    const configured = shouldUseServerApi() ? [] : loadAdminStore()?.products || [];
    enabled = configured.length > 0 && Boolean(state.employee);
    products = copy(configured.filter(p=>p.gender === state.employee?.gender));
    entries = {}; active = 0; expandedField = '';
    for (const p of products) entries[p.id] = {patternId:'', fields:{}};
    render(); return enabled;
  }
  function result(p,f) {
    const entry = entries[p.id], value = entry.fields[f.id] || {};
    if (isChoice(f)) return {mode:'common',scope:'common',baseline:'',value:value.value ?? ''};
    const baseline = f.defaults[entry.patternId] ?? '';
    if (f.type !== 'number') return {mode:'value',baseline,value:value.value ?? baseline};
    const mode = value.mode || (baseline === '' ? 'body' : 'adjustment');
    const adjustment = value.adjustment ?? '', body = value.body ?? '';
    const calculated = baseline !== '' && Number.isFinite(Number(baseline)) && Number.isFinite(Number(adjustment)) ? String(Math.round((Number(baseline)+Number(adjustment))*1e6)/1e6) : '';
    return {mode,baseline,adjustment,body,value:mode==='body'?body:calculated};
  }
  function render() {
    document.getElementById('product-prev').textContent = active ? '上一產品' : '返回資料';
    document.getElementById('product-next').textContent = active === products.length-1 ? '核對並提交' : '下一產品';
    if (!products.length) {root.innerHTML='<p class="notice">未找到適用此員工性別的產品，請先在管理後台配置產品及版型。</p>';return;}
    const p=products[active], entry=entries[p.id];
    root.innerHTML=`<div class="product-tabs" aria-label="量身產品">${products.map((v,i)=>`<button type="button" data-product-index="${i}" class="${i===active?'is-active':''}" aria-pressed="${i===active}">${esc(v.name)}</button>`).join('')}</div>
      <div class="product-heading"><h3>${esc(p.name)}</h3><span>${active+1} / ${products.length}</span></div>
      <fieldset class="tailor-pattern-picker"><legend>選擇版型 *</legend><div class="tailor-pattern-grid">${p.patterns.map(v=>`<label><input type="radio" name="product-pattern" data-pattern-choice value="${esc(v.id)}" ${entry.patternId===v.id?'checked':''}><span>${esc(v.name)}</span></label>`).join('')}</div></fieldset>
      <p class="measure-hint">${entry.patternId ? '加減量填 +2 或 -1；留空表示沿用版型。淨體尺寸請填實測值，與成衣尺寸分開記錄。' : '選擇後顯示各字段的版型默認值。'}</p>
      ${entry.patternId ? p.fields.map(f=>renderField(p,f)).join('') : '<div class="product-empty">先選版型，再逐項量身；通用項目可先填寫。</div>'+p.fields.filter(isChoice).map(f=>renderField(p,f)).join('')}`;
  }
  function renderField(p,f) {
    const r=result(p,f), numeric=f.type==='number';
    const opts=options(f);
    const control = numeric ? `<div class="product-mode" role="group" aria-label="${esc(f.name)}錄入方式"><button type="button" data-mode="adjustment" aria-pressed="${r.mode==='adjustment'}" ${r.baseline===''?'disabled':''}>版型加減</button><button type="button" data-mode="body" aria-pressed="${r.mode==='body'}">淨體錄入</button></div>
      <div class="product-number-row"><label class="field"><span>${r.mode==='body'?'淨體尺寸（cm）':'加減量（cm）'}</span><input data-value="${r.mode==='body'?'body':'adjustment'}" type="text" inputmode="${r.mode==='body'?'decimal':'text'}" autocomplete="off" placeholder="${r.mode==='body'?'輸入實測尺寸':'+2 / -1'}" value="${esc(r.mode==='body'?r.body:r.adjustment)}"></label><div class="product-result"><span>${r.mode==='body'?'記錄為淨體':'成衣尺寸（cm）'}</span><strong data-result>${esc(r.value || '—')}</strong><small data-equation>${equation(r)}</small></div></div>`
      : isChoice(f) ? `<div class="product-choice-heading"><span data-choice-count>${f.type==='select'?'單選':`多選 · 已選 ${String(r.value).split(',').filter(Boolean).length} 項`}</span><button type="button" data-clear-choice>清空選擇</button></div><div class="product-choice-options" role="group" aria-label="${esc(f.name)}">${opts.map(v=>`<label><input type="${f.type==='select'?'radio':'checkbox'}" name="choice-${f.id}" data-option="${esc(v)}" ${String(r.value).split(',').includes(v)?'checked':''}><span>${esc(v)}</span></label>`).join('')}</div>`
      : `<label class="field"><span>本次數值</span><input type="text" data-value="value" value="${esc(r.value)}"></label>`;
    const expanded = expandedField === f.id;
    return `<article class="product-measure-field" data-product-field="${f.id}"><button type="button" class="product-field-toggle" data-expand-field="${f.id}" aria-expanded="${expanded}" aria-controls="product-panel-${f.id}"><span class="product-field-name">${esc(f.name)}${f.required?' <em>*</em>':''}</span><span class="product-field-baseline">${isChoice(f) ? `產品通用 · ${f.type==='select'?'單選':'多選'}` : `默認 ${esc(r.baseline === '' ? '未設定' : r.baseline)}${numeric && r.baseline!==''?' cm':''}`}</span><span class="product-field-status" data-field-status>${esc(fieldStatus(r,numeric))}</span><span class="product-field-chevron" aria-hidden="true">⌄</span></button><div id="product-panel-${f.id}" class="product-field-panel" ${expanded?'':'hidden'}>${f.hint?`<p class="measure-hint">${esc(f.hint)}</p>`:''}${numeric&&r.baseline===''?'<p class="measure-hint">此版型未設定默認值，請錄入淨體尺寸。</p>':''}${control}</div></article>`;
  }
  function fieldStatus(r,numeric) {
    if (!numeric) return r.value === '' ? (r.mode==='common'?'未選擇':'待填寫') : String(r.value).replaceAll(',', '、');
    const raw = r.mode === 'body' ? r.body : r.adjustment;
    if (raw !== '' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return '數值待修正';
    if (r.value === '') return '淨體待填寫';
    if (r.mode === 'body') return `淨體 ${r.value} cm`;
    if (r.adjustment === '' || Number(r.adjustment) === 0) return `沿用版型 ${r.value} cm`;
    return `成衣 ${r.value} cm（${Number(r.adjustment)>0?'+':''}${Number(r.adjustment)}）`;
  }
  function expandField(id) {
    expandedField = expandedField === id ? '' : id;
    root.querySelectorAll('[data-product-field]').forEach(row => {
      const open = row.dataset.productField === expandedField;
      row.querySelector('[data-expand-field]').setAttribute('aria-expanded', String(open));
      row.querySelector('.product-field-panel').hidden = !open;
    });
  }

  function equation(r) {return r.mode==='body'?'不換算為成衣尺寸':!Number.isFinite(Number(r.adjustment))?'請輸入有效加減量':`${esc(r.baseline)} ${Number(r.adjustment)<0?'−':'+'} ${esc(r.adjustment===''?'0':Math.abs(Number(r.adjustment)))}`;}
  function validate(index) {
    const p=products[index]; if(!p) return '請先在管理後台配置適用產品。';
    if(!entries[p.id].patternId) return `${p.name}：請選擇版型。`;
    for(const f of p.fields) {
      const invalid = message => { expandedField=f.id; return message; };
      const r=result(p,f), prefix=`${p.name} · ${f.name}`;
      if(f.type==='number') {
        const raw=r.mode==='body'?r.body:r.adjustment;
        if(raw!==''&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return invalid(`${prefix}：請輸入有效數字。`);
        if(raw!==''&&!Number.isFinite(Number(raw))) return invalid(`${prefix}：數值無效。`);
        if(r.value!==''&&Number(r.value)<0) return invalid(`${prefix}：尺寸不能小於 0。`);
        if(r.mode==='adjustment'&&r.value!==''&&((f.min!==''&&Number(r.value)<Number(f.min))||(f.max!==''&&Number(r.value)>Number(f.max)))) return invalid(`${prefix}：成衣尺寸超出配置範圍 ${f.min || '不限'} ～ ${f.max || '不限'}。`);
      }
      if(isChoice(f) && r.value !== '' && (String(r.value).split(',').some(v=>!options(f).includes(v)) || (f.type==='select' && String(r.value).split(',').length>1))) return invalid(`${prefix}：請選擇有效選項。`);
      if(f.required&&r.value==='') return invalid(isChoice(f) ? `${prefix}：此項必填，請${f.type==='select'?'選擇一項':'至少選擇一項'}。` : `${prefix}：請填寫必填尺寸或數值。`);
    }
    return '';
  }
  function validateAll() {
    for(let i=0;i<Math.max(products.length,1);i++) {const message=validate(i);if(message){active=i;render();return message;}} return '';
  }
  function record() {
    const measurements={},measurement_labels={};
    const product_measurements=products.map(p=>{
      const e=entries[p.id], pattern=p.patterns.find(v=>v.id===e.patternId);
      const fields=p.fields.map(f=>{
        const r=result(p,f),key=`${p.id}.${f.id}`;
        if(r.value!=='') { measurements[key]=r.value;measurement_labels[key]=`${p.name} / ${f.name}${r.mode==='body'?'（淨體）':''}`; }
        return {field_id:f.id,name:f.name,type:f.type,...r,...(isChoice(f)?{selected_options:String(r.value).split(',').filter(Boolean)}:{})};
      });
      return {product_id:p.id,product_name:p.name,pattern_id:e.patternId,pattern_name:pattern?.name||'',fields,schema_snapshot:copy(p)};
    });return {measurements,measurement_labels,product_measurements};
  }
  function summary(record) {
    return (record.product_measurements||[]).map(p=>`<section class="product-summary"><h3>${esc(p.product_name)} · ${esc(p.pattern_name)}</h3>${p.fields.map(f=>`<div><span>${esc(f.name)}</span><strong>${esc(f.value===''?'未填寫':f.value)}${f.type==='number'&&f.value!==''?' cm':''}</strong><small>${f.mode==='body'?'淨體尺寸':f.mode==='adjustment'?`版型 ${esc(f.baseline)} ${Number(f.adjustment)<0?'−':'+'} ${esc(f.adjustment===''?'0':Math.abs(Number(f.adjustment)))} → 成衣`:f.mode==='common'?'產品通用選項':'本次數值'}</small></div>`).join('')}</section>`).join('');
  }
  root.addEventListener('change',e=>{
    if(state.lockedRecord) return;
    if(e.target.matches('[data-pattern-choice]')) {
      const p=products[active], entry=entries[p.id];
      const commonIds = new Set(p.fields.filter(isChoice).map(f=>f.id));
      if(entry.patternId&&Object.entries(entry.fields).some(([id,f])=>!commonIds.has(id)&&Object.values(f).some(v=>v!==''))&&!confirm('更換版型會清空版型相關字段的錄入並重新載入默認值，通用單選／多選會保留。是否繼續？')) {render();root.querySelector('[data-pattern-choice]:checked')?.focus({preventScroll:true});return;}
      entry.patternId=e.target.value;entry.fields=Object.fromEntries(Object.entries(entry.fields).filter(([id])=>commonIds.has(id)));expandedField='';render();root.querySelector('[data-pattern-choice]:checked')?.focus({preventScroll:true});
    }
  });
  root.addEventListener('input',e=>{
    if(state.lockedRecord) return;
    const row=e.target.closest('[data-product-field]');if(!row)return;
    const p=products[active],f=p.fields.find(f=>f.id===row.dataset.productField),entry=entries[p.id];
    entry.fields[f.id] ||= {};
    if(e.target.dataset.value) entry.fields[f.id][e.target.dataset.value]=e.target.value.trim();
    if(e.target.dataset.option!==undefined) entry.fields[f.id].value=[...row.querySelectorAll('[data-option]:checked')].map(el=>el.dataset.option).join(',');
    const r=result(p,f);if(isChoice(f)) row.querySelector('[data-choice-count]').textContent=f.type==='select'?'單選':`多選 · 已選 ${String(r.value).split(',').filter(Boolean).length} 項`;row.querySelector('[data-field-status]').textContent=fieldStatus(r,f.type==='number');if(row.querySelector('[data-result]')){row.querySelector('[data-result]').textContent=r.value||'—';row.querySelector('[data-equation]').innerHTML=equation(r);}
  });
  root.addEventListener('click',e=>{
    if(state.lockedRecord)return;
    const clear=e.target.closest('[data-clear-choice]');if(clear){const row=clear.closest('[data-product-field]');entries[products[active].id].fields[row.dataset.productField]={value:''};render();return;}
    const toggle=e.target.closest('[data-expand-field]');if(toggle){expandField(toggle.dataset.expandField);return;}
    const tab=e.target.closest('[data-product-index]');if(tab){active=Number(tab.dataset.productIndex);expandedField='';render();return;}
    const button=e.target.closest('[data-mode]');if(!button)return;
    const id=button.closest('[data-product-field]').dataset.productField;
    entries[products[active].id].fields[id] ||= {};
    entries[products[active].id].fields[id].mode=button.dataset.mode;
    const top=window.scrollY;render();window.scrollTo(0,top);
  });
  document.getElementById('product-prev').addEventListener('click',()=>{if(state.lockedRecord)return;if(active){active--;expandedField='';render();window.scrollTo(0,0);}else setPage(1);});
  document.getElementById('product-next').addEventListener('click',()=>{if(state.lockedRecord)return;const message=validate(active);if(message){render();return showToast(message);}if(active<products.length-1){active++;expandedField='';render();window.scrollTo(0,0);}else{const err=validateAll();if(err)return showToast(err);setPage(9);}});
  return {start,record,summary,validateAll,enabled:()=>enabled,reset:()=>{products=[];entries={};enabled=false;active=0;expandedField='';root.innerHTML='';}};
})();

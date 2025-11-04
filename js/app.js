// ---------- Storage helpers ----------
const store = {
  get: (k, d=[]) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  exportAll: () => {
    const keys = ['dnd.characters','dnd.weapons','dnd.spells','dnd.stories'];
    const payload = {};
    keys.forEach(k => payload[k] = store.get(k, []));
    return payload;
  },
  importAll: (payload) => {
    if (payload['dnd.characters']) store.set('dnd.characters', payload['dnd.characters']);
    if (payload['dnd.weapons']) store.set('dnd.weapons', payload['dnd.weapons']);
    if (payload['dnd.spells']) store.set('dnd.spells', payload['dnd.spells']);
    if (payload['dnd.stories']) store.set('dnd.stories', payload['dnd.stories']);
  }
};

// ---------- Tabs ----------
document.querySelectorAll('.tab[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('main > section').forEach(sec => sec.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');
  });
});

// ---------- Export / Import ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dnd_toolkit_export.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      store.importAll(data);
      renderAll();
      alert('Import complete.');
    } catch (err) {
      alert('Invalid JSON.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ---------- Utilities ----------
const mod = s => Math.floor((Number(s||0) - 10) / 2);
const fmtMod = n => (n >= 0 ? '+'+n : String(n));
const d = n => Math.floor(Math.random() * n) + 1;
const roll4d6DropLowest = () => {
  const r = [d(6), d(6), d(6), d(6)].sort((a,b)=>a-b).slice(1);
  return r.reduce((a,b)=>a+b,0);
};

async function uploadImage(type, file){
  const fd = new FormData();
  fd.append('type', type);
  fd.append('file', file);
  const res = await fetch('upload_image.php', { method:'POST', body: fd });
  const json = await res.json().catch(()=>({ok:false,error:'bad json'}));
  if (!json.ok) throw new Error(json.error||'upload failed');
  return json.url;
}

// ---------- Characters ----------
const $ = (id) => document.getElementById(id);

const statInputs = ['str','dex','con','int','wis','cha'].map(x => $('ch_'+x));
const statMods = ['str','dex','con','int','wis','cha'].map(x => $('mod_'+x));
const updateStatMods = () => {
  statInputs.forEach((input, i) => {
    const m = mod(input.value);
    statMods[i].textContent = 'mod ' + fmtMod(m);
  });
};
statInputs.forEach(i => i.addEventListener('input', updateStatMods));
$('rollStatsBtn').addEventListener('click', () => {
  statInputs.forEach(i => i.value = roll4d6DropLowest());
  updateStatMods();
});
$('clearStatsBtn').addEventListener('click', () => {
  statInputs.forEach(i => i.value = '');
  updateStatMods();
});

const getCharacterForm = () => ({
  id: crypto.randomUUID(),
  name: $('ch_name').value.trim(),
  race: $('ch_race').value.trim(),
  klass: $('ch_class').value.trim(),
  level: Number($('ch_level').value || 1),
  bg: $('ch_bg').value.trim(),
  align: $('ch_align').value.trim(),
  stats: {
    str: Number($('ch_str').value||0),
    dex: Number($('ch_dex').value||0),
    con: Number($('ch_con').value||0),
    int: Number($('ch_int').value||0),
    wis: Number($('ch_wis').value||0),
    cha: Number($('ch_cha').value||0),
  },
  hp: Number($('ch_hp').value||0),
  ac: Number($('ch_ac').value||0),
  speed: Number($('ch_speed').value||0),
  traits: $('ch_traits').value,
  notes: $('ch_notes').value,
  weapons: Array.from(($('ch_weapons')||{}).selectedOptions||[]).map(o=>o.value),
  spells: Array.from(($('ch_spells')||{}).selectedOptions||[]).map(o=>o.value),
  imageUrl: $('ch_image_url')?.value || '',
  createdAt: Date.now()
});

const setCharacterForm = (c) => {
  $('ch_name').value = c.name||'';
  $('ch_race').value = c.race||'';
  $('ch_class').value = c.klass||'';
  $('ch_level').value = c.level||1;
  $('ch_bg').value = c.bg||'';
  $('ch_align').value = c.align||'';
  $('ch_str').value = c.stats?.str||'';
  $('ch_dex').value = c.stats?.dex||'';
  $('ch_con').value = c.stats?.con||'';
  $('ch_int').value = c.stats?.int||'';
  $('ch_wis').value = c.stats?.wis||'';
  $('ch_cha').value = c.stats?.cha||'';
  $('ch_hp').value = c.hp||8;
  $('ch_ac').value = c.ac||10;
  $('ch_speed').value = c.speed||30;
  $('ch_traits').value = c.traits||'';
  $('ch_notes').value = c.notes||'';
  if ($('ch_image_url')) $('ch_image_url').value = c.imageUrl||'';
  const prev = $('ch_image_preview');
  if (prev){
    if (c.imageUrl){ prev.src = c.imageUrl; prev.style.display = ''; }
    else { prev.src = ''; prev.style.display = 'none'; }
  }
  // set weapons and spells selections
  try {
    const wSel = $('ch_weapons'); const sSel = $('ch_spells');
    if (wSel){ Array.from(wSel.options).forEach(o=> o.selected = (c.weapons||[]).includes(o.value)); }
    if (sSel){ Array.from(sSel.options).forEach(o=> o.selected = (c.spells||[]).includes(o.value)); }
  } catch {}
  updateStatMods();
};

let editCharacterId = null;
$('saveCharacterBtn').addEventListener('click', () => {
  const c = getCharacterForm();
  let chars = store.get('dnd.characters', []);
  if (!c.name) { alert('Name is required.'); return; }
  if (editCharacterId) {
    c.id = editCharacterId;
    chars = chars.map(x => x.id === editCharacterId ? c : x);
    editCharacterId = null;
  } else {
    chars.push(c);
  }
  store.set('dnd.characters', chars);
  setCharacterForm({}); // reset
  renderCharacters();
});

$('resetCharacterBtn').addEventListener('click', () => { setCharacterForm({}); editCharacterId = null; });

const renderCharacters = () => {
  const tbody = document.querySelector('#charactersTable tbody');
  const data = store.get('dnd.characters', []);
  tbody.innerHTML = '';
  data.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(c.name)}</td>
      <td class="muted">${esc(c.klass||'')}</td>
      <td><span class="badge">Lv ${c.level||1}</span></td>
      <td>${c.ac||0}</td>
      <td>${c.hp||0}</td>
      <td>${(c.weapons||[]).length}</td>
      <td>${(c.spells||[]).length}</td>
      <td><button class="btn small" data-act="card" data-id="${c.id}">Card</button></td>
      <td class="right">
        <button class="btn small" data-act="edit" data-id="${c.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${c.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach(b => {
    const id = b.dataset.id;
    const act = b.dataset.act;
    b.addEventListener('click', () => {
      const list = store.get('dnd.characters', []);
      if (act === 'edit') {
        const found = list.find(x => x.id === id);
        if (found) { setCharacterForm(found); editCharacterId = id; window.scrollTo({top:0,behavior:'smooth'}); }
      } else if (act === 'del') {
        if (confirm('Delete this character?')) {
          const rest = list.filter(x => x.id !== id);
          store.set('dnd.characters', rest);
          renderCharacters();
        }
      } else if (act === 'card') {
        const found = list.find(x => x.id === id);
        if (found) openCard('character', found);
      }
    });
  });
};

// Character image upload handlers
if ($('ch_image_upload')){
  $('ch_image_upload').addEventListener('click', async () => {
    const file = $('ch_image_file')?.files?.[0];
    if (!file) { alert('Choose an image file first.'); return; }
    try {
      const url = await uploadImage('chars', file);
      if ($('ch_image_url')) $('ch_image_url').value = url;
      const prev = $('ch_image_preview');
      if (prev){ prev.src = url; prev.style.display = ''; }
    } catch (e){ alert('Upload failed: ' + e.message); }
  });
}

// ---------- Weapons ----------
let editWeaponId = null;
function setWeaponForm(w){
  $('wp_name').value = w?.name||'';
  $('wp_type').value = w?.type||'';
  $('wp_dmg').value = w?.dmg||'';
  $('wp_props').value = w?.props||'';
  if ($('wp_image_url')) $('wp_image_url').value = w?.imageUrl||'';
  const prev = $('wp_image_preview');
  if (prev){
    if (w?.imageUrl){ prev.src = w.imageUrl; prev.style.display = ''; }
    else { prev.src = ''; prev.style.display = 'none'; }
  }
}
const getWeaponForm = () => ({
  id: crypto.randomUUID(),
  name: $('wp_name').value.trim(),
  type: $('wp_type').value.trim(),
  dmg: $('wp_dmg').value.trim(),
  props: $('wp_props').value.trim(),
  imageUrl: $('wp_image_url')?.value || '',
});

$('saveWeaponBtn').addEventListener('click', () => {
  const w = getWeaponForm();
  if (!w.name) { alert('Weapon name required.'); return; }
  let list = store.get('dnd.weapons', []);
  if (editWeaponId){
    w.id = editWeaponId;
    list = list.map(x => x.id === editWeaponId ? w : x);
    editWeaponId = null;
  } else {
    list.push(w);
  }
  store.set('dnd.weapons', list);
  setWeaponForm({});
  renderWeapons();
  populateCharAssocSelects();
});

const renderWeapons = () => {
  const tbody = document.querySelector('#weaponsTable tbody');
  const data = store.get('dnd.weapons', []);
  tbody.innerHTML = '';
  data.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(w.name)}</td>
      <td class="muted">${esc(w.type||'')}</td>
      <td>${esc(w.dmg||'')}</td>
      <td class="muted">${esc(w.props||'')}</td>
      <td><button class="btn small" data-act="card" data-id="${w.id}">Card</button></td>
      <td class="right">
        <button class="btn small" data-act="edit" data-id="${w.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${w.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach(b => {
    const id = b.dataset.id;
    const act = b.dataset.act;
    b.addEventListener('click', () => {
      if (act === 'del'){
        if (confirm('Delete this weapon?')) {
          const rest = store.get('dnd.weapons', []).filter(x => x.id !== id);
          store.set('dnd.weapons', rest);
          renderWeapons();
        }
      } else if (act === 'card'){
        const list = store.get('dnd.weapons', []);
        const found = list.find(x => x.id === id);
        if (found) openCard('weapon', found);
      } else if (act === 'edit'){
        const list = store.get('dnd.weapons', []);
        const found = list.find(x => x.id === id);
        if (found){ setWeaponForm(found); editWeaponId = id; window.scrollTo({top:0,behavior:'smooth'}); }
      }
    });
  });
};

// Weapon image upload
if ($('wp_image_upload')){
  $('wp_image_upload').addEventListener('click', async () => {
    const file = $('wp_image_file')?.files?.[0];
    if (!file) { alert('Choose an image file first.'); return; }
    try {
      const url = await uploadImage('weapons', file);
      if ($('wp_image_url')) $('wp_image_url').value = url;
      const prev = $('wp_image_preview');
      if (prev){ prev.src = url; prev.style.display = ''; }
    } catch (e){ alert('Upload failed: ' + e.message); }
  });
}
document.getElementById('viewWeaponCardBtn')?.addEventListener('click', () => {
  const w = getWeaponForm();
  if (!w.name){ alert('Enter a weapon name first.'); return; }
  openCard('weapon', w);
});

// ---------- Spells ----------
let editSpellId = null;
function setSpellForm(s){
  $('sp_name').value = s?.name||'';
  $('sp_level').value = s?.level ?? 0;
  $('sp_school').value = s?.school||'';
  $('sp_cast').value = s?.casting||'';
  $('sp_range').value = s?.range||'';
  $('sp_duration').value = s?.duration||'';
  $('sp_components').value = s?.comps||'';
  $('sp_desc').value = s?.desc||'';
  if ($('sp_image_url')) $('sp_image_url').value = s?.imageUrl||'';
  const prev = $('sp_image_preview');
  if (prev){
    if (s?.imageUrl){ prev.src = s.imageUrl; prev.style.display = ''; }
    else { prev.src = ''; prev.style.display = 'none'; }
  }
}
const getSpellForm = () => ({
  id: crypto.randomUUID(),
  name: $('sp_name').value.trim(),
  level: Number($('sp_level').value||0),
  school: $('sp_school').value.trim(),
  casting: $('sp_cast').value.trim(),
  range: $('sp_range').value.trim(),
  duration: $('sp_duration').value.trim(),
  comps: $('sp_components').value.trim(),
  desc: $('sp_desc').value.trim(),
  imageUrl: $('sp_image_url')?.value || '',
});

$('saveSpellBtn').addEventListener('click', () => {
  const s = getSpellForm();
  if (!s.name) { alert('Spell name required.'); return; }
  let list = store.get('dnd.spells', []);
  if (editSpellId){
    s.id = editSpellId;
    list = list.map(x => x.id === editSpellId ? s : x);
    editSpellId = null;
  } else {
    list.push(s);
  }
  store.set('dnd.spells', list);
  setSpellForm({});
  renderSpells();
  populateCharAssocSelects();
});

const renderSpells = () => {
  const tbody = document.querySelector('#spellsTable tbody');
  const data = store.get('dnd.spells', []);
  tbody.innerHTML = '';
  data.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(s.name)}</td>
      <td><span class="badge">${s.level}</span></td>
      <td class="muted">${esc(s.school||'')}</td>
      <td>${esc(s.casting||'')}</td>
      <td>${esc(s.range||'')}</td>
      <td>${esc(s.duration||'')}</td>
      <td><button class="btn small" data-act="card" data-id="${s.id}">Card</button></td>
      <td class="right">
        <button class="btn small" data-act="edit" data-id="${s.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${s.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach(b => {
    const id = b.dataset.id;
    const act = b.dataset.act;
    b.addEventListener('click', () => {
      if (act === 'del'){
        if (confirm('Delete this spell?')) {
          const rest = store.get('dnd.spells', []).filter(x => x.id !== id);
          store.set('dnd.spells', rest);
          renderSpells();
        }
      } else if (act === 'card'){
        const list = store.get('dnd.spells', []);
        const found = list.find(x => x.id === id);
        if (found) openCard('spell', found);
      } else if (act === 'edit'){
        const list = store.get('dnd.spells', []);
        const found = list.find(x => x.id === id);
        if (found){ setSpellForm(found); editSpellId = id; window.scrollTo({top:0,behavior:'smooth'}); }
      }
    });
  });
};

// Spell image upload
if ($('sp_image_upload')){
  $('sp_image_upload').addEventListener('click', async () => {
    const file = $('sp_image_file')?.files?.[0];
    if (!file) { alert('Choose an image file first.'); return; }
    try {
      const url = await uploadImage('spells', file);
      if ($('sp_image_url')) $('sp_image_url').value = url;
      const prev = $('sp_image_preview');
      if (prev){ prev.src = url; prev.style.display = ''; }
    } catch (e){ alert('Upload failed: ' + e.message); }
  });
}
document.getElementById('viewSpellCardBtn')?.addEventListener('click', () => {
  const s = getSpellForm();
  if (!s.name){ alert('Enter a spell name first.'); return; }
  openCard('spell', s);
});

// ---------- Cards Modal ----------
function openCard(kind, obj){
  const modal = document.getElementById('cardModal');
  const content = document.getElementById('cardContent');
  if (!modal || !content) return;
  let html = '';
  if (kind === 'character'){
    html += `<div class="grid" style="grid-template-columns: 180px 1fr; gap:16px;">`;
    html += `<div>`;
    if (obj.imageUrl) html += `<img src="${esc(obj.imageUrl)}" alt="" style="width:100%; border:1px solid var(--border); border-radius:8px;" />`;
    html += `</div>`;
    html += `<div class="stack">`;
    html += `<h2 style="margin:0">${esc(obj.name)}</h2>`;
    html += `<div class="muted">${esc(obj.race||'')} ${esc(obj.klass||'')} — Lv ${obj.level||1}</div>`;
    html += `<div class="row-3"><div><strong>AC</strong><div>${obj.ac||0}</div></div><div><strong>HP</strong><div>${obj.hp||0}</div></div><div><strong>Speed</strong><div>${obj.speed||0}</div></div></div>`;
    const s=obj.stats||{};
    html += `<div class="row"><div><strong>STR</strong><div>${s.str||0}</div></div><div><strong>DEX</strong><div>${s.dex||0}</div></div><div><strong>CON</strong><div>${s.con||0}</div></div><div><strong>INT</strong><div>${s.int||0}</div></div><div><strong>WIS</strong><div>${s.wis||0}</div></div><div><strong>CHA</strong><div>${s.cha||0}</div></div></div>`;
    if (obj.traits) html += `<div><strong>Traits</strong><div class="muted">${esc(obj.traits)}</div></div>`;
    if (obj.notes) html += `<div><strong>Notes</strong><div class="muted">${esc(obj.notes)}</div></div>`;
    html += `</div></div>`;
  } else if (kind === 'weapon'){
    html += `<div class="grid" style="grid-template-columns: 180px 1fr; gap:16px;">`;
    html += `<div>`;
    if (obj.imageUrl) html += `<img src="${esc(obj.imageUrl)}" alt="" style="width:100%; border:1px solid var(--border); border-radius:8px;" />`;
    html += `</div>`;
    html += `<div class="stack">`;
    html += `<h2 style="margin:0">${esc(obj.name)}</h2>`;
    html += `<div class="muted">${esc(obj.type||'')}</div>`;
    html += `<div><strong>Damage</strong>: ${esc(obj.dmg||'')}</div>`;
    if (obj.props) html += `<div><strong>Properties</strong>: <span class="muted">${esc(obj.props)}</span></div>`;
    html += `</div></div>`;
  } else if (kind === 'spell'){
    html += `<div class="grid" style="grid-template-columns: 180px 1fr; gap:16px;">`;
    html += `<div>`;
    if (obj.imageUrl) html += `<img src="${esc(obj.imageUrl)}" alt="" style="width:100%; border:1px solid var(--border); border-radius:8px;" />`;
    html += `</div>`;
    html += `<div class="stack">`;
    html += `<h2 style="margin:0">${esc(obj.name)}</h2>`;
    html += `<div class="muted">Level ${obj.level||0} — ${esc(obj.school||'')}</div>`;
    html += `<div class="row-3"><div><strong>Casting</strong><div>${esc(obj.casting||'')}</div></div><div><strong>Range</strong><div>${esc(obj.range||'')}</div></div><div><strong>Duration</strong><div>${esc(obj.duration||'')}</div></div></div>`;
    if (obj.comps) html += `<div><strong>Components</strong>: <span class="muted">${esc(obj.comps)}</span></div>`;
    if (obj.desc) html += `<div><strong>Description</strong><div class="muted">${esc(obj.desc)}</div></div>`;
    html += `</div></div>`;
  }
  content.innerHTML = html;
  modal.style.display = '';
  document.body.classList.add('modal-open');
}

function closeCard(){
  const modal = document.getElementById('cardModal');
  if (modal){ modal.style.display = 'none'; document.body.classList.remove('modal-open'); }
}

document.getElementById('closeCardBtn')?.addEventListener('click', closeCard);
document.querySelector('#cardModal .modal-backdrop')?.addEventListener('click', closeCard);

// View card from character form
document.getElementById('viewCharacterCardBtn')?.addEventListener('click', () => {
  const c = getCharacterForm();
  if (!c.name) { alert('Enter a name first.'); return; }
  openCard('character', c);
});

// ---------- Storylines ----------
let tempQuests = [];
const renderTempQuests = () => {
  const root = $('st_quests');
  root.innerHTML = '';
  tempQuests.forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = 'flex';
    row.innerHTML = `
      <span class="badge">${idx+1}</span>
      <span style="flex:1">${esc(q)}</span>
      <button class="btn small" data-idx="${idx}">Up</button>
      <button class="btn small" data-idx="${idx}" data-act="down">Down</button>
      <button class="btn small danger" data-idx="${idx}" data-act="del">X</button>
    `;
    root.appendChild(row);
  });
  root.querySelectorAll('button').forEach(b => {
    const idx = Number(b.dataset.idx);
    const act = b.dataset.act || 'up';
    b.addEventListener('click', () => {
      if (act === 'del') { tempQuests.splice(idx,1); }
      else if (act === 'down' && idx < tempQuests.length - 1) { [tempQuests[idx], tempQuests[idx+1]] = [tempQuests[idx+1], tempQuests[idx]]; }
      else if (act === 'up' && idx > 0) { [tempQuests[idx], tempQuests[idx-1]] = [tempQuests[idx-1], tempQuests[idx]]; }
      renderTempQuests();
    });
  });
};
$('st_add_quest').addEventListener('click', () => {
  const v = $('st_new_quest').value.trim();
  if (!v) return;
  tempQuests.push(v); $('st_new_quest').value = ''; renderTempQuests();
});
const getStoryForm = () => ({
  id: crypto.randomUUID(),
  title: $('st_title').value.trim(),
  theme: $('st_theme').value.trim(),
  tier: $('st_tier').value,
  synopsis: $('st_synopsis').value.trim(),
  beats: [...tempQuests],
  createdAt: Date.now(),
});
$('saveStoryBtn').addEventListener('click', () => {
  const s = getStoryForm();
  if (!s.title) { alert('Story title required.'); return; }
  const list = store.get('dnd.stories', []);
  list.push(s);
  store.set('dnd.stories', list);
  tempQuests = [];
  ['st_title','st_theme','st_synopsis','st_new_quest'].forEach(id => $(id).value = '');
  renderTempQuests();
  renderStories();
});

const renderStories = () => {
  const tbody = document.querySelector('#storiesTable tbody');
  const data = store.get('dnd.stories', []);
  tbody.innerHTML = '';
  data.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(s.title)}</td>
      <td><span class="badge">${esc(s.tier)}</span></td>
      <td class="muted">${s.beats?.length||0} beats</td>
      <td class="right"><button class="btn small danger" data-id="${s.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach(b => {
    const id = b.dataset.id;
    b.addEventListener('click', () => {
      if (confirm('Delete this storyline?')) {
        const rest = store.get('dnd.stories', []).filter(x => x.id !== id);
        store.set('dnd.stories', rest);
        renderStories();
      }
    });
  });
};

// ---------- Map Generator (rooms + corridors) ----------
const tile = { Wall: 1, Floor: 0 };
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Map type toggle
const mType = document.getElementById('m_type');
const dungeonOptsEl = document.getElementById('dungeonOpts');
const overworldOptsEl = document.getElementById('overworldOpts');
const threeDungeonOptsEl = document.getElementById('threeDungeonOpts');
const threeOverworldOptsEl = document.getElementById('threeOverworldOpts');
function toggleMapOptions() {
  const isOver = mType.value === 'overworld';
  dungeonOptsEl.style.display = isOver ? 'none' : '';
  overworldOptsEl.style.display = isOver ? '' : 'none';
  if (threeDungeonOptsEl && threeOverworldOptsEl){
    threeDungeonOptsEl.style.display = isOver ? 'none' : '';
    threeOverworldOptsEl.style.display = isOver ? '' : 'none';
  }
}
mType.addEventListener('change', toggleMapOptions);
toggleMapOptions();

function genDungeon(opts) {
  const W = opts.w, H = opts.h;
  const grid = Array.from({length: H}, () => Array(W).fill(tile.Wall));
  const rooms = [];
  const tries = opts.rooms * 6;

  // Place rooms
  for (let t=0; t<tries && rooms.length < opts.rooms; t++) {
    const rw = randInt(opts.rmin, opts.rmax);
    const rh = randInt(opts.rmin, opts.rmax);
    const rx = randInt(1, W - rw - 2);
    const ry = randInt(1, H - rh - 2);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx+rw/2), cy: Math.floor(ry+rh/2) };
    if (!rooms.some(r => overlap(room, r, 1))) {
      carveRect(grid, room.x, room.y, room.w, room.h, tile.Floor);
      rooms.push(room);
    }
  }
  if (rooms.length === 0) return { grid, rooms };

  // Connect via simple MST-like chain
  rooms.sort((a,b)=>a.cx-b.cx);
  for (let i=1; i<rooms.length; i++) {
    connect(grid, rooms[i-1], rooms[i], opts.bend);
  }

  // Add a few extra connections
  for (let n=0; n<Math.floor(rooms.length/4); n++) {
    const a = rooms[randInt(0, rooms.length-1)];
    const b = rooms[randInt(0, rooms.length-1)];
    if (a !== b) connect(grid, a, b, opts.bend);
  }

  // Clean borders
  frameWalls(grid);
  return { grid, rooms };
}

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function overlap(a,b, pad=0){
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}
function carveRect(g, x,y,w,h, v){ for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) g[yy][xx]=v; }
function carveLine(g, x0,y0, x1,y1) {
  // Bresenham-like carve corridor 1-tile wide
  const dx = Math.abs(x1-x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1-y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x=x0, y=y0;
  while (true) {
    g[y][x] = tile.Floor;
    if (x === x1 && y === y1) break;
    const e2 = 2*err;
    if (e2 >= dy){ err += dy; x += sx; }
    if (e2 <= dx){ err += dx; y += sy; }
  }
}
function connect(g, A, B, bendChance=35) {
  // L-shaped with occasional bend change to vary routes
  if (Math.random()*100 < bendChance) {
    carveLine(g, A.cx, A.cy, B.cx, A.cy);
    carveLine(g, B.cx, A.cy, B.cx, B.cy);
  } else {
    carveLine(g, A.cx, A.cy, A.cx, B.cy);
    carveLine(g, A.cx, B.cy, B.cx, B.cy);
  }
}
function frameWalls(g){
  const H = g.length, W = g[0].length;
  for (let x=0; x<W; x++){ g[0][x]=tile.Wall; g[H-1][x]=tile.Wall; }
  for (let y=0; y<H; y++){ g[y][0]=tile.Wall; g[y][W-1]=tile.Wall; }
}

function drawDungeon(grid, cell=16){
  const H = grid.length, W = grid[0].length;
  const wrap = document.querySelector('.canvas-wrap');
  const maxW = Math.max(200, (wrap.clientWidth || 800) - 16);
  const maxH = Math.max(200, Math.floor(window.innerHeight * 0.6));
  cell = Math.max(2, Math.floor(Math.min(maxW / W, maxH / H)));
  canvas.width = W * cell;
  canvas.height = H * cell;
  ctx.imageSmoothingEnabled = false;

  // background
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // draw tiles
  for (let y=0; y<H; y++){
    for (let x=0; x<W; x++){
      const v = grid[y][x];
      if (v === tile.Floor) {
        // floor
        ctx.fillStyle = '#2a324a';
        ctx.fillRect(x*cell, y*cell, cell, cell);
        // subtle highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x*cell, y*cell, cell, 2);
      } else {
        // walls
        ctx.fillStyle = '#121622';
        ctx.fillRect(x*cell, y*cell, cell, cell);
      }
    }
  }
  // grid overlay
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x=0; x<=canvas.width; x+=cell) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for (let y=0; y<=canvas.height; y+=cell) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}

// ---------- Overworld generator (biomes + castles) ----------
const OTile = {
  Water: 0,
  Beach: 1,
  Grass: 2,
  Forest: 3,
  Hill: 4,
  Mountain: 5,
  Snow: 6,
};

function hash2(x, y, seed){
  let n = (x|0) * 374761393 ^ (y|0) * 668265263 ^ (seed|0) * 1442695049;
  n = (n ^ (n >>> 13)) >>> 0;
  n = (n * 1274126177) >>> 0;
  return n / 4294967295;
}
function lerp(a,b,t){ return a + (b-a)*t; }
function fade(t){ return t*t*(3 - 2*t); }
function valueNoise(x, y, scale, seed){
  const sx = x/scale, sy = y/scale;
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const xf = sx - x0, yf = sy - y0;
  const v00 = hash2(x0,   y0,   seed);
  const v10 = hash2(x0+1, y0,   seed);
  const v01 = hash2(x0,   y0+1, seed);
  const v11 = hash2(x0+1, y0+1, seed);
  const u = fade(xf), v = fade(yf);
  const x1 = lerp(v00, v10, u);
  const x2 = lerp(v01, v11, u);
  return lerp(x1, x2, v);
}
function fbm(x, y, seed, baseScale=16, octaves=4){
  let val = 0, amp = 1, freq = 1, norm = 0;
  for (let o=0; o<octaves; o++){
    val += valueNoise(x*freq, y*freq, baseScale, seed+o*101) * amp;
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return val / norm;
}

function genOverworld(opts){
  const { w, h, seed, water, forest, mountain, castles, scale, oct } = opts;
  const grid = Array.from({length: h}, () => Array(w).fill(OTile.Grass));
  const waterT = (water/100);
  const beachBand = 0.03; // thin coast
  const mountT = (mountain/100);
  const forestD = (forest/100); // higher = more forest
  const forestThreshBase = 0.6; // baseline moisture
  const forestThresh = Math.max(0.15, forestThreshBase - (forestD-0.5)*0.4);

  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const ex = x / w - 0.5, ey = y / h - 0.5;
      const dist = Math.sqrt(ex*ex + ey*ey); // optional island shape
      const elev = Math.max(0, fbm(x, y, seed, scale, oct) - dist*0.15);
      const moist = fbm(x+1000, y-1000, seed^0x9e3779b9, Math.max(4, scale*0.8), Math.max(2, oct-1));

      let t = OTile.Grass;
      if (elev < waterT) t = OTile.Water;
      else if (elev < waterT + beachBand) t = OTile.Beach;
      else if (elev > mountT) t = elev > 0.9 ? OTile.Snow : OTile.Mountain;
      else if (elev > mountT - 0.1) t = OTile.Hill;
      else if (moist > forestThresh) t = OTile.Forest;
      else t = OTile.Grass;

      grid[y][x] = t;
    }
  }

  // Place castles on land tiles, spaced out
  const keeps = [];
  const minDist = Math.max(8, Math.floor(Math.min(w,h) * 0.08));
  let attempts = castles * 50;
  while (keeps.length < castles && attempts-- > 0){
    const x = (hash2(attempts, seed, seed)*w)|0;
    const y = (hash2(seed, attempts, seed)*h)|0;
    const t = grid[y][x];
    if (t === OTile.Water || t === OTile.Beach || t === OTile.Snow || t === OTile.Mountain) continue;
    if (keeps.some(k => (k.x-x)*(k.x-x)+(k.y-y)*(k.y-y) < minDist*minDist)) continue;
    keeps.push({x,y});
  }

  return { grid, keeps };
}

function drawOverworld(grid, keeps){
  const H = grid.length, W = grid[0].length;
  const wrap = document.querySelector('.canvas-wrap');
  const maxW = Math.max(200, (wrap.clientWidth || 800) - 16);
  const maxH = Math.max(200, Math.floor(window.innerHeight * 0.6));
  const cell = Math.max(3, Math.floor(Math.min(maxW / W, maxH / H)));
  canvas.width = W * cell; canvas.height = H * cell;
  ctx.imageSmoothingEnabled = false;

  const colors = {
    [OTile.Water]: '#183054',
    [OTile.Beach]: '#d7c89b',
    [OTile.Grass]: '#4c8a36',
    [OTile.Forest]: '#1f4a1c',
    [OTile.Hill]: '#6e6b4e',
    [OTile.Mountain]: '#7a6e67',
    [OTile.Snow]: '#e9eef3',
  };

  for (let y=0; y<H; y++){
    for (let x=0; x<W; x++){
      const v = grid[y][x];
      ctx.fillStyle = colors[v] || '#000';
      ctx.fillRect(x*cell, y*cell, cell, cell);
      if (v === OTile.Forest){
        // simple canopy speckle
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x*cell, y*cell, cell, 3);
      }
    }
  }

  // Draw castles
  keeps.forEach(k => drawCastleIcon(k.x, k.y, cell));

  // subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x=0; x<=canvas.width; x+=cell) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for (let y=0; y<=canvas.height; y+=cell) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}

function drawCastleIcon(tx, ty, cell){
  const x = tx*cell, y = ty*cell;
  const w = cell, h = cell;
  // base keep
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + w*0.2, y + h*0.25, w*0.6, h*0.55);
  // battlements
  ctx.fillRect(x + w*0.2, y + h*0.2, w*0.12, h*0.08);
  ctx.fillRect(x + w*0.36, y + h*0.2, w*0.12, h*0.08);
  ctx.fillRect(x + w*0.52, y + h*0.2, w*0.12, h*0.08);
  // door
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(x + w*0.45, y + h*0.6, w*0.12, h*0.2);
  // outline
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(x + w*0.2, y + h*0.25, w*0.6, h*0.55);
}

document.getElementById('genMapBtn').addEventListener('click', () => {
  const w = Number($('m_width').value||60);
  const h = Number($('m_height').value||40);
  const seed = Number($('m_seed').value||12345) >>> 0;
  if (mType.value === 'overworld') {
    const water = Number($('ow_water').value||45);
    const forest = Number($('ow_forest').value||55);
    const mountain = Number($('ow_mountain').value||72);
    const castles = Number($('ow_castles').value||5);
    const scale = Number($('ow_scale').value||16);
    const oct = Number($('ow_octaves').value||4);
    const { grid, keeps } = genOverworld({ w, h, seed, water, forest, mountain, castles, scale, oct });
    drawOverworld(grid, keeps);
    window._lastGrid = grid;
    window._lastType = 'overworld';
    if (isThreeOpen()) updateThreeFromCurrent();
  } else {
    const rooms = Number($('m_rooms').value||12);
    const rmin = Number($('m_rmin').value||4);
    const rmax = Number($('m_rmax').value||10);
    const bend = Number($('m_bend').value||35);
    const { grid } = genDungeon({ w, h, rooms, rmin, rmax, bend });
    drawDungeon(grid, 16);
    window._lastGrid = grid;
    window._lastType = 'dungeon';
    if (isThreeOpen()) updateThreeFromCurrent();
  }
});

document.getElementById('clearMapBtn').addEventListener('click', () => {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  window._lastGrid = null;
});

document.getElementById('downloadPngBtn').addEventListener('click', () => {
  if (!canvas.width || !canvas.height) { alert('Nothing to download. Generate a map first.'); return; }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'dungeon.png';
  a.click();
});

// ---------- Helpers ----------
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderAll(){
  renderCharacters();
  renderWeapons();
  renderSpells();
  renderStories();
  updateStatMods();
  populateCharAssocSelects();
}
renderAll();

// Populate character weapons/spells selects from current stores
function populateCharAssocSelects(){
  const wSel = document.getElementById('ch_weapons');
  const sSel = document.getElementById('ch_spells');
  const weapons = store.get('dnd.weapons', []);
  const spells = store.get('dnd.spells', []);
  if (wSel){
    const current = Array.from(wSel.selectedOptions||[]).map(o=>o.value);
    wSel.innerHTML = '';
    weapons.forEach(w=>{ const opt=document.createElement('option'); opt.value=w.id; opt.textContent = w.name; wSel.appendChild(opt); });
    Array.from(wSel.options).forEach(o=> o.selected = current.includes(o.value));
  }
  if (sSel){
    const currentS = Array.from(sSel.selectedOptions||[]).map(o=>o.value);
    sSel.innerHTML = '';
    spells.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent = s.name + (s.level!==undefined? ` (L${s.level})`: ''); sSel.appendChild(opt); });
    Array.from(sSel.options).forEach(o=> o.selected = currentS.includes(o.value));
  }
}
loadPersistedAssets();

// ------------------- 3D Preview (Three.js) -------------------
const canvas3d = document.getElementById('mapCanvas3d');
const wrap3d = document.getElementById('wrap3d');
const paintOverlay = document.getElementById('paintOverlay');
let three = { renderer: null, scene: null, camera: null, group: null, animId: null, ctrl: null, terrainMesh: null, assets: [], placing: null, selected: null, selHelper: null, placed: [], counter: 1, foliageAsset: null, paint: { enabled:false, radius:3, density:8, randRot:true, sMin:0.8, sMax:1.2, use2d:true, erase:false }, sceneReady:false };
const modal = document.getElementById('threeModal');
const open3DBtn = document.getElementById('open3DBtn');
const meshUpload = document.getElementById('meshUpload');
const meshList = document.getElementById('meshList');
const placeModeBtn = document.getElementById('placeModeBtn');
const placedList = document.getElementById('placedList');
const deleteFoliageBtn = document.getElementById('deleteFoliageBtn');
// Left sidebar tabs (Tools/Assets)
const toolsTabs = document.getElementById('toolsTabs');
if (toolsTabs){
  toolsTabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', ()=>{
      toolsTabs.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      // toggle all side-tab panes based on target id
      document.querySelectorAll('.modal-sidebar .side-tab').forEach(pane => {
        pane.classList.toggle('active', pane.id === target);
      });
      if (target === 'sideFoliage') { try { setViewportMode && setViewportMode(); } catch {}; drawPaint2d(); }
      else { try { setViewportMode && setViewportMode(); } catch {} }
    });
  });
}
// Paint controls
const paintEnable = document.getElementById('paint_enable');
const paintRadius = document.getElementById('paint_radius');
const paintDensity = document.getElementById('paint_density');
const paintRandRot = document.getElementById('paint_rand_rot');
const paintScaleMin = document.getElementById('paint_scale_min');
const paintScaleMax = document.getElementById('paint_scale_max');
const paintGenBtn = document.getElementById('paint_generate');
const paintClearBtn = document.getElementById('paint_clear');
const paint2d = null; // deprecated sidebar canvas
const paint2dMain = document.getElementById('paint2dMain');
const paint2dWrap = null;
const paintErase = document.getElementById('paint_erase');
const trPosX = document.getElementById('tr_pos_x');
const trPosY = document.getElementById('tr_pos_y');
const trPosZ = document.getElementById('tr_pos_z');
const trRotX = document.getElementById('tr_rot_x');
const trRotY = document.getElementById('tr_rot_y');
const trRotZ = document.getElementById('tr_rot_z');
const trScale = document.getElementById('tr_scale');

function isThreeOpen(){ return modal && modal.style.display !== 'none'; }
if (open3DBtn && modal){
  open3DBtn.addEventListener('click', ()=>{
    if (!window.THREE) { alert('Three.js failed to load. Check your internet connection.'); return; }
    modal.style.display=''; document.body.classList.add('modal-open');
    ensureThree(); updateThreeFromCurrent(); startThreeLoop();
    try { if (typeof setViewportMode === 'function') setViewportMode(); } catch {}
  });
  modal.querySelectorAll('[data-close-modal]').forEach(el=> el.addEventListener('click', ()=>{
    modal.style.display='none'; document.body.classList.remove('modal-open'); stopThreeLoop();
  }));
}

// Live-update 3D when height controls change
['m_wall_height','ow_hscale'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { if (isThreeOpen()) { updateThreeFromCurrent(); } });
});
['ow_smooth_iters','ow_smooth_strength'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { if (isThreeOpen()) { updateThreeFromCurrent(); } });
});
['ow_water_z'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { if (isThreeOpen()) { updateThreeFromCurrent(); } });
});

function ensureThree(){
  if (three.renderer) return;
  const { THREE } = window;
  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0x0d1220);
  three.scene.fog = new THREE.FogExp2(0x0d1220, 0.012);
  three.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  three.renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: false });
  three.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  sizeCanvasThree();
  three.camera.position.set(30, 25, 30);
  three.ctrl = { target: new THREE.Vector3(0,0,0), yaw: -0.8, pitch: 0.8, dist: 50, vyaw:0, vpitch:0, vdist:0 };
  const amb = new THREE.AmbientLight(0xffffff, 0.7); three.scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(1,2,1); three.scene.add(dir);
  three.group = new THREE.Group(); three.scene.add(three.group);
  window.addEventListener('resize', sizeCanvasThree);
  // Simple orbit controls
  let dragging=false, lx=0, ly=0, paintingDown=false;
  canvas3d.addEventListener('mousedown', (e)=>{
    lx=e.clientX; ly=e.clientY;
    if (isTopDownPaintActive() && !three.paint.use2d){
      // In paint mode, disable orbit drag and start painting mask
      paintingDown=true; paintAtEvent(e);
      return;
    }
    dragging=true;
  });
  window.addEventListener('mouseup', ()=> { dragging=false; paintingDown=false; });
  window.addEventListener('mousemove', (e)=>{
    const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
    // Always update brush visual when paint mode is on
    if (isTopDownPaintActive() && !three.paint.use2d) updateBrushOverlayFromEvent(e);
    if (paintingDown && isTopDownPaintActive() && !three.paint.use2d){ paintAtEvent(e); return; }
    if (!dragging) return;
    // lock orientation while in paint mode to keep map square with viewport
    if (isTopDownPaintActive() && !three.paint.use2d) return;
    // If Ctrl is held and an object is selected, drag to move across terrain
    if (e.ctrlKey && three.selected && three.terrainMesh){
      const hit = raycastToTerrain(e);
      if (hit){
        three.selected.position.copy(hit.point);
        three.selected.position.y += 0.02;
        updateInspectorFromSelected(); updateSelHelper();
      }
      return;
    }
    three.ctrl.vyaw += dx*0.003; three.ctrl.vpitch += dy*0.003;
  });
  // Prevent page scroll; disable zoom while in paint mode
  canvas3d.addEventListener('wheel', (e)=>{
    e.preventDefault(); e.stopPropagation();
    if (isTopDownPaintActive() && !three.paint.use2d) return; // no zoom changes while 3D painting
    three.ctrl.vdist += (e.deltaY>0? 3 : -3);
  }, { passive: false });
  // Also prevent touch scroll/zoom gestures from scrolling the page while over the 3D view
  canvas3d.addEventListener('touchmove', (e)=>{ e.preventDefault(); e.stopPropagation(); }, { passive: false });
}

function sizeCanvasThree(){
  const maxW = Math.max(200, (wrap3d.clientWidth||800) - 16);
  const maxH = Math.max(200, Math.floor(window.innerHeight * 0.6));
  const w = Math.floor(maxW), h = Math.floor(maxH);
  canvas3d.width = w; canvas3d.height = h; canvas3d.style.width = '100%';
  if (three.renderer && three.camera){
    three.renderer.setSize(w, h, false);
    three.camera.aspect = w / h; three.camera.updateProjectionMatrix();
  }
  if (paintOverlay){ paintOverlay.width = w; paintOverlay.height = h; }
  if (paint2dMain){ paint2dMain.width = w; paint2dMain.height = h; if (three.paint.use2d) drawPaint2d(); }
}

function clearThreeGroup(){
  if (!three.group) return;
  for (let i = three.group.children.length - 1; i >= 0; i--) {
    const obj = three.group.children[i];
    three.group.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose()); else obj.material.dispose();
    }
  }
}

function updateThreeFromCurrent(){
  if (!window.THREE) return;
  ensureThree();
  if (!window._lastGrid) return;
  clearThreeGroup();
  // Reset placed objects on full rebuild
  three.placed = []; three.selected = null; updateInspectorFromSelected(); renderPlacedList();
  if (window._lastType === 'overworld') buildOverworldThree(window._lastGrid);
  else buildDungeonThree(window._lastGrid);
  updateSelHelper();
  // Reinitialize paint mask to match terrain size
  if (window._lastType === 'overworld') initPaintMask();
  three.sceneReady = true;
  restorePlacedFromStorage();
}

// ---------- Top-down paint helpers ----------
function isTopDownPaintActive(){ return !!(paintEnable && paintEnable.checked); }
function initPaintMask(){
  const H = window._lastGrid?.length||0, W = window._lastGrid?.[0]?.length||0;
  if (!H || !W) return;
  const c = document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.clearRect(0,0,W,H);
  three.paint.maskCanvas = c; three.paint.maskCtx = g;
  refreshPaintOverlay(); drawPaint2d();
}
function refreshPaintOverlay(){
  if (!paintOverlay || !three.paint.maskCanvas) return;
  if (three.paint.use2d) { paintOverlay.style.display='none'; return; }
  const ctx = paintOverlay.getContext('2d');
  ctx.clearRect(0,0,paintOverlay.width, paintOverlay.height);
  // draw mask scaled into the on-screen map rectangle then tint green
  const rect = getMapScreenRect();
  if (rect){
    const { x, y, w, h } = rect;
    const W = three.paint.maskCanvas.width, H = three.paint.maskCanvas.height;
    ctx.drawImage(three.paint.maskCanvas, 0, 0, W, H, x, y, w, h);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = 'rgba(80,200,120,0.35)';
  ctx.fillRect(0,0,paintOverlay.width, paintOverlay.height);
  ctx.globalCompositeOperation = 'source-over';
  paintOverlay.style.display = isTopDownPaintActive() ? '' : 'none';
}

function updateBrushOverlayFromEvent(e){
  if (!isTopDownPaintActive() || !paintOverlay) return;
  const hit = raycastToTerrain(e); if (!hit) { refreshPaintOverlay(); return; }
  const cpx = worldToOverlayPx(hit.point.x, hit.point.y, hit.point.z);
  // compute pixel radius by projecting an offset in world space
  const pX = worldToOverlayPx(hit.point.x + three.paint.radius, hit.point.y, hit.point.z);
  const pZ = worldToOverlayPx(hit.point.x, hit.point.y, hit.point.z + three.paint.radius);
  const rX = Math.hypot(pX.x - cpx.x, pX.y - cpx.y);
  const rZ = Math.hypot(pZ.x - cpx.x, pZ.y - cpx.y);
  const r = Math.max(4, (rX + rZ) * 0.5);
  // redraw mask then overlay brush circle
  refreshPaintOverlay();
  const ctx = paintOverlay.getContext('2d');
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cpx.x, cpx.y, r, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

function snapToTopDown(){
  if (!three.ctrl || !window._lastGrid) return;
  const H = window._lastGrid.length, W = window._lastGrid[0].length;
  three.ctrl.target.set(W/2, 0, H/2);
  // exact top-down orientation and aligned axes
  three.ctrl.yaw = 0;
  three.ctrl.pitch = Math.max(0.01, Math.PI/2 - 0.001);
  // choose distance to fit map within viewport using FOV and aspect
  const aspect = (canvas3d.width||1)/(canvas3d.height||1);
  const vfov = three.camera.fov * Math.PI/180;
  const hfov = 2*Math.atan(Math.tan(vfov/2)*aspect);
  const neededV = (H/2)/Math.tan(vfov/2);
  const neededH = (W/2)/Math.tan(hfov/2);
  three.ctrl.dist = Math.max(neededV, neededH) * 1.05; // small margin
}

function worldToOverlayPx(wx, wy, wz){
  const v = new THREE.Vector3(wx, wy, wz).project(three.camera);
  return {
    x: (v.x * 0.5 + 0.5) * paintOverlay.width,
    y: (-v.y * 0.5 + 0.5) * paintOverlay.height,
  };
}

function getMapScreenRect(){
  if (!window._lastGrid) return null;
  const H = window._lastGrid.length, W = window._lastGrid[0].length;
  const pts = [
    worldToOverlayPx(0, 0, 0),
    worldToOverlayPx(W, 0, 0),
    worldToOverlayPx(W, 0, H),
    worldToOverlayPx(0, 0, H),
  ];
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Draw the 2D paint canvas with terrain background and mask overlay
function drawPaint2d(){
  if (!paint2dMain || !three.paint.maskCanvas) return;
  const ctx = paint2dMain.getContext('2d');
  const wrapW = paint2dMain.clientWidth||wrap3d.clientWidth||800; const wrapH = paint2dMain.clientHeight||wrap3d.clientHeight||600;
  // Make canvas match displayed size
  if (paint2dMain.width !== wrapW || paint2dMain.height !== wrapH) { paint2dMain.width = wrapW; paint2dMain.height = wrapH; }
  ctx.clearRect(0,0,paint2dMain.width, paint2dMain.height);
  const W = three.paint.maskCanvas.width, H = three.paint.maskCanvas.height;
  // Background from overworld grid if available
  if (Array.isArray(window._lastGrid)){
    const colors = {
      [OTile.Water]: '#183054', [OTile.Beach]:'#d7c89b', [OTile.Grass]:'#4c8a36', [OTile.Forest]:'#295d26', [OTile.Hill]:'#6e6b4e', [OTile.Mountain]:'#7a6e67', [OTile.Snow]:'#e9eef3'
    };
    const cellW = paint2dMain.width / W, cellH = paint2dMain.height / H;
    for (let y=0;y<H;y++){
      for (let x=0;x<W;x++){
        ctx.fillStyle = colors[window._lastGrid[y][x]] || '#222';
        ctx.fillRect(Math.floor(x*cellW), Math.floor(y*cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  } else {
    ctx.fillStyle='#0b0e16'; ctx.fillRect(0,0,paint2dMain.width, paint2dMain.height);
  }
  // Draw mask tinted
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.drawImage(three.paint.maskCanvas, 0,0, W,H, 0,0, paint2dMain.width, paint2dMain.height);
  ctx.globalAlpha = 1;
  ctx.restore();
  // Optional grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let x=0;x<=paint2dMain.width;x+=Math.max(8, Math.floor(paint2dMain.width/W))) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,paint2dMain.height); ctx.stroke(); }
  for (let y=0;y<=paint2dMain.height;y+=Math.max(8, Math.floor(paint2dMain.height/H))) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(paint2dMain.width,y); ctx.stroke(); }
}

function setViewportMode(){
  const use2d = !!(three.paint && three.paint.enabled && three.paint.use2d);
  if (use2d){
    if (canvas3d) canvas3d.style.display='none';
    if (paintOverlay) paintOverlay.style.display='none';
    if (paint2dMain) { paint2dMain.style.display='block'; drawPaint2d(); }
    stopThreeLoop && stopThreeLoop();
  } else {
    if (canvas3d) canvas3d.style.display='block';
    if (paint2dMain) paint2dMain.style.display='none';
    startThreeLoop && startThreeLoop();
  }
}

function buildDungeonThree(grid){
  const { THREE } = window; const H=grid.length, W=grid[0].length;
  // floor
  const floorGeom = new THREE.PlaneGeometry(W, H);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a324a, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
  // Add procedural stone tile texture, cache it on three
  three._texFloor = three._texFloor || makeStoneTileTexture();
  floorMat.map = three._texFloor;
  if (floorMat.map) { floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping; floorMat.map.repeat.set(Math.max(1, W/6), Math.max(1, H/6)); }
  const floor = new THREE.Mesh(floorGeom, floorMat); floor.rotation.x = -Math.PI/2; floor.position.set(W/2, 0, H/2);
  three.group.add(floor);
  // walls as instanced mesh for performance
  const wallH = Number((document.getElementById('m_wall_height')||{}).value || 1.5);
  const boxGeom = new THREE.BoxGeometry(1, wallH, 1);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8c8f99, roughness: 0.95 });
  three._texWall = three._texWall || makeBrickTexture();
  wallMat.map = three._texWall;
  if (wallMat.map) { wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping; wallMat.map.repeat.set(1, Math.max(1, wallH/0.5)); }
  let count=0; for(let y=0;y<H;y++) for(let x=0;x<W;x++) if (grid[y][x]===1) count++;
  const inst = new THREE.InstancedMesh(boxGeom, wallMat, count||1);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  let i=0; const m = new THREE.Matrix4();
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if (grid[y][x]===1){
    m.makeTranslation(x+0.5, wallH/2, y+0.5); inst.setMatrixAt(i++, m);
  }
  three.group.add(inst);
  // camera/controls target
  if (three.ctrl){ three.ctrl.target.set(W/2, 0, H/2); three.ctrl.dist = Math.max(25, Math.max(W,H)*0.9); }
}

function buildOverworldThree(grid){
  const { THREE } = window; const H=grid.length, W=grid[0].length;
  const segX = W-1, segY = H-1;
  const geom = new THREE.PlaneGeometry(W, H, segX, segY);
  geom.rotateX(-Math.PI/2);
  // set heights and then compute smoothly-blended vertex colors (no blocky grid)
  const pos = geom.attributes.position;
  const hScale = Number((document.getElementById('ow_hscale')||{}).value || 1.0);
  const iters = Math.max(0, Math.min(10, Number((document.getElementById('ow_smooth_iters')||{}).value || 0)));
  const alpha = Math.max(0, Math.min(1, Number((document.getElementById('ow_smooth_strength')||{}).value || 0.5)));
  const seed = Number((document.getElementById('m_seed')||{}).value || 12345) >>> 0;
  const scale = Number((document.getElementById('ow_scale')||{}).value || 16);
  const oct = Number((document.getElementById('ow_octaves')||{}).value || 4);
  const water = Number((document.getElementById('ow_water')||{}).value || 45);
  const forest = Number((document.getElementById('ow_forest')||{}).value || 55);
  const mountain = Number((document.getElementById('ow_mountain')||{}).value || 72);
  function hFor(t){
    switch(t){
      case OTile.Water: return -0.4 * hScale;
      case OTile.Beach: return -0.2 * hScale;
      case OTile.Grass: return 0.0 * hScale;
      case OTile.Forest:return 0.06 * hScale;
      case OTile.Hill:  return 0.25 * hScale;
      case OTile.Mountain:return 0.6 * hScale;
      case OTile.Snow:  return 0.7 * hScale;
      default: return 0;
    }
  }
  // Build height grid (W x H)
  let Hgrid = Array.from({length:H}, (_,y)=>Array.from({length:W},(_,x)=>hFor(grid[y][x])));
  // Smooth using neighbor averaging (8-neighborhood)
  for (let k=0; k<iters; k++){
    const next = Array.from({length:H}, ()=>Array(W));
    for (let y=0;y<H;y++){
      for (let x=0;x<W;x++){
        let sum=0, cnt=0;
        for (let dy=-1; dy<=1; dy++){
          for (let dx=-1; dx<=1; dx++){
            const nx=x+dx, ny=y+dy;
            if (nx<0||ny<0||nx>=W||ny>=H) continue;
            sum += Hgrid[ny][nx]; cnt++;
          }
        }
        const avg = sum / (cnt||1);
        next[y][x] = (1-alpha)*Hgrid[y][x] + alpha*avg;
      }
    }
    Hgrid = next;
  }
  // Apply to geometry vertices
  for (let vy=0; vy<=segY; vy++){
    for (let vx=0; vx<=segX; vx++){
      const idx = vy*(segX+1)+vx;
      pos.setY(idx, Hgrid[vy][vx]);
    }
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  // Compute smoothly blended vertex colors based on continuous elevation/moisture
  const colors = new Float32Array(geom.attributes.position.count * 3);
  const waterT = water/100; const beachBand = 0.035; const mountT = mountain/100;
  const forestThreshBase = 0.6; const forestD = forest/100; const forestThresh = Math.max(0.15, forestThreshBase - (forestD-0.5)*0.4);
  function clamp01(v){ return v<0?0:v>1?1:v; }
  function sstep(a,b,t){ const x = clamp01((t-a)/(b-a)); return x*x*(3-2*x); }
  for (let vy=0; vy<=segY; vy++){
    for (let vx=0; vx<=segX; vx++){
      const idx = vy*(segX+1)+vx;
      const xLocal = pos.getX(idx), zLocal = pos.getZ(idx);
      const gx = xLocal + W/2, gy = zLocal + H/2;
      const ex = gx / W - 0.5, ey = gy / H - 0.5;
      const dist = Math.sqrt(ex*ex + ey*ey);
      const elev = Math.max(0, fbm(gx, gy, seed, scale, oct) - dist*0.15);
      const moist = fbm(gx+1000, gy-1000, seed^0x9e3779b9, Math.max(4, scale*0.8), Math.max(2, oct-1));

      // weights for sand, grass, forest, rock
      let wSand = 0; if (elev >= waterT && elev < waterT + beachBand) { wSand = 1 - clamp01((elev - waterT)/beachBand); }
      let wRock = sstep(mountT-0.1, mountT+0.1, elev);
      let base = 1 - wRock; // remaining share for vegetation/ground
      let wForest = sstep(forestThresh-0.08, forestThresh+0.08, moist) * base;
      let wGrass = Math.max(0, base - wForest - wSand);
      // normalize
      const sum = wSand + wGrass + wForest + wRock || 1;
      wSand/=sum; wGrass/=sum; wForest/=sum; wRock/=sum;

      // palette
      const sand = {r:0xd7/255, g:0xc8/255, b:0x9b/255};
      const grass= {r:0x4c/255, g:0x8a/255, b:0x36/255};
      const forestC={r:0x29/255, g:0x5d/255, b:0x26/255};
      const rock  = {r:0x7a/255, g:0x6e/255, b:0x67/255};
      const r = sand.r*wSand + grass.r*wGrass + forestC.r*wForest + rock.r*wRock;
      const g = sand.g*wSand + grass.g*wGrass + forestC.g*wForest + rock.g*wRock;
      const b = sand.b*wSand + grass.b*wGrass + forestC.b*wForest + rock.b*wRock;
      colors[idx*3+0]=r; colors[idx*3+1]=g; colors[idx*3+2]=b;
    }
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.03 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(W/2, 0, H/2);
  three.group.add(mesh);
  three.terrainMesh = mesh;
  // Add water plane at user-defined height
  const waterZ = Number((document.getElementById('ow_water_z')||{}).value || -0.15);
  const waterGeom = new THREE.PlaneGeometry(W, H);
  waterGeom.rotateX(-Math.PI/2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a7fff, transparent: true, opacity: 0.5, roughness: 0.15, metalness: 0.1, depthWrite: false });
  const waterMesh = new THREE.Mesh(waterGeom, waterMat);
  waterMesh.position.set(W/2, waterZ, H/2);
  waterMesh.renderOrder = 1;
  three.group.add(waterMesh);
  // soft hemi light
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x223300, 0.25); three.group.add(hemi);
  if (three.ctrl){ three.ctrl.target.set(W/2, 0, H/2); three.ctrl.dist = Math.max(30, Math.max(W,H)*0.9); }
}

function startThreeLoop(){
  if (!three.renderer) return; cancelAnimationFrame(three.animId);
  const loop = ()=>{
    // apply control damping and clamp
    if (three.ctrl){
      // Keep target deterministic
      if (three.selected && three.selected.position){
        // Always focus selected object
        three.ctrl.target.copy(three.selected.position);
      } else if (window._lastGrid){
        // Otherwise, focus map center
        const H = window._lastGrid.length, W = window._lastGrid[0].length;
        three.ctrl.target.set(W/2, 0, H/2);
      }
      three.ctrl.yaw += three.ctrl.vyaw; three.ctrl.vyaw *= 0.85;
      three.ctrl.pitch += three.ctrl.vpitch; three.ctrl.vpitch *= 0.85;
      three.ctrl.pitch = Math.max(0.1, Math.min(1.45, three.ctrl.pitch));
      three.ctrl.dist += three.ctrl.vdist; three.ctrl.vdist *= 0.85; three.ctrl.dist = Math.max(5, three.ctrl.dist);
      const t = three.ctrl.target;
      const r = three.ctrl.dist;
      const ex = t.x + r*Math.cos(three.ctrl.pitch)*Math.cos(three.ctrl.yaw);
      const ey = t.y + r*Math.sin(three.ctrl.pitch);
      const ez = t.z + r*Math.cos(three.ctrl.pitch)*Math.sin(three.ctrl.yaw);
      three.camera.position.set(ex, ey, ez);
      three.camera.lookAt(t);
    }
    three.renderer.render(three.scene, three.camera);
    three.animId = requestAnimationFrame(loop);
  };
  three.animId = requestAnimationFrame(loop);
}
function stopThreeLoop(){ cancelAnimationFrame(three.animId); three.animId = null; }

// -------- Asset upload (OBJ) and placement --------
if (meshUpload){
  meshUpload.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    // Try server-side upload first
    let usedServer = false;
    try{
      const fd = new FormData(); files.forEach(f=> fd.append('files[]', f, f.name));
      const res = await fetch('asset_upload.php', { method:'POST', body: fd });
      if (res.ok){
        const data = await res.json();
        if (data && Array.isArray(data.assets) && data.assets.length){
          usedServer = true;
          // Load newly uploaded assets
          for (const a of data.assets){
            try{
              const objText = a.objUrl ? await (await fetch(a.objUrl)).text() : '';
              const mtlText = a.mtlUrl ? await (await fetch(a.mtlUrl)).text() : '';
              const texMap = new Map(); (a.textures||[]).forEach(url => { const base = url.split('/').pop().toLowerCase(); texMap.set(base, url); });
              const mats = parseMTL(mtlText, texMap);
              const object = buildObjectFromOBJ(objText, mats);
              three.assets.push({ id: a.id, name: a.name, object, isFoliage: false });
            }catch(err){ console.warn('Failed to build uploaded asset', a.name, err); }
          }
          renderAssetList();
        }
      }
    }catch(err){ console.warn('Server upload failed', err); }

    if (!usedServer){
      // Fallback to client-side IDB persistence
      const texByBase = new Map(files
        .filter(f=>/\.(png|jpg|jpeg|webp)$/i.test(f.name))
        .map(f=>[f.name.split(/\\|\//).pop().toLowerCase(), f]));
      const objFiles = files.filter(f=>/\.obj$/i.test(f.name));
      for (const objFile of objFiles){
        try{
          const objText = await readFileText(objFile);
          const base = objFile.name.replace(/\.[^.]+$/,'').toLowerCase();
          const mtlFile = files.find(f=>/\.mtl$/i.test(f.name) && f.name.replace(/\.[^.]+$/,'').toLowerCase()===base) || files.find(f=>/\.mtl$/i.test(f.name));
          const mtlText = mtlFile ? await readFileText(mtlFile) : '';
          const materials = parseMTL(mtlText, texByBase);
          const object = buildObjectFromOBJ(objText, materials);
          const id = crypto.randomUUID();
          const asset = { id, name: objFile.name.replace(/\.[^.]+$/,''), object, isFoliage: false };
          three.assets.push(asset);
          const textures = Array.from(texByBase.entries()).map(([name, blob]) => ({ name, blob }));
          await persist.saveAsset({ id, name: asset.name, objText, mtlText, textures, isFoliage: false });
        }catch(err){ console.error(err); alert('Failed to import '+objFile.name+': '+err.message); }
      }
      renderAssetList();
    }
    e.target.value = '';
  });
}

function readFileText(file){
  return new Promise((resolve, reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result)); r.onerror=()=>reject(r.error||new Error('read failed')); r.readAsText(file); });
}

function renderAssetList(){
  if (!meshList) return; meshList.innerHTML='';
  three.assets.forEach(a => {
    const card = document.createElement('div'); card.className='asset-card';
    const canvas = document.createElement('canvas'); canvas.className='asset-canvas'; canvas.width=120; canvas.height=90; card.appendChild(canvas);
    const meta = document.createElement('div'); meta.className='asset-meta';
    const name = document.createElement('div'); name.className='name'; name.textContent=a.name; meta.appendChild(name);
    const actionsRow = document.createElement('div'); actionsRow.className='row';
    const selBtn=document.createElement('button'); selBtn.className='btn small'; selBtn.textContent='Select'; selBtn.title='Select for placement';
    const paintBtn=document.createElement('button'); paintBtn.className='btn small'; paintBtn.textContent='Paint with'; paintBtn.title='Use as foliage paint brush';
    const folWrap=document.createElement('label'); folWrap.className='small muted'; folWrap.style.display='flex'; folWrap.style.alignItems='center'; folWrap.style.gap='6px';
    const folChk=document.createElement('input'); folChk.type='checkbox'; folChk.checked=!!a.isFoliage; const folTxt=document.createElement('span'); folTxt.textContent='Foliage';
    folWrap.appendChild(folChk); folWrap.appendChild(folTxt);
    selBtn.addEventListener('click', ()=>{ three.placing = a; updatePlaceButton(); });
    paintBtn.addEventListener('click', ()=>{ if (a.isFoliage){ three.foliageAsset=a; alert('Foliage brush set to ' + a.name); } else { alert('Mark as foliage first.'); } });
    folChk.addEventListener('change', ()=>{ a.isFoliage = folChk.checked; });
    actionsRow.appendChild(selBtn); actionsRow.appendChild(paintBtn); actionsRow.appendChild(folWrap);
    meta.appendChild(actionsRow);
    card.appendChild(meta);
    meshList.appendChild(card);
    try { drawAssetPreview(a, canvas); } catch(e){}
  });
}

function drawAssetPreview(asset, canvas){
  if (!window.THREE || !canvas) return;
  const { THREE } = window;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = new THREE.Scene(); scene.background = null;
  const amb = new THREE.AmbientLight(0xffffff, 0.9); scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(1,2,2); scene.add(dir);
  let obj;
  if (asset.object){ obj = asset.object.clone(true); }
  else if (asset.geometry){
    const mat = asset.material || new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.8, metalness: 0.05 });
    obj = new THREE.Mesh(asset.geometry, mat);
  } else { return; }
  // center and fit
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  obj.position.sub(center);
  scene.add(obj);
  const cam = new THREE.PerspectiveCamera(35, canvas.width/canvas.height, 0.01, 100);
  const radius = Math.max(0.001, Math.max(size.x, size.y, size.z) * 0.6);
  cam.position.set(radius*2, radius*1.2, radius*2);
  cam.lookAt(0,0,0);
  renderer.render(scene, cam);
  // clean up minimal allocations (keep canvas)
  renderer.dispose();
}

function cloneAsset(asset){
  const { THREE } = window;
  if (asset.object){
    const clone = asset.object.clone(true);
    clone.traverse(n=>{ if (n.isMesh && n.material) n.material = n.material.clone(); });
    return clone;
  }
  if (asset.geometry){
    const mat = (asset.material && asset.material.clone()) || new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });
    return new THREE.Mesh(asset.geometry, mat);
  }
  return null;
}

function updatePlaceButton(){
  if (!placeModeBtn) return; const on = !!three.placing; placeModeBtn.textContent = on ? 'Place: On (' + (three.placing?.name||'asset') + ')' : 'Place: Off';
}
if (placeModeBtn){ placeModeBtn.addEventListener('click', ()=>{ if (three.placing) { three.placing = null; } else if (three.assets[0]) { three.placing = three.assets[0]; } updatePlaceButton(); }); }

// raycast placement
if (canvas3d){
  const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
  canvas3d.addEventListener('click', (e)=>{
    if (!three.placing || !three.terrainMesh) return;
    const rect = canvas3d.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    three.camera.updateMatrixWorld(); raycaster.setFromCamera(mouse, three.camera);
    const hit = raycaster.intersectObject(three.terrainMesh, false)[0];
    if (hit){
      if (e.stopImmediatePropagation) e.stopImmediatePropagation(); else if (e.stopPropagation) e.stopPropagation();
      const obj = cloneAsset(three.placing); if (!obj) return;
      obj.position.copy(hit.point);
      obj.position.y += 0.02; // avoid z-fight
      obj.userData.isPlacedAsset = true;
      obj.userData.id = crypto.randomUUID();
      obj.userData.label = (three.placing.name || 'Asset') + ' #' + (three.counter++);
      three.group.add(obj);
      three.placed.push(obj);
      renderPlacedList();
      savePlacedToStorage();
      setSelected(obj);
      try { requestAnimationFrame(()=> setSelected(obj)); } catch {}
    }
  });
}

// Minimal OBJ parser (positions + faces)
function parseOBJ(text){
  const pos=[]; const faces=[]; const lines=text.split(/\r?\n/);
  for (const ln of lines){
    const l=ln.trim(); if (!l || l.startsWith('#')) continue; const parts=l.split(/\s+/);
    if (parts[0]==='v' && parts.length>=4){ pos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]); }
    else if (parts[0]==='f' && parts.length>=4){
      const idx = parts.slice(1).map(tok=>{ const i=parseInt(tok.split('/')[0],10); return i<0? pos.length+i : i-1; });
      if (idx.length===3) faces.push(idx);
      else if (idx.length===4) faces.push([idx[0],idx[1],idx[2]],[idx[0],idx[2],idx[3]]);
      else {
        for (let i=1;i<idx.length-1;i++) faces.push([idx[0], idx[i], idx[i+1]]);
      }
    }
  }
  if (pos.length===0 || faces.length===0) throw new Error('No geometry');
  // center and scale to unit size
  let min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  pos.forEach(p=>{ for(let k=0;k<3;k++){ if(p[k]<min[k])min[k]=p[k]; if(p[k]>max[k])max[k]=p[k]; } });
  const size=[max[0]-min[0], max[1]-min[1], max[2]-min[2]]; const maxDim=Math.max(size[0],size[1],size[2])||1;
  const center=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2];
  const scale=1/maxDim;
  const vertices=[];
  faces.forEach(f=>{ f.forEach(i=>{ const p=pos[i]; vertices.push( (p[0]-center[0])*scale, (p[1]-center[1])*scale, (p[2]-center[2])*scale ); }); });
  const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(vertices),3));
  return geom;
}

// Parse a subset of MTL: newmtl, Kd (diffuse color), map_Kd (diffuse map)
function parseMTL(text, texturesByName){
  const { THREE } = window;
  const mats = {};
  let cur = null;
  const lines = (text||'').split(/\r?\n/);
  for (const ln of lines){
    const l = ln.trim(); if (!l || l.startsWith('#')) continue;
    const parts = l.split(/\s+/);
    const k = parts[0];
    if (k === 'newmtl') { cur = { name: parts.slice(1).join(' '), kd:[0.8,0.8,0.8], map:null }; mats[cur.name]=cur; }
    else if (!cur) continue;
    else if (k === 'Kd' && parts.length>=4){ cur.kd = [parseFloat(parts[1])||0.8, parseFloat(parts[2])||0.8, parseFloat(parts[3])||0.8]; }
    else if (k === 'map_Kd' && parts.length>=2){ cur.map = parts.slice(1).join(' '); }
  }
  // build THREE materials
  const out = {};
  const loader = new THREE.TextureLoader();
  for (const name in mats){
    const m = mats[name];
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.kd[0], m.kd[1], m.kd[2]), roughness: 0.9, metalness: 0.05 });
    if (m.map){
      const base = m.map.split(/\\|\//).pop().toLowerCase();
      const texSrc = texturesByName && texturesByName.get ? texturesByName.get(base) : null;
      if (texSrc){
        let url;
        if (typeof texSrc === 'string') { url = texSrc; }
        else { url = URL.createObjectURL(texSrc); }
        const tex = loader.load(url, ()=> { if (typeof texSrc !== 'string') URL.revokeObjectURL(url); });
        tex.anisotropy = 4; mat.map = tex; mat.needsUpdate = true;
      }
    }
    out[name] = mat;
  }
  // default material
  out['__default__'] = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.9, metalness: 0.05 });
  return out;
}

// Build an Object3D from OBJ text using material map
function buildObjectFromOBJ(text, matMap){
  const { THREE } = window;
  const lines = text.split(/\r?\n/);
  const pos=[]; let curMtl='__default__';
  const facesByMat = new Map();
  const getList = (k)=>{ if(!facesByMat.has(k)) facesByMat.set(k, []); return facesByMat.get(k); };
  for (const ln of lines){
    const l = ln.trim(); if(!l || l.startsWith('#')) continue; const parts = l.split(/\s+/);
    const t = parts[0];
    if (t==='v' && parts.length>=4){ pos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]); }
    else if (t==='usemtl'){ curMtl = parts.slice(1).join(' ') || '__default__'; }
    else if (t==='f' && parts.length>=4){
      const idx = parts.slice(1).map(tok=>{ const i=parseInt(tok.split('/')[0],10); return i<0? pos.length+i : i-1; });
      const pushTri = (a,b,c)=> getList(curMtl).push([a,b,c]);
      if (idx.length===3) pushTri(idx[0],idx[1],idx[2]);
      else if (idx.length===4) { pushTri(idx[0],idx[1],idx[2]); pushTri(idx[0],idx[2],idx[3]); }
      else { for (let i=1;i<idx.length-1;i++) pushTri(idx[0], idx[i], idx[i+1]); }
    }
  }
  if (pos.length===0) throw new Error('No vertices in OBJ');
  // center/scale to unit
  let min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  pos.forEach(p=>{ for(let k=0;k<3;k++){ if(p[k]<min[k])min[k]=p[k]; if(p[k]>max[k])max[k]=p[k]; } });
  const size=[max[0]-min[0], max[1]-min[1], max[2]-min[2]]; const maxDim=Math.max(size[0],size[1],size[2])||1;
  const center=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2];
  const scale=1/maxDim;
  const group = new THREE.Group();
  for (const [mtl, faces] of facesByMat){
    if (!faces.length) continue;
    const vertices=[];
    faces.forEach(f=>{ f.forEach(i=>{ const p=pos[i]; vertices.push( (p[0]-center[0])*scale, (p[1]-center[1])*scale, (p[2]-center[2])*scale ); }); });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(vertices),3));
    geom.computeVertexNormals();
    const material = (matMap && matMap[mtl]) ? matMap[mtl] : (matMap && matMap['__default__']) || new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });
    const mesh = new THREE.Mesh(geom, material);
    group.add(mesh);
  }
  return group;
}

// -------- Foliage painting --------
function updatePaintFromUI(){
  if (paintEnable) three.paint.enabled = !!paintEnable.checked;
  if (paintRadius) three.paint.radius = Math.max(0.1, parseFloat(paintRadius.value)||3);
  if (paintDensity) three.paint.density = Math.max(1, Math.min(200, parseInt(paintDensity.value,10)||8));
  if (paintRandRot) three.paint.randRot = !!paintRandRot.checked;
  if (paintScaleMin) three.paint.sMin = Math.max(0.01, parseFloat(paintScaleMin.value)||0.8);
  if (paintScaleMax) three.paint.sMax = Math.max(three.paint.sMin, parseFloat(paintScaleMax.value)||1.2);
  if (paintErase) three.paint.erase = !!paintErase.checked;
  // Snap camera to top-down when entering paint mode and show overlay
  if (three.paint.enabled && !three.paint.use2d) { snapToTopDown(); }
  setViewportMode();
  refreshPaintOverlay();
  drawPaint2d();
}
['paint_enable','paint_radius','paint_density','paint_rand_rot','paint_scale_min','paint_scale_max'].forEach(id=>{
  const el=document.getElementById(id); if (el) el.addEventListener('input', updatePaintFromUI);
});
updatePaintFromUI();
if (paintGenBtn) paintGenBtn.addEventListener('click', ()=> generateFoliageFromPaint());
if (paintClearBtn) paintClearBtn.addEventListener('click', ()=> {
  if (three.paint && three.paint.maskCtx && three.paint.maskCanvas){
    three.paint.maskCtx.clearRect(0,0,three.paint.maskCanvas.width, three.paint.maskCanvas.height);
    refreshPaintOverlay();
    drawPaint2d();
  }
});
  if (paint2dMain){
  const toMaskCoords = (evt)=>{
    const rect = paint2dMain.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    const W = three.paint.maskCanvas?.width||1, H = three.paint.maskCanvas?.height||1;
    return { mx: Math.max(0, Math.min(W-1, Math.round(x*W))), my: Math.max(0, Math.min(H-1, Math.round(y*H))) };
  };
  let down=false;
  const paintAt = (mx,my)=>{
    if (!three.paint.maskCtx) return;
    const g = three.paint.maskCtx; const r = Math.max(1, Math.floor(three.paint.radius));
    g.save(); g.beginPath(); g.arc(mx, my, r, 0, Math.PI*2);
    g.fillStyle = three.paint.erase ? 'rgba(0,0,0,0)' : '#ffffff';
    if (three.paint.erase){ g.globalCompositeOperation = 'destination-out'; }
    else { g.globalCompositeOperation = 'source-over'; }
    g.fill(); g.restore();
    drawPaint2d(); refreshPaintOverlay();
  };
  paint2dMain.addEventListener('mousedown', (e)=>{ if (!(three.paint.enabled && three.paint.use2d)) return; down=true; const {mx,my}=toMaskCoords(e); paintAt(mx,my); });
  paint2dMain.addEventListener('mousemove', (e)=>{ if (!(three.paint.enabled && three.paint.use2d) || !down) return; const {mx,my}=toMaskCoords(e); paintAt(mx,my); });
  window.addEventListener('mouseup', ()=>{ down=false; });
  window.addEventListener('resize', ()=> drawPaint2d());
}

function paintAtEvent(e){
  if (!three.terrainMesh) return;
  updatePaintFromUI();
  const hit = raycastToTerrain(e); if (!hit) return;
  const rect = getMapScreenRect(); if (!rect) return;
  const W = three.paint.maskCanvas.width, H = three.paint.maskCanvas.height;
  // Convert world hit to overlay pixels, then to mask pixels using rect mapping
  const sp = worldToOverlayPx(hit.point.x, hit.point.y, hit.point.z);
  const u = (sp.x - rect.x) / rect.w;
  const v = (sp.y - rect.y) / rect.h;
  const mx = Math.max(0, Math.min(W-1, Math.round(u * W)));
  const my = Math.max(0, Math.min(H-1, Math.round(v * H)));
  const r = Math.max(1, Math.floor(three.paint.radius));
  if (three.paint.maskCtx){
    const g = three.paint.maskCtx;
    g.save(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(mx, my, r, 0, Math.PI*2); g.fill(); g.restore();
  }
  refreshPaintOverlay();
}

// Generate foliage instances from painted mask
function generateFoliageFromPaint(){
  if (!three.foliageAsset || !three.paint.maskCanvas) { alert('Set a foliage asset (Paint with) and paint first.'); return; }
  const c = three.paint.maskCanvas; const g = three.paint.maskCtx; const W=c.width, H=c.height;
  const img = g.getImageData(0,0,W,H).data;
  // collect painted pixels indices
  const painted=[]; for (let y=0;y<H;y++){ for(let x=0;x<W;x++){ const a=img[(y*W+x)*4+3]; if (a>0) painted.push([x,y]); } }
  if (painted.length===0){ alert('No painted area found.'); return; }
  updatePaintFromUI();
  const area = painted.length;
  const count = Math.min(5000, Math.floor(area * (three.paint.density/50))); // scale factor
  const ray = new THREE.Raycaster();
  for (let i=0;i<count;i++){
    const [mx,my] = painted[(Math.random()*painted.length)|0];
    let px, pz, hit;
    if (three.paint.use2d){
      // Direct world mapping: mask x->world x, mask y->world z
      px = mx + Math.random();
      pz = my + Math.random();
      const py = heightAt(px,pz) + 0.02;
      hit = { point: new THREE.Vector3(px, py, pz) };
    } else {
      // 3D overlay mode: go via screen rect and raycast
      const rect = getMapScreenRect(); if (!rect) continue;
      const sx = rect.x + (mx + Math.random())/W * rect.w;
      const sy = rect.y + (my + Math.random())/H * rect.h;
      const ndc = new THREE.Vector2((sx/(canvas3d.width||1))*2-1, -((sy/(canvas3d.height||1))*2-1));
      three.camera.updateMatrixWorld(); ray.setFromCamera(ndc, three.camera);
      hit = three.terrainMesh ? ray.intersectObject(three.terrainMesh, false)[0] : null;
      if (!hit) continue;
    }
    const m = cloneAsset(three.foliageAsset); if (!m) continue;
    m.userData.isPlacedAsset = true; m.userData.byPaint = true;
    m.userData.id = crypto.randomUUID(); m.userData.label = (three.foliageAsset.name||'Foliage') + ' #' + (three.counter++);
    m.position.copy(hit.point);
    if (three.paint.randRot) m.rotation.y = Math.random()*Math.PI*2;
    const s = three.paint.sMin + Math.random()*(three.paint.sMax - three.paint.sMin);
    m.scale.set(s,s,s);
    three.group.add(m);
    three.placed.push(m);
  }
  renderPlacedList();
  savePlacedToStorage();
}

// ---------- Selection + inspector ----------
function setSelected(obj){
  three.selected = obj;
  if (!window.THREE) return;
  if (three.selHelper){ three.group.remove(three.selHelper); three.selHelper.geometry && three.selHelper.geometry.dispose && three.selHelper.geometry.dispose(); }
  if (obj){ three.selHelper = new THREE.BoxHelper(obj, 0x66ccff); three.group.add(three.selHelper); }
  // Focus camera on the selected object
  if (obj && three.ctrl){
    const targetPos = obj.position.clone();
    three.ctrl.target.copy(targetPos);
    // Set a reasonable distance based on object size
    try {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3(); box.getSize(size);
      const radius = Math.max(0.5, size.length() / 2);
      three.ctrl.dist = Math.max(5, radius * 4);
    } catch {}
  }
  updateInspectorFromSelected();
  renderPlacedList();
  // Ensure the corresponding row is visible in the Placed Objects list
  try {
    if (placedList && obj && obj.userData && obj.userData.id){
      const row = placedList.querySelector('[data-id="'+obj.userData.id+'"]');
      if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
    }
  } catch {}
}

function updateSelHelper(){ if (three.selHelper && three.selected){ three.selHelper.update(); } }

function updateInspectorFromSelected(){
  if (!three.selected) { if (trPosX){ trPosX.value=''; trPosY.value=''; trPosZ.value=''; if (trRotX) trRotX.value=''; if (trRotY) trRotY.value=''; if (trRotZ) trRotZ.value=''; trScale.value=''; } return; }
  if (trPosX){ trPosX.value = three.selected.position.x.toFixed(2); }
  if (trPosY){ trPosY.value = three.selected.position.y.toFixed(2); }
  if (trPosZ){ trPosZ.value = three.selected.position.z.toFixed(2); }
  const toDeg = (r)=> (THREE.MathUtils.radToDeg(Number(r)||0)).toFixed(1);
  if (trRotX){ trRotX.value = toDeg(three.selected.rotation.x); }
  if (trRotY){ trRotY.value = toDeg(three.selected.rotation.y); }
  if (trRotZ){ trRotZ.value = toDeg(three.selected.rotation.z); }
  if (trScale){ trScale.value = three.selected.scale.x.toFixed(2); }
}

function applyInspectorToSelected(){
  if (!three.selected) return;
  const px=parseFloat(trPosX.value)||0, py=parseFloat(trPosY.value)||0, pz=parseFloat(trPosZ.value)||0;
  const rx=THREE.MathUtils.degToRad(parseFloat(trRotX?.value)||0);
  const ry=THREE.MathUtils.degToRad(parseFloat(trRotY?.value)||0);
  const rz=THREE.MathUtils.degToRad(parseFloat(trRotZ?.value)||0);
  const s=Math.max(0.01, parseFloat(trScale.value)||1);
  three.selected.position.set(px,py,pz);
  three.selected.rotation.set(rx,ry,rz);
  three.selected.scale.set(s,s,s);
  updateSelHelper();
  savePlacedToStorage();
}

;[trPosX,trPosY,trPosZ,trRotX,trRotY,trRotZ,trScale].forEach(el=>{ if (el) el.addEventListener('input', applyInspectorToSelected); });

// Selection via clicking when not placing
if (canvas3d){
  const raycasterSel = new THREE.Raycaster(); const mouseSel = new THREE.Vector2();
  canvas3d.addEventListener('click', (e)=>{
    if (three.placing) return; // handled by placer
    const rect = canvas3d.getBoundingClientRect();
    mouseSel.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseSel.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    three.camera.updateMatrixWorld(); raycasterSel.setFromCamera(mouseSel, three.camera);
    // Gather candidate meshes (placed assets only)
    const candidates = three.group.children.filter(o => o.userData && o.userData.isPlacedAsset);
    const hit = raycasterSel.intersectObjects(candidates, true)[0];
    if (hit){ setSelected(hit.object); }
  });
}

function raycastToTerrain(e){
  const rect = canvas3d.getBoundingClientRect();
  const mouse = new THREE.Vector2(); mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const rc = new THREE.Raycaster(); three.camera.updateMatrixWorld(); rc.setFromCamera(mouse, three.camera);
  const hit = three.terrainMesh ? rc.intersectObject(three.terrainMesh, false)[0] : null; return hit || null;
}

function heightAt(x,z){
  if (!three.terrainMesh) return 0;
  const rc = new THREE.Raycaster(); rc.set(new THREE.Vector3(x, 9999, z), new THREE.Vector3(0,-1,0));
  const hit = rc.intersectObject(three.terrainMesh, false)[0]; return hit ? hit.point.y : 0;
}

// Keyboard transforms: arrows move, Q/E rotate, +/- scale
window.addEventListener('keydown', (e)=>{
  if (!isThreeOpen() || !three.selected) return;
  const step = e.shiftKey ? 1.0 : 0.25;
  let handled=false;
  if (e.key==='ArrowLeft'){ three.selected.position.x -= step; handled=true; }
  else if (e.key==='ArrowRight'){ three.selected.position.x += step; handled=true; }
  else if (e.key==='ArrowUp'){ three.selected.position.z -= step; handled=true; }
  else if (e.key==='ArrowDown'){ three.selected.position.z += step; handled=true; }
  else if (e.key.toLowerCase()==='q'){ three.selected.rotation.y += THREE.MathUtils.degToRad(5); handled=true; }
  else if (e.key.toLowerCase()==='e'){ three.selected.rotation.y -= THREE.MathUtils.degToRad(5); handled=true; }
  else if (e.key==='+' || e.key==='='){ const s=three.selected.scale.x*1.05; three.selected.scale.set(s,s,s); handled=true; }
  else if (e.key==='-' || e.key==='_'){ const s=three.selected.scale.x/1.05; three.selected.scale.set(s,s,s); handled=true; }
  if (handled){ three.selected.position.y = heightAt(three.selected.position.x, three.selected.position.z) + 0.02; updateInspectorFromSelected(); updateSelHelper(); e.preventDefault(); }
  if (handled){ savePlacedToStorage(); }
});

// -------- Placed list UI --------
function renderPlacedList(){
  if (!placedList) return;
  placedList.innerHTML='';
  three.placed.forEach(m => {
    const row = document.createElement('div'); row.className='list-item' + (three.selected===m ? ' active':'' ); row.dataset.id=m.userData.id;
    const name = document.createElement('div'); name.className='name'; name.textContent = m.userData.label || 'Object';
    const actions = document.createElement('div'); actions.className='actions';
    const selBtn = document.createElement('button'); selBtn.className='btn small'; selBtn.textContent='Select';
    const delBtn = document.createElement('button'); delBtn.className='btn small danger'; delBtn.textContent='Delete';
    selBtn.addEventListener('click', ()=> setSelected(m));
    delBtn.addEventListener('click', ()=> deletePlaced(m));
    actions.appendChild(selBtn); actions.appendChild(delBtn);
    row.appendChild(name); row.appendChild(actions);
    placedList.appendChild(row);
  });
}

function deletePlaced(m){
  try{
    three.group.remove(m);
    if (m.material) { if (Array.isArray(m.material)) m.material.forEach(mm=>mm.dispose&&mm.dispose()); else m.material.dispose&&m.material.dispose(); }
  }catch{}
  three.placed = three.placed.filter(x => x !== m);
  if (three.selected === m){ setSelected(null); }
  renderPlacedList();
  savePlacedToStorage();
}

if (deleteFoliageBtn){
  deleteFoliageBtn.addEventListener('click', ()=>{
    const toDelete = three.placed.filter(m => m.userData && m.userData.byPaint);
    if (!toDelete.length){ alert('No foliage objects to delete.'); return; }
    toDelete.forEach(m => {
      try{ three.group.remove(m); }catch{}
    });
    three.placed = three.placed.filter(m => !(m.userData && m.userData.byPaint));
    if (three.selected && three.selected.userData && three.selected.userData.byPaint) setSelected(null);
    renderPlacedList();
    savePlacedToStorage();
  });
}

// -------- Persistence (assets in IndexedDB, placed in localStorage) --------
const persist = {
  db: null,
  open(){
    return new Promise((resolve,reject)=>{
      if (this.db) return resolve(this.db);
      const req = indexedDB.open('dnd_toolkit', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
      };
      req.onsuccess = ()=>{ this.db=req.result; resolve(this.db); };
      req.onerror = ()=> reject(req.error||new Error('idb open failed'));
    });
  },
  async saveAsset(record){
    const db = await this.open();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction('assets','readwrite');
      tx.objectStore('assets').put(record);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error||new Error('idb tx failed'));
    });
  },
  async getAssets(){
    const db = await this.open();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction('assets','readonly');
      const req = tx.objectStore('assets').getAll();
      req.onsuccess = ()=> resolve(req.result||[]);
      req.onerror = ()=> reject(req.error||new Error('idb getAll failed'));
    });
  }
};

async function loadPersistedAssets(){
  // Prefer server-side persisted assets; fall back to IDB
  const ok = await loadAssetsFromServer();
  if (ok) return;
  try{
    const records = await persist.getAssets();
    if (!records.length) return;
    for (const rec of records){
      try{
        const texMap = new Map((rec.textures||[]).map(t => [t.name.toLowerCase(), t.blob]));
        const mats = parseMTL(rec.mtlText||'', texMap);
        const object = buildObjectFromOBJ(rec.objText, mats);
        three.assets.push({ id: rec.id, name: rec.name, object, isFoliage: !!rec.isFoliage });
      }catch(err){ console.warn('Failed to rebuild asset', rec.name, err); }
    }
    renderAssetList();
  }catch(err){ console.warn('No persisted assets', err); }
}

async function loadAssetsFromServer(){
  try{
    const res = await fetch('assets_list.php', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || !Array.isArray(data.assets)) return false;
    for (const a of data.assets){
      try{
        const objText = a.objUrl ? await (await fetch(a.objUrl, {cache:'no-store'})).text() : '';
        const mtlText = a.mtlUrl ? await (await fetch(a.mtlUrl, {cache:'no-store'})).text() : '';
        const texMap = new Map();
        (a.textures||[]).forEach(url => { const base = url.split('/').pop().toLowerCase(); texMap.set(base, url); });
        const mats = parseMTL(mtlText, texMap);
        const object = buildObjectFromOBJ(objText, mats);
        three.assets.push({ id: a.id, name: a.name, object, isFoliage: false });
      }catch(err){ console.warn('Failed server asset', a.name, err); }
    }
    renderAssetList();
    return true;
  }catch(err){ console.warn('Server asset load failed', err); return false; }
}

function savePlacedToStorage(){
  try{
    const data = three.placed.map(m => ({
      id: m.userData?.id,
      assetName: m.userData?.label?.split(' #')[0],
      assetId: findAssetIdForMesh(m),
      p: { x: m.position.x, y: m.position.y, z: m.position.z },
      rx: m.rotation.x,
      ry: m.rotation.y,
      rz: m.rotation.z,
      s: m.scale.x,
      bp: !!(m.userData && m.userData.byPaint)
    }));
    localStorage.setItem('dnd.placed', JSON.stringify(data));
  }catch{}
}

function findAssetIdForMesh(m){
  // naive: match by name prefix
  const name = m.userData?.label?.split(' #')[0];
  const a = three.assets.find(x => x.name === name);
  return a ? a.id : null;
}

  async function restorePlacedFromStorage(){
  try{
    if (!three.sceneReady) return;
    const arr = JSON.parse(localStorage.getItem('dnd.placed')||'[]');
    if (!Array.isArray(arr) || !arr.length) return;
    // Clear current placed in scene (keep list fresh)
    three.placed.forEach(m=>{ try{ three.group.remove(m); }catch{} });
    three.placed = [];
    for (const it of arr){
      const asset = three.assets.find(a => a.id === it.assetId || a.name === it.assetName);
      if (!asset) continue;
      const obj = cloneAsset(asset); if (!obj) continue;
      obj.position.set(it.p.x, it.p.y, it.p.z);
      obj.rotation.set(it.rx||0, it.ry||0, it.rz||0);
      const s = it.s || 1; obj.scale.set(s,s,s);
      obj.userData.isPlacedAsset = true; obj.userData.byPaint = !!it.bp; obj.userData.id = it.id || crypto.randomUUID(); obj.userData.label = (asset.name||'Asset') + ' #' + (three.counter++);
      three.group.add(obj);
      three.placed.push(obj);
    }
    renderPlacedList();
  }catch(err){ console.warn('restore placed failed', err); }
}

// ------------------- Procedural textures -------------------
function makeStoneTileTexture(){
  const c = document.createElement('canvas'); c.width=256; c.height=256; const g=c.getContext('2d');
  g.fillStyle = '#2a324a'; g.fillRect(0,0,256,256);
  // soft noise
  for(let i=0;i<6000;i++){
    const x=Math.random()*256, y=Math.random()*256, r=Math.random()*1.2;
    g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x,y,r,r);
    g.fillStyle = 'rgba(0,0,0,0.03)'; g.fillRect(x+0.5,y+0.5,r,r);
  }
  // tile lines
  g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=2; g.beginPath();
  const step=32; for(let x=0;x<=256;x+=step){ g.moveTo(x,0); g.lineTo(x,256);} for(let y=0;y<=256;y+=step){ g.moveTo(0,y); g.lineTo(256,y);} g.stroke();
  return new THREE.CanvasTexture(c);
}

function makeBrickTexture(){
  const c = document.createElement('canvas'); c.width=256; c.height=256; const g=c.getContext('2d');
  g.fillStyle='#8c8f99'; g.fillRect(0,0,256,256);
  g.strokeStyle='rgba(40,40,40,0.45)'; g.lineWidth=4; g.beginPath();
  const rowH=24, brickW=48; for(let y=0;y<256;y+=rowH){ g.moveTo(0,y+rowH); g.lineTo(256,y+rowH);} g.stroke();
  g.lineWidth=3; g.beginPath();
  for(let y=0;y<256;y+=rowH){ const offset=((y/rowH)|0)%2? brickW/2:0; for(let x=-offset;x<256;x+=brickW){ g.moveTo(x+offset,y); g.lineTo(x+offset,y+rowH);} } g.stroke();
  for(let i=0;i<5000;i++){ const x=Math.random()*256, y=Math.random()*256, a=Math.random()*0.12; g.fillStyle=`rgba(0,0,0,${a})`; g.fillRect(x,y,1,1);} 
  return new THREE.CanvasTexture(c);
}

function makeOverworldTexture(grid){
  const H=grid.length, W=grid[0].length; const maxSize=1024; const scale=Math.max(2, Math.floor(Math.min(maxSize/Math.max(W,H), 6)));
  const c=document.createElement('canvas'); c.width=W*scale; c.height=H*scale; const g=c.getContext('2d');
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const t=grid[y][x]; let color='#4c8a36';
      if (t===OTile.Water) color='#183054'; else if (t===OTile.Beach) color='#d7c89b'; else if (t===OTile.Forest) color='#295d26'; else if (t===OTile.Hill) color='#6e6b4e'; else if (t===OTile.Mountain) color='#7a6e67'; else if (t===OTile.Snow) color='#e9eef3';
      g.fillStyle=color; g.fillRect(x*scale,y*scale,scale,scale);
    }
  }
  // subtle per-pixel noise overlay
  const noise=document.createElement('canvas'); noise.width=c.width; noise.height=c.height; const ng=noise.getContext('2d');
  const img=ng.createImageData(noise.width, noise.height); const d=img.data; for(let i=0;i<d.length;i+=4){ const v=(Math.random()*60)|0; d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=18; } ng.putImageData(img,0,0);
  g.globalAlpha=0.25; g.drawImage(noise,0,0); g.globalAlpha=1;
  return new THREE.CanvasTexture(c);
}


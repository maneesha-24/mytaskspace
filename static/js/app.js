/* ═══════════════════════════════════════════════
   TIMETABLE APP — app.js
   Flask + SQLite | All data in data.db
═══════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const api = async (url, method='GET', body=null) => {
  const opts = {method, headers:{'Content-Type':'application/json'}};
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
};

/* ── Time helpers ── */
// "HH:MM" 24h  →  "H:MM AM/PM"
function fmt24(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const ap = h<12?'AM':'PM', hh=h%12||12;
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
}
// 24h sort key
function tVal(t){ if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; }

// Read AM/PM custom inputs → "HH:MM" 24h string
function readAmPmInputs(hourId, minId, ampmId){
  const h = parseInt($( hourId).value)||0;
  const m = parseInt($( minId ).value)||0;
  const ap = $(ampmId).querySelector('.ampm-btn.active').dataset.val;
  let h24 = h % 12;
  if(ap==='PM') h24 += 12;
  return `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Write "HH:MM" 24h → AM/PM inputs
function writeAmPmInputs(t24, hourId, minId, ampmId){
  if(!t24){ $(hourId).value=''; $(minId).value=''; return; }
  const [h,m] = t24.split(':').map(Number);
  const ap = h<12?'AM':'PM', hh=h%12||12;
  $(hourId).value = hh;
  $(minId ).value = String(m).padStart(2,'0');
  $(ampmId).querySelectorAll('.ampm-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.val===ap);
  });
}

function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── State ── */
let rows=[], notes=[], todos=[], weeklyTasks=[], settings={};
let editingRowId=null, editingNoteId=null, editingWTaskId=null;
let selectedColor='#1a1a1a', selectedWColor='#1a1a1a';
let todoDraft=[];

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
async function init(){
  settings = await api('/api/settings');
  applySettings();
  rows       = await api('/api/rows');    renderTable();
  notes      = await api('/api/notes');   renderNotes();
  weeklyTasks= await api('/api/weekly');
  todos      = await api('/api/todos');
  bindEvents();
}

function applySettings(){
  $('appBody').className = `theme-${settings.bg_theme||'white'}`;
  if(settings.heading) $('ttHeading').textContent = settings.heading;
  if(settings.subtext)  $('ttSubtext').textContent  = settings.subtext;
}

/* ══════════════════════════════════════════════
   TIMETABLE
══════════════════════════════════════════════ */
function renderTable(){
  const sorted = [...rows].sort((a,b)=>tVal(a.time_start)-tVal(b.time_start));
  const tb = $('ttBody'); tb.innerHTML='';
  sorted.forEach(row=>{
    const ts = row.time_end ? `${fmt24(row.time_start)} – ${fmt24(row.time_end)}` : fmt24(row.time_start);
    const tr = document.createElement('tr');
    tr.innerHTML=`
      <td class="td-time">${escHtml(ts)}</td>
      <td class="td-task" style="color:${row.task_color};border-left-color:${row.task_color}">${escHtml(row.task)}</td>
      <td class="td-actions">
        <button class="row-dots-btn" data-id="${row.id}">⋮</button>
        <div class="row-menu" id="rowMenu-${row.id}">
          <button data-action="edit"   data-id="${row.id}">✏️ Edit</button>
          <button data-action="delete" data-id="${row.id}" class="danger">🗑 Delete</button>
        </div>
      </td>`;
    tb.appendChild(tr);
  });
}

function openAddRowModal(){
  editingRowId=null; $('rowModalTitle').textContent='Add Row';
  $('rowStartHour').value=''; $('rowStartMin').value='';
  $('rowEndHour').value='';   $('rowEndMin').value='';
  resetAmPm('startAmpm'); resetAmPm('endAmpm');
  $('rowTask').value=''; setColor('#1a1a1a','rowColorPicker');
  $('rowModal').classList.add('open');
}
function openEditRowModal(id){
  const row=rows.find(r=>r.id===id); if(!row) return;
  editingRowId=id; $('rowModalTitle').textContent='Edit Row';
  writeAmPmInputs(row.time_start,'rowStartHour','rowStartMin','startAmpm');
  writeAmPmInputs(row.time_end,  'rowEndHour',  'rowEndMin',  'endAmpm');
  $('rowTask').value=row.task;
  setColor(row.task_color||'#1a1a1a','rowColorPicker');
  $('rowModal').classList.add('open');
}
function closeRowModal(){ $('rowModal').classList.remove('open'); }

function resetAmPm(toggleId){
  $(toggleId).querySelectorAll('.ampm-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
}

function setColor(c, pickerId){
  if(pickerId==='rowColorPicker') selectedColor=c;
  else selectedWColor=c;
  $(pickerId).querySelectorAll('.cp-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===c));
}

async function saveRow(){
  const time_start = readAmPmInputs('rowStartHour','rowStartMin','startAmpm');
  const time_end   = ($('rowEndHour').value && $('rowEndMin').value)
                   ? readAmPmInputs('rowEndHour','rowEndMin','endAmpm') : '';
  const task = $('rowTask').value.trim();
  if(!$('rowStartHour').value||!task){alert('Start time and task are required.');return;}
  const payload={time_start,time_end,task,task_color:selectedColor};
  if(editingRowId){
    await api(`/api/rows/${editingRowId}`,'PUT',payload);
    const i=rows.findIndex(r=>r.id===editingRowId);
    if(i!==-1) rows[i]={...rows[i],...payload};
  } else {
    const res=await api('/api/rows','POST',payload);
    rows.push({id:res.id,...payload});
  }
  closeRowModal(); renderTable();
}

async function deleteRow(id){
  if(!confirm('Delete this row?')) return;
  await api(`/api/rows/${id}`,'DELETE');
  rows=rows.filter(r=>r.id!==id); renderTable();
}

/* ══════════════════════════════════════════════
   STICKY NOTES
══════════════════════════════════════════════ */
function renderNotes(){
  $('notesLeft').innerHTML=''; $('notesRight').innerHTML='';
  notes.forEach(appendNote);
}
function appendNote(note){
  const zone = note.position==='left' ? $('notesLeft') : $('notesRight');
  const div=document.createElement('div');
  div.className='sticky-note'; div.dataset.id=note.id;
  div.innerHTML=`
    <button class="note-dots" data-id="${note.id}">⋮</button>
    <div class="note-menu" id="noteMenu-${note.id}">
      <button data-action="editNote"   data-id="${note.id}">✏️ Edit</button>
      <button data-action="deleteNote" data-id="${note.id}" class="danger">🗑 Delete</button>
    </div>
    <div class="note-text">${escHtml(note.content)}</div>`;
  zone.appendChild(div);
}
function openNoteModal(id=null){
  editingNoteId=id;
  if(id){ const n=notes.find(n=>n.id===id); $('noteText').value=n?n.content:''; $('noteModalTitle').textContent='Edit Note'; }
  else  { $('noteText').value=''; $('noteModalTitle').textContent='New Sticky Note'; }
  $('noteModal').classList.add('open');
}
function closeNoteModal(){ $('noteModal').classList.remove('open'); }
async function saveNote(){
  const content=$('noteText').value.trim(); if(!content) return;
  if(editingNoteId){
    await api(`/api/notes/${editingNoteId}`,'PUT',{content});
    const i=notes.findIndex(n=>n.id===editingNoteId); if(i!==-1) notes[i].content=content;
  } else {
    const res=await api('/api/notes','POST',{content});
    if(!res.ok){alert(res.error||'Could not add note.');return;}
    notes.push({id:res.id,content,position:res.position});
  }
  closeNoteModal(); renderNotes();
}
async function deleteNote(id){
  if(!confirm('Delete this note?')) return;
  await api(`/api/notes/${id}`,'DELETE');
  notes=notes.filter(n=>n.id!==id); renderNotes();
}

/* ══════════════════════════════════════════════
   TO-DO
══════════════════════════════════════════════ */
function openTodoWindow(){ todoDraft=todos.map(t=>({...t})); renderTodos(); $('todoWindow').classList.add('open'); }
function closeTodoWindow(){ $('todoWindow').classList.remove('open'); }
function renderTodos(){
  const body=$('todoBody'); body.innerHTML='';
  todoDraft.forEach((t,i)=>{
    const row=document.createElement('div'); row.className='todo-item';
    row.innerHTML=`
      <input type="checkbox" class="todo-cb" data-idx="${i}" ${t.done?'checked':''}>
      <input type="text" class="todo-text ${t.done?'done':''}" data-idx="${i}" value="${escHtml(t.content)}">
      <button class="todo-del" data-idx="${i}">✕</button>`;
    body.appendChild(row);
  });
}
async function saveTodos(){
  const existing=todos.map(t=>t.id);
  for(const t of todoDraft){
    if(t.id&&existing.includes(t.id)) await api(`/api/todos/${t.id}`,'PUT',{content:t.content,done:t.done?1:0});
    else if(!t.id){ const r=await api('/api/todos','POST',{content:t.content}); t.id=r.id; }
  }
  const draftIds=todoDraft.filter(t=>t.id).map(t=>t.id);
  for(const t of todos){ if(!draftIds.includes(t.id)) await api(`/api/todos/${t.id}`,'DELETE'); }
  todos=[...todoDraft]; closeTodoWindow();
}

/* ══════════════════════════════════════════════
   WEEKLY PLANNER
══════════════════════════════════════════════ */
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function renderWeekly(){
  const body=$('weeklyBody'); body.innerHTML='';
  DAYS.forEach(day=>{
    const col=document.createElement('div'); col.className='weekly-col';
    const tasks=weeklyTasks.filter(t=>t.day===day).sort((a,b)=>tVal(a.time_start)-tVal(b.time_start));
    col.innerHTML=`<div class="weekly-day-header">${day}</div>`;
    const taskArea=document.createElement('div'); taskArea.className='weekly-tasks';
    tasks.forEach(t=>{
      const ts = t.time_end ? `${fmt24(t.time_start)}–${fmt24(t.time_end)}` : fmt24(t.time_start);
      const card=document.createElement('div'); card.className='weekly-task-card';
      card.style.borderLeftColor=t.task_color||'var(--gold)';
      card.innerHTML=`
        <button class="weekly-task-dots" data-id="${t.id}">⋮</button>
        <div class="weekly-task-menu" id="wMenu-${t.id}">
          <button data-action="editW"   data-id="${t.id}">✏️ Edit</button>
          <button data-action="deleteW" data-id="${t.id}" class="danger">🗑 Delete</button>
        </div>
        <span class="weekly-task-time">${escHtml(ts)}</span>
        <span class="weekly-task-name" style="color:${t.task_color||'#1a1a1a'}">${escHtml(t.task)}</span>`;
      taskArea.appendChild(card);
    });
    const addBtn=document.createElement('button'); addBtn.className='weekly-add-btn';
    addBtn.textContent='＋ Add'; addBtn.dataset.day=day;
    col.appendChild(taskArea); col.appendChild(addBtn);
    body.appendChild(col);
  });
}

function openWTaskModal(day, id=null){
  editingWTaskId=id; $('wTaskDay').value=day;
  if(id){
    const t=weeklyTasks.find(t=>t.id===id); if(!t) return;
    $('wTaskModalTitle').textContent='Edit Task';
    writeAmPmInputs(t.time_start,'wStartHour','wStartMin','wStartAmpm');
    writeAmPmInputs(t.time_end,  'wEndHour',  'wEndMin',  'wEndAmpm');
    $('wTaskText').value=t.task;
    setColor(t.task_color||'#1a1a1a','wColorPicker');
  } else {
    $('wTaskModalTitle').textContent=`Add Task — ${day}`;
    $('wStartHour').value=''; $('wStartMin').value='';
    $('wEndHour').value='';   $('wEndMin').value='';
    resetAmPm('wStartAmpm'); resetAmPm('wEndAmpm');
    $('wTaskText').value=''; setColor('#1a1a1a','wColorPicker');
  }
  $('wTaskModal').classList.add('open');
}
function closeWTaskModal(){ $('wTaskModal').classList.remove('open'); }

async function saveWTask(){
  const day=$('wTaskDay').value;
  const time_start=readAmPmInputs('wStartHour','wStartMin','wStartAmpm');
  const time_end=($('wEndHour').value&&$('wEndMin').value)?readAmPmInputs('wEndHour','wEndMin','wEndAmpm'):'';
  const task=$('wTaskText').value.trim();
  if(!$('wStartHour').value||!task){alert('Start time and task required.');return;}
  const payload={day,time_start,time_end,task,task_color:selectedWColor};
  if(editingWTaskId){
    await api(`/api/weekly/${editingWTaskId}`,'PUT',payload);
    const i=weeklyTasks.findIndex(t=>t.id===editingWTaskId);
    if(i!==-1) weeklyTasks[i]={...weeklyTasks[i],...payload};
  } else {
    const res=await api('/api/weekly','POST',payload);
    weeklyTasks.push({id:res.id,...payload});
  }
  closeWTaskModal(); renderWeekly();
}
async function deleteWTask(id){
  if(!confirm('Delete this task?')) return;
  await api(`/api/weekly/${id}`,'DELETE');
  weeklyTasks=weeklyTasks.filter(t=>t.id!==id); renderWeekly();
}

/* ══════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════ */
async function applyTheme(theme){
  $('appBody').className=`theme-${theme}`; settings.bg_theme=theme;
  await api('/api/settings','POST',{bg_theme:theme});
  $('dotsMenu').classList.remove('open');
}

/* ══════════════════════════════════════════════
   EVENT BINDING
══════════════════════════════════════════════ */
function bindEvents(){

  /* 3-dot menu */
  $('btnDots').addEventListener('click',e=>{e.stopPropagation();$('dotsMenu').classList.toggle('open');});
  document.querySelectorAll('.theme-option').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));

  /* Toolbar */
  $('btnStickyNote').addEventListener('click',()=>openNoteModal(null));
  $('btnTodo').addEventListener('click',openTodoWindow);
  $('btnWeekly').addEventListener('click',()=>{ renderWeekly(); $('weeklyModal').classList.add('open'); });

  /* Add row */
  $('btnAddRow').addEventListener('click',openAddRowModal);

  /* Row modal */
  $('rowModalCancel').addEventListener('click',closeRowModal);
  $('rowModalSave').addEventListener('click',saveRow);
  $('rowTask').addEventListener('keydown',e=>{if(e.key==='Enter') saveRow();});
  $('rowColorPicker').querySelectorAll('.cp-btn').forEach(b=>b.addEventListener('click',()=>setColor(b.dataset.color,'rowColorPicker')));
  bindAmPm('startAmpm'); bindAmPm('endAmpm');

  /* Table row actions */
  $('ttBody').addEventListener('click',e=>{
    const dots=e.target.closest('.row-dots-btn');
    const act=e.target.closest('[data-action]');
    if(dots){
      e.stopPropagation();
      const id=Number(dots.dataset.id);
      closeAllMenus('.row-menu');
      $(`rowMenu-${id}`).classList.toggle('open');
      return;
    }
    if(act){
      const id=Number(act.dataset.id);
      closeAllMenus('.row-menu');
      if(act.dataset.action==='edit')   openEditRowModal(id);
      if(act.dataset.action==='delete') deleteRow(id);
    }
  });

  /* Note modal */
  $('noteModalCancel').addEventListener('click',closeNoteModal);
  $('noteModalOk').addEventListener('click',saveNote);

  /* Note zones */
  ['notesLeft','notesRight'].forEach(zid=>{
    $(zid).addEventListener('click',e=>{
      const dots=e.target.closest('.note-dots');
      const act=e.target.closest('[data-action]');
      if(dots){
        e.stopPropagation();
        const id=Number(dots.dataset.id);
        closeAllMenus('.note-menu');
        $(`noteMenu-${id}`).classList.toggle('open');
        return;
      }
      if(act){
        const id=Number(act.dataset.id);
        closeAllMenus('.note-menu');
        if(act.dataset.action==='editNote')   openNoteModal(id);
        if(act.dataset.action==='deleteNote') deleteNote(id);
      }
    });
  });

  /* To-do */
  $('todoClose').addEventListener('click',closeTodoWindow);
  $('todoCancelBtn').addEventListener('click',closeTodoWindow);
  $('todoSaveBtn').addEventListener('click',saveTodos);
  $('todoAddBtn').addEventListener('click',()=>{
    const v=$('todoInput').value.trim(); if(!v) return;
    todoDraft.push({content:v,done:0}); $('todoInput').value=''; renderTodos();
  });
  $('todoInput').addEventListener('keydown',e=>{if(e.key==='Enter') $('todoAddBtn').click();});
  $('todoBody').addEventListener('change',e=>{
    const cb=e.target.closest('.todo-cb');
    if(cb){ const i=Number(cb.dataset.idx); todoDraft[i].done=cb.checked?1:0; renderTodos(); }
  });
  $('todoBody').addEventListener('input',e=>{
    const inp=e.target.closest('.todo-text');
    if(inp) todoDraft[Number(inp.dataset.idx)].content=inp.value;
  });
  $('todoBody').addEventListener('click',e=>{
    const btn=e.target.closest('.todo-del');
    if(btn){ todoDraft.splice(Number(btn.dataset.idx),1); renderTodos(); }
  });

  /* Weekly modal */
  $('weeklyClose').addEventListener('click',()=>$('weeklyModal').classList.remove('open'));
  $('weeklyModal').addEventListener('click',e=>{
    if(e.target===$('weeklyModal')) $('weeklyModal').classList.remove('open');
  });
  $('weeklyBody').addEventListener('click',e=>{
    const addBtn=e.target.closest('.weekly-add-btn');
    const dots=e.target.closest('.weekly-task-dots');
    const act=e.target.closest('[data-action]');
    if(addBtn){ openWTaskModal(addBtn.dataset.day); return; }
    if(dots){
      e.stopPropagation();
      const id=Number(dots.dataset.id);
      closeAllMenus('.weekly-task-menu');
      $(`wMenu-${id}`).classList.toggle('open');
      return;
    }
    if(act){
      const id=Number(act.dataset.id);
      closeAllMenus('.weekly-task-menu');
      if(act.dataset.action==='editW')   { const t=weeklyTasks.find(t=>t.id===id); if(t) openWTaskModal(t.day,id); }
      if(act.dataset.action==='deleteW') deleteWTask(id);
    }
  });

  /* Weekly task modal */
  $('wTaskCancel').addEventListener('click',closeWTaskModal);
  $('wTaskSave').addEventListener('click',saveWTask);
  $('wTaskModal').addEventListener('click',e=>{if(e.target===$('wTaskModal')) closeWTaskModal();});
  $('wColorPicker').querySelectorAll('.cp-btn').forEach(b=>b.addEventListener('click',()=>setColor(b.dataset.color,'wColorPicker')));
  bindAmPm('wStartAmpm'); bindAmPm('wEndAmpm');
  $('wTaskText').addEventListener('keydown',e=>{if(e.key==='Enter') saveWTask();});

  /* Heading / subtext autosave */
  $('ttHeading').addEventListener('blur',()=>api('/api/settings','POST',{heading:$('ttHeading').textContent.trim()}));
  $('ttSubtext').addEventListener('blur', ()=>api('/api/settings','POST',{subtext:$('ttSubtext').textContent.trim()}));

  /* Close menus on outside click */
  document.addEventListener('click',()=>{
    closeAllMenus('.row-menu'); closeAllMenus('.note-menu'); closeAllMenus('.weekly-task-menu');
    $('dotsMenu').classList.remove('open');
  });

  /* Close modals on overlay */
  $('rowModal').addEventListener('click',e=>{if(e.target===$('rowModal')) closeRowModal();});
  $('noteModal').addEventListener('click',e=>{if(e.target===$('noteModal')) closeNoteModal();});
}

function bindAmPm(toggleId){
  $(toggleId).querySelectorAll('.ampm-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      $(toggleId).querySelectorAll('.ampm-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    });
  });
}

function closeAllMenus(sel){
  document.querySelectorAll(sel+'.open').forEach(m=>m.classList.remove('open'));
}

/* Boot */
init();

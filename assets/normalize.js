const ENDPOINTS = {
  p01: 'https://n8n.trajectoire-freelance.fr/webhook/upload-cv',
  p2:  'https://n8n.trajectoire-freelance.fr/webhook/normalize-cv',
  p34: 'https://n8n.trajectoire-freelance.fr/webhook/normalize-P3'
};

const AREAS = { A:'Planifier', B:'Développer', C:'Gérer', D:'Exploiter', E:'Faciliter' };
const CONF_FR = { high:'Haute', medium:'Moyenne', low:'Faible' };

let currentArch = 'p34';
let _d = null;

// ── ARCH SELECTOR ──────────────────────────────────────────────────────────
function selectArch(btn, arch) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentArch = arch;
  document.getElementById('cvResult').style.display    = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  document.getElementById('statusMessage').innerText    = '';
  document.getElementById('statusMessage').className   = 'status-message';
}

// ── DOM REFS ───────────────────────────────────────────────────────────────
const uploadBtn       = document.getElementById('uploadBtn');
const fileInput       = document.getElementById('fileInput');
const fileLabel       = document.getElementById('fileLabel');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const statusMessage   = document.getElementById('statusMessage');
const loaderWrap      = document.getElementById('loaderWrap');
const loaderText      = document.getElementById('loaderText');

fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (!f) return;
  fileLabel.innerText       = 'Fichier sélectionné ✓';
  fileNameDisplay.innerText = f.name;
  statusMessage.innerText   = 'Prêt à analyser';
  statusMessage.className   = 'status-message info';
});

// ── UPLOAD ─────────────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if (!f) {
    statusMessage.innerText = "Sélectionne un fichier PDF d'abord";
    statusMessage.className = 'status-message error';
    return;
  }
  const form = new FormData();
  form.append('data', f);
  document.getElementById('cvResult').style.display    = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  loaderWrap.classList.add('active');
  uploadBtn.disabled = true;
  const steps = ['Extraction du texte...','Analyse des compétences...','Structuration du profil...','Finalisation...'];
  let i = 0;
  const iv = setInterval(() => { loaderText.innerText = steps[i++ % steps.length]; }, 1400);
  try {
    const res  = await fetch(ENDPOINTS[currentArch], { method:'POST', body:form });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (currentArch === 'p34') {
      renderP34(data);
    } else {
      document.querySelector('.simple-result pre').innerText = JSON.stringify(data, null, 2);
      document.getElementById('simpleResult').style.display = 'block';
    }
    statusMessage.innerText = 'Analyse terminée ✓';
    statusMessage.className = 'status-message success';
  } catch (e) {
    statusMessage.innerText = 'Erreur : ' + e.message;
    statusMessage.className = 'status-message error';
  } finally {
    clearInterval(iv);
    loaderWrap.classList.remove('active');
    uploadBtn.disabled = false;
  }
});

// ── P3/P4 ENTRY ────────────────────────────────────────────────────────────
function renderP34(raw) {
  _d = Array.isArray(raw) ? raw[0] : raw;
  const profiles = _d.profiles || [];
  // Profile selector
  document.getElementById('profileSelector').innerHTML = profiles.map((p, idx) => `
    <button class="prof-tab ${idx === 0 ? 'active' : ''}" onclick="selectProfile(${idx})">
      <span class="prof-rank">#${p.rank}</span>
      <span class="prof-title">${p.title}</span>
      <span class="prof-score score-${p.scores.confidence}">${p.scores.final.toFixed(1)}</span>
      <span class="prof-senior">${p.analysis.seniority.label}</span>
    </button>
  `).join('');
  renderProfile(profiles[0]);
  document.getElementById('cvResult').style.display = 'block';
  openFirstAcc();
}

function selectProfile(idx) {
  document.querySelectorAll('.prof-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  renderProfile(_d.profiles[idx]);
  openFirstAcc();
}

function openFirstAcc() {
  setTimeout(() => {
    const h = document.querySelector('.acc-header');
    if (h && !h.classList.contains('open')) toggleAcc(h);
  }, 30);
}

// ── PROFILE DETAIL ─────────────────────────────────────────────────────────
function renderProfile(p) {
  // Header
  document.getElementById('phTitle').innerText    = p.title;
  document.getElementById('phCode').innerText     = `Code CIGREF ${p.code}`;
  document.getElementById('phConf').innerText     = `Confiance ${CONF_FR[p.scores.confidence] || p.scores.confidence}`;
  document.getElementById('phSeniority').innerText= p.analysis.seniority.label;
  document.getElementById('phQuadrant').innerText = p.analysis.quadrant.label;
  document.getElementById('phQuadDesc').innerText = p.analysis.quadrant.description;
  document.getElementById('phDims').innerHTML = [
    { l:'D1 · CV',       v: p.scores.d1 },
    { l:'D2 · Pratique', v: p.scores.d2 },
    { l:'D3 · Notions',  v: p.scores.d3 }
  ].map(d => `
    <div class="dim-row">
      <span class="dim-lbl">${d.l}</span>
      <div class="mini-bar"><div class="mini-fill" style="width:${d.v}%"></div></div>
      <span class="dim-val">${d.v.toFixed(0)}</span>
    </div>
  `).join('');
  // Score circle
  const r = 42, c = 2 * Math.PI * r;
  const circle = document.getElementById('phCircle');
  circle.style.strokeDasharray  = c;
  circle.style.strokeDashoffset = c - (p.scores.final / 100) * c;
  document.getElementById('phCircleText').innerText = p.scores.final.toFixed(0);
  // Sections
  document.getElementById('secMission').innerHTML      = renderMission(p.mission, p.deliverables);
  document.getElementById('secActivities').innerHTML   = renderActivities(p.activities);
  document.getElementById('secCompetencies').innerHTML = renderCompetencies(p.competencies);
  document.getElementById('secNotions').innerHTML      = renderNotions(p.notions_transversales);
  // Close all accordions
  document.querySelectorAll('.acc-header').forEach(h => {
    h.classList.remove('open');
    h.nextElementSibling.style.display = 'none';
  });
}

// ── MISSION ────────────────────────────────────────────────────────────────
function renderMission(m, del) {
  return `
    <p class="sec-text">${m.description}</p>
    <div class="ms-row"><span>Score mission</span><strong>${m.score}%</strong></div>
    <div class="prog-bar"><div class="prog-fill" style="width:${m.score}%"></div></div>
    ${del?.items.length ? `
      <div class="mt-block">
        <div class="block-label">Livrables (${del.covered}/${del.total})</div>
        <ul class="item-list">${del.items.map(d => `<li>${d.title}</li>`).join('')}</ul>
      </div>` : ''}
  `;
}

// ── ACTIVITIES ─────────────────────────────────────────────────────────────
function renderActivities(act) {
  return act.items.map(a => `
    <div class="act-block">
      <div class="act-title">${a.title}</div>
      <ul class="item-list">${a.tasks.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
  `).join('');
}

// ── COMPETENCIES ───────────────────────────────────────────────────────────
function renderCompetencies(comp) {
  const by = { A:[], B:[], C:[], D:[], E:[] };
  comp.items.forEach(s => { const k = s.skill_id[0]; if (by[k]) by[k].push(s); });
  const first = Object.entries(by).find(([,v]) => v.length)?.[0] || 'A';
  return `
    <div class="comp-summary">
      ${comp.strong  ? `<span class="cbadge c-strong">✓ ${comp.strong} fort${comp.strong>1?'s':''}</span>` : ''}
      ${comp.weak    ? `<span class="cbadge c-weak">~ ${comp.weak} faible${comp.weak>1?'s':''}</span>` : ''}
      ${comp.missing ? `<span class="cbadge c-missing">✗ ${comp.missing} manquant${comp.missing>1?'s':''}</span>` : ''}
    </div>
    <div class="ctabs">
      ${Object.entries(AREAS).map(([code, name]) => `
        <button class="ctab${code===first?' active':''}" onclick="switchComp(this,'${code}')" data-area="${code}">
          ${name} <span class="ctab-n">${by[code].length}</span>
        </button>`).join('')}
    </div>
    ${Object.keys(AREAS).map(code => `
      <div class="cpanel" id="cp_${code}" ${code!==first?'style="display:none"':''}>
        ${by[code].length
          ? by[code].map(s => renderSkill(s)).join('')
          : '<p class="empty-state">Aucune compétence dans cette catégorie.</p>'}
      </div>`).join('')}
  `;
}

function switchComp(btn, code) {
  const wrap = btn.closest('.acc-body');
  wrap.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  wrap.querySelectorAll('.cpanel').forEach(p => p.style.display = 'none');
  document.getElementById('cp_' + code).style.display = 'block';
}

function renderSkill(s) {
  const M = { strong:{l:'Fort',c:'c-strong'}, adequate:{l:'Adéquat',c:'c-adequate'}, weak:{l:'Faible',c:'c-weak'}, missing:{l:'Manquant',c:'c-missing'} };
  const st = M[s.status] || M.weak;
  const cv = s.cv_estimated_level || 0;
  const ex = s.expected_level || 0;
  return `
    <div class="skill-card">
      <div class="sk-head" onclick="toggleSkill(this)">
        <span class="sk-code">${s.code}</span>
        <span class="sk-name">${s.title}</span>
        <span class="cbadge ${st.c} sk-st">${st.l}</span>
        <span class="sk-lv">Niv. CV ${cv||'—'} / Att. ${ex}</span>
        <span class="sk-chev">›</span>
      </div>
      <div class="sk-body" style="display:none">
        <div class="lv-cmp">
          <div class="lv-row">
            <span class="lv-lbl">Niveau CV</span>
            <div class="dots-row">${ldots(cv, ex, 5)}</div>
            <span class="lv-num">${cv||'—'}/5</span>
          </div>
          <div class="lv-row">
            <span class="lv-lbl">Attendu</span>
            <div class="dots-row">${ldots(ex, ex, 5, 'blue')}</div>
            <span class="lv-num">${ex}/5</span>
          </div>
        </div>
        ${s.cv_level_description ? `<p class="sk-desc">${s.cv_level_description}</p>` : ''}
        ${s.knowledge?.length ? `
          <div class="ka-blk"><div class="ka-lbl">Connaissances</div>
          <ul>${s.knowledge.map(k=>`<li>${k.description}</li>`).join('')}</ul></div>` : ''}
        ${s.abilities?.length ? `
          <div class="ka-blk"><div class="ka-lbl">Aptitudes</div>
          <ul>${s.abilities.map(a=>`<li>${a.description}</li>`).join('')}</ul></div>` : ''}
      </div>
    </div>
  `;
}

function ldots(filled, threshold, total, forceColor) {
  return Array.from({length:total}, (_,i) => {
    const cls = forceColor
      ? (i < filled ? `dot-${forceColor}` : 'dot-empty')
      : (i < filled ? 'dot-teal' : i < threshold ? 'dot-gap' : 'dot-empty');
    return `<span class="dot ${cls}"></span>`;
  }).join('');
}

function toggleSkill(head) {
  const body = head.nextElementSibling;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  head.querySelector('.sk-chev').style.transform = open ? '' : 'rotate(90deg)';
}

// ── NOTIONS TRANSVERSALES ──────────────────────────────────────────────────
function renderNotions(n) {
  return `
    <div class="notions-sum">
      <span class="cbadge c-strong">✓ ${n.matched} aligné${n.matched>1?'s':''}</span>
      <span class="cbadge c-missing">⚠ ${n.gaps} écart${n.gaps>1?'s':''}</span>
    </div>
    <div class="notions-list">
      ${n.items.map(x => `
        <div class="notion-row">
          <div class="notion-name">${x.label}</div>
          <div class="dots-row">${ndots(x.freelance_level, x.expected_level)}</div>
          <span class="notion-lv">${x.freelance_level}<span class="slash">/</span>${x.expected_level}</span>
          <span class="notion-badge ${x.status==='ok'?'n-ok':'n-gap'}">${x.status==='ok'?'✓':'⚠'}</span>
        </div>`).join('')}
    </div>
  `;
}

function ndots(freelance, expected) {
  return Array.from({length:5}, (_,i) => {
    const cls = i < freelance ? 'dot-teal' : i < expected ? 'dot-gap' : 'dot-empty';
    return `<span class="dot ${cls}"></span>`;
  }).join('');
}

// ── ACCORDION ──────────────────────────────────────────────────────────────
function toggleAcc(h) {
  const body = h.nextElementSibling;
  const open = h.classList.contains('open');
  document.querySelectorAll('.acc-header').forEach(x => {
    x.classList.remove('open');
    x.nextElementSibling.style.display = 'none';
  });
  if (!open) { h.classList.add('open'); body.style.display = 'block'; }
}

function toggleAccordion(h) { toggleAcc(h); }

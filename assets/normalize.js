const ENDPOINTS = {
  p01: 'https://n8n.trajectoire-freelance.fr/webhook/upload-cv',
  p2:  'https://n8n.trajectoire-freelance.fr/webhook/normalize-cv',
  p34: 'https://n8n.trajectoire-freelance.fr/webhook/normalize-P3'
};

const AREAS = { A:'Planifier', B:'Développer', C:'Gérer', D:'Exploiter', E:'Faciliter' };

let currentArch = 'p34';
let allProfiles = [];
let allNotions  = [];

/* ── ARCH SELECTOR ── */
function selectArch(btn, arch) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentArch = arch;
  document.getElementById('cvResult').style.display    = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  const sm = document.getElementById('statusMessage');
  sm.innerText = ''; sm.className = 'status-message';
}

/* ── DOM ELEMENTS ── */
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
  setStatus('Prêt à analyser', 'info');
});

uploadBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if (!f) { setStatus('Sélectionne un fichier PDF d\'abord', 'error'); return; }

  const fd = new FormData();
  fd.append('data', f);

  document.getElementById('cvResult').style.display    = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  loaderWrap.classList.add('active');
  uploadBtn.disabled = true;

  const steps = ['Extraction du texte…', 'Analyse des compétences…', 'Structuration du profil…', 'Finalisation…'];
  let si = 0;
  const iv = setInterval(() => { loaderText.innerText = steps[si++ % steps.length]; }, 1400);

  try {
    const res  = await fetch(ENDPOINTS[currentArch], { method: 'POST', body: fd });
    const txt  = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

    if (currentArch === 'p34') {
      renderP34(data);
    } else {
      document.querySelector('.simple-result pre').innerText = JSON.stringify(data, null, 2);
      document.getElementById('simpleResult').style.display = 'block';
    }
    setStatus('Analyse terminée ✓', 'success');
  } catch (e) {
    setStatus('Erreur : ' + e.message, 'error');
  } finally {
    clearInterval(iv);
    loaderWrap.classList.remove('active');
    uploadBtn.disabled = false;
  }
});

function setStatus(msg, cls) {
  statusMessage.innerText = msg;
  statusMessage.className = 'status-message ' + cls;
}

function qs(id) { return document.getElementById(id); }

/* ════════════════════════════════════════
   P3 / P4  RENDERING
   ════════════════════════════════════════ */

function renderP34(raw) {
  const root  = Array.isArray(raw) ? raw[0] : raw;
  allProfiles = root.profiles         || [];
  allNotions  = root.freelance_notions || [];

  if (!allProfiles.length) {
    setStatus('Aucun profil retourné par le webhook', 'error');
    return;
  }

  /* Profile selector tabs */
  qs('profileSelector').innerHTML = allProfiles.map((p, i) => `
    <button class="prof-tab${i === 0 ? ' active' : ''}" onclick="selectProfile(${i})">
      <div class="prof-tab-score">${p.score_final != null ? p.score_final : '—'}%</div>
      <div class="prof-tab-name">${p.profile_name || '—'}</div>
      <div class="prof-tab-meta">
        <span class="prof-tab-code">${p.profile_code || ''}</span>
        <span class="prof-tab-seniority">${p.seniority || ''}</span>
      </div>
    </button>
  `).join('');

  document.getElementById('cvResult').style.display = 'block';
  renderProfile(0);
  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));
}

function selectProfile(idx) {
  document.querySelectorAll('.prof-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  renderProfile(idx);
  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));
}

function renderProfile(idx) {
  const p = allProfiles[idx];
  if (!p) return;

  /* Badges & title */
  qs('phCode').innerText      = p.profile_code || '';
  qs('phSeniority').innerText = p.seniority    || '';
  qs('phConf').innerText      = confLabel(p.confidence);
  qs('phTitle').innerText     = p.profile_name || '';
  qs('phQuadDesc').innerText  = p.quadrant_description || p.context || '';

  /* Score circle */
  const score = p.score_final != null ? p.score_final : 0;
  const r = 50, circ = 2 * Math.PI * r;
  const circle = qs('phCircle');
  circle.style.strokeDasharray  = circ;
  circle.style.strokeDashoffset = circ * (1 - score / 100);
  qs('phCircleText').innerText  = score + '%';

  /* D1 / D2 / D3 dimension bars */
  const dims = [
    { l: 'D1', v: p.score_d1 != null ? p.score_d1 : p.d1 },
    { l: 'D2', v: p.score_d2 != null ? p.score_d2 : p.d2 },
    { l: 'D3', v: p.score_d3 != null ? p.score_d3 : p.d3 }
  ].filter(d => d.v != null);

  qs('phDims').innerHTML = dims.map((d, i) => `
    <div class="dim-row">
      <span class="dim-lbl">${d.l}</span>
      <div class="mini-bar"><div class="mini-fill fill-d${i + 1}" style="width:${d.v}%"></div></div>
      <span class="dim-val">${d.v}%</span>
    </div>
  `).join('');

  /* Section content */
  qs('secMission').innerHTML      = renderMission(p.mission);
  qs('secActivities').innerHTML   = renderActivities(p.activities     || []);
  qs('secCompetencies').innerHTML = renderCompetencies(p.competencies || []);
  qs('secNotions').innerHTML      = renderNotions(allNotions);
}

function confLabel(c) {
  const m = { high: '✓ Haute confiance', medium: '~ Confiance moyenne', low: '⚠ Faible confiance' };
  return m[c] || (c || '');
}

/* ── MISSION ── */
function renderMission(m) {
  if (!m) return '<p class="empty-state">Non disponible</p>';
  const score = m.score != null ? m.score : m.matching_score;
  const text  = m.text || m.description || m.summary || '';
  const dl    = m.deliverables || [];

  return [
    score != null ? `
      <div class="ms-score-row">
        <span class="ms-score-lbl">Score d'adéquation</span>
        <span class="ms-score-val">${score}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${score}%"></div></div>` : '',
    text ? `<p class="ms-text">${text}</p>` : '',
    dl.length ? `
      <div class="mt-block-label">Livrables</div>
      <ul class="item-list">${dl.map(d => `<li>${d}</li>`).join('')}</ul>` : ''
  ].join('');
}

/* ── ACTIVITIES ── */
function renderActivities(acts) {
  if (!acts.length) return '<p class="empty-state">Non disponible</p>';
  return acts.map(a => `
    <div class="act-block">
      <div class="act-title">${a.title || a.activity_title || a.activity || ''}</div>
      <ul class="item-list">${(a.tasks || []).map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
  `).join('');
}

/* ── COMPETENCIES ── */
function renderCompetencies(comps) {
  if (!comps.length) return '<p class="empty-state">Non disponible</p>';

  const groups = {};
  comps.forEach(c => {
    const key = ((c.area || c.code || '?')[0]).toUpperCase();
    (groups[key] = groups[key] || []).push(c);
  });
  const letters = Object.keys(groups).sort();
  const first   = letters[0];

  const summary = comps.map(c => {
    const g   = c.gap != null ? c.gap : (c.freelance_level - c.required_level);
    const cls = g >= 0 ? 'c-strong' : (g >= -1 ? 'c-adequate' : 'c-weak');
    return `<span class="cbadge ${cls}">${c.code || c.name}</span>`;
  }).join('');

  const tabs = letters.map(l => `
    <button class="ctab${l === first ? ' active' : ''}" onclick="switchComp(this,'${l}')">
      ${l} · ${AREAS[l] || l}
    </button>`).join('');

  const panels = letters.map(l => `
    <div class="cpanel${l === first ? ' active' : ''}" data-area="${l}">
      ${groups[l].map(renderSkill).join('')}
    </div>`).join('');

  return `
    <div class="comp-summary">${summary}</div>
    <div class="ctabs">${tabs}</div>
    <div class="cpanels">${panels}</div>
  `;
}

function switchComp(btn, letter) {
  const root = btn.closest('.acc-inner');
  root.querySelectorAll('.ctab').forEach(t  => t.classList.remove('active'));
  root.querySelectorAll('.cpanel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  root.querySelector(`.cpanel[data-area="${letter}"]`).classList.add('active');
}

function renderSkill(s) {
  const fl  = s.freelance_level ?? 0;
  const rl  = s.required_level  ?? 0;
  const g   = fl - rl;
  const cls = g >= 0 ? 'c-strong' : (g >= -1 ? 'c-adequate' : 'c-weak');
  const gtxt = g >= 0 ? `+${g}` : `${g}`;

  return `
    <div class="skill-card">
      <div class="sk-head" onclick="toggleSkill(this)">
        <div class="sk-info">
          <span class="sk-code">${s.code || ''}</span>
          <span class="sk-name">${s.name || s.skill_name || ''}</span>
        </div>
        <div class="sk-right">
          <div class="dots-row">${ldots(fl, rl, 5)}</div>
          <span class="cbadge ${cls}">${gtxt}</span>
          <span class="sk-chev">▾</span>
        </div>
      </div>
      <div class="sk-body">
        <div class="sk-body-inner">
          <div class="lv-row">
            <span class="lv-lbl">Niveau candidat</span>
            <div class="dots-row">${levelDots(fl, 5, 'dot-teal')}</div>
            <span class="lv-num">${fl}/5</span>
          </div>
          <div class="lv-row">
            <span class="lv-lbl">Niveau requis</span>
            <div class="dots-row">${levelDots(rl, 5, 'dot-blue')}</div>
            <span class="lv-num">${rl}/5</span>
          </div>
          ${s.description ? `<p class="sk-desc">${s.description}</p>` : ''}
          ${s.knowledge && s.knowledge.length ? `
            <div class="ka-section">
              <div class="ka-lbl">Savoirs</div>
              <ul class="item-list">${s.knowledge.map(k => `<li>${k}</li>`).join('')}</ul>
            </div>` : ''}
          ${s.abilities && s.abilities.length ? `
            <div class="ka-section">
              <div class="ka-lbl">Savoir-faire</div>
              <ul class="item-list">${s.abilities.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* Compact level dots — colour indicates gap vs ok */
function ldots(fl, rl, total) {
  const ok = fl >= rl;
  return Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i < fl ? (ok ? 'dot-teal' : 'dot-gap') : 'dot-empty'}"></span>`
  ).join('');
}

/* Full level dots with explicit colour class */
function levelDots(n, total, cls) {
  return Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i < n ? cls : 'dot-empty'}"></span>`
  ).join('');
}

function toggleSkill(head) { head.closest('.skill-card').classList.toggle('open'); }

/* ── NOTIONS TRANSVERSALES ── */
function renderNotions(notions) {
  if (!notions || !notions.length) return '<p class="empty-state">Non disponible</p>';
  return `<div class="notions-list">${notions.map(n => {
    const fl = n.freelance_level != null ? n.freelance_level : (n.freelance ?? 0);
    const el = n.expected_level  != null ? n.expected_level  : (n.expected  ?? 0);
    const ok = fl >= el;
    return `
      <div class="notion-row">
        <span class="notion-name">${n.notion_name || n.name || ''}</span>
        <div class="notion-stars-wrap">
          <div class="notion-stars-row">
            <span class="notion-stars-lbl">Candidat</span>
            ${nstars(fl, el, 5)}
            <span class="notion-lv">${fl}/5</span>
          </div>
          <div class="notion-stars-row">
            <span class="notion-stars-lbl">Attendu</span>
            ${nstars(el, el, 5)}
            <span class="notion-lv">${el}/5</span>
          </div>
        </div>
        <span class="notion-badge ${ok ? 'n-ok' : 'n-gap'}">${ok ? '✓' : '△'}</span>
      </div>`;
  }).join('')}</div>`;
}

/* Stars: teal = ok/met, orange = gap, grey = empty */
function nstars(filled, threshold, total) {
  return Array.from({ length: total }, (_, i) => {
    let cls;
    if (i < filled) cls = filled >= threshold ? 'star-filled' : 'star-gap';
    else cls = 'star-empty';
    return `<span class="star ${cls}">★</span>`;
  }).join('');
}

/* ── ACCORDION TOGGLE ── */
function toggleAcc(h) { h.closest('.accordion').classList.toggle('open'); }

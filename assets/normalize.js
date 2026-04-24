const ENDPOINTS = {
  p01: 'https://n8n.trajectoire-freelance.fr/webhook/upload-cv',
  p2:  'https://n8n.trajectoire-freelance.fr/webhook/normalize-cv',
  p34: 'https://n8n.trajectoire-freelance.fr/webhook/normalize-P3'
};

const AREAS = { A:'Planifier', B:'Développer', C:'Gérer', D:'Exploiter', E:'Faciliter' };

const TECH_COLORS = {
  langage:         { bg:'rgba(0,212,170,0.12)',  border:'rgba(0,212,170,0.35)',  text:'#00d4aa' },
  framework:       { bg:'rgba(61,90,254,0.12)',  border:'rgba(61,90,254,0.35)',  text:'#7c9dff' },
  base_de_données: { bg:'rgba(171,71,188,0.12)', border:'rgba(171,71,188,0.35)', text:'#ce93d8' },
  methodologie:    { bg:'rgba(255,152,0,0.12)',  border:'rgba(255,152,0,0.35)',  text:'#ffb74d' },
  outil:           { bg:'rgba(233,30,99,0.12)',  border:'rgba(233,30,99,0.35)',  text:'#f48fb1' },
  cloud:           { bg:'rgba(3,169,244,0.12)',  border:'rgba(3,169,244,0.35)',  text:'#81d4fa' }
};
const TECH_LABEL_FR = {
  langage:'Langages', framework:'Frameworks', base_de_données:'Bases de données',
  methodologie:'Méthodologies', outil:'Outils', cloud:'Cloud'
};

const LOAD_STEPS = [
  'Extraction du CV brut via MISTRAL…',
  'Analyse des métadonnées (nom, email, téléphone…)',
  'Identification de vos compétences…',
  'Analyse des compétences compatibles à votre CV…',
  'Scoring de vos compétences…',
  'Identification de votre métier…',
  'Analyse des métiers compatibles à votre CV…',
  'Scoring des métiers compatibles…',
  'Identification des notions transversales…',
  'Scoring global de votre CV…',
  'Analyse du gap compétences ↔ métiers…',
  'Finalisation…'
];

let currentArch  = 'p34';
let allProfiles  = [];
let allNotions   = [];
let allFreelance = null;

/* ── ARCH SELECTOR ── */
function selectArch(btn, arch) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentArch = arch;
  document.getElementById('cvResult').style.display      = 'none';
  document.getElementById('simpleResult').style.display  = 'none';
  const fc = document.getElementById('freelanceCard');
  const tn = document.getElementById('techNotionsSection');
  if (fc) fc.style.display = 'none';
  if (tn) tn.style.display = 'none';
  const sm = document.getElementById('statusMessage');
  sm.innerText = ''; sm.className = 'status-message';
}

/* ── DOM ── */
const uploadBtn       = document.getElementById('uploadBtn');
const fileInput       = document.getElementById('fileInput');
const fileLabel       = document.getElementById('fileLabel');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const statusMessage   = document.getElementById('statusMessage');
const loaderWrap      = document.getElementById('loaderWrap');
const loaderText      = document.getElementById('loaderText');
const loaderTimer     = document.getElementById('loaderTimer');

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

  /* Loading steps + timer */
  let stepIdx = 0, elapsed = 0;
  loaderText.innerText   = LOAD_STEPS[0];
  loaderTimer.innerText  = '0s';

  const stepIv  = setInterval(() => {
    if (stepIdx < LOAD_STEPS.length - 1) loaderText.innerText = LOAD_STEPS[++stepIdx];
  }, 5000);
  const timerIv = setInterval(() => {
    loaderTimer.innerText = (++elapsed) + 's';
  }, 1000);

  try {
    const res = await fetch(ENDPOINTS[currentArch], { method: 'POST', body: fd });
    const txt = await res.text();
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
    clearInterval(stepIv);
    clearInterval(timerIv);
    loaderWrap.classList.remove('active');
    uploadBtn.disabled = false;
  }
});

function setStatus(msg, cls) {
  statusMessage.innerText = msg;
  statusMessage.className = 'status-message ' + cls;
}

function qs(id) { return document.getElementById(id); }

/* ══════════════════════════════════
   P3 / P4
   ══════════════════════════════════ */

function renderP34(raw) {
  const root = Array.isArray(raw) ? raw[0] : raw;

  allProfiles  = root.profiles || root.profils || root.profile_list || [];
  allNotions   = root.freelance_notions || root.notions || [];
  allFreelance = root.freelance || null;

  if (!allProfiles.length) {
    setStatus('Aucun profil retourné par le webhook', 'error');
    return;
  }

  if (allFreelance) renderFreelanceCard(allFreelance);
  renderTechNotionsSection(allFreelance && allFreelance.tech_stack, allNotions);

  qs('profileSelector').innerHTML = allProfiles.map((p, i) => {
    const score = (p.scores && p.scores.final != null) ? p.scores.final : pval(p, ['score_final','final_score','score_global','matching_score','total_score']);
    const name  = p.title || pval(p, ['profile_name','name','nom_profil','profil','label','titre']);
    const code  = p.code  || pval(p, ['profile_code','code_profil','code_rome']) || '';
    const sen   = (p.analysis && p.analysis.seniority && p.analysis.seniority.label) || pval(p, ['seniority','seniority_level','niveau','level']) || '';
    const fit   = p.analysis && p.analysis.profile_fit_level;
    const fitHtml = fit ? `<div class="prof-tab-fit pfl-${fit.level || 0}">${fit.label || ('Fit ' + fit.level)}</div>` : '';
    return `
      <button class="prof-tab${i === 0 ? ' active' : ''}" onclick="selectProfile(${i})">
        <div class="prof-tab-score">${score != null ? score : '—'}%</div>
        <div class="prof-tab-name">${name || '—'}</div>
        <div class="prof-tab-meta">
          ${code ? `<span class="prof-tab-code">${code}</span>` : ''}
          ${sen  ? `<span class="prof-tab-sep">·</span><span class="prof-tab-seniority">${sen}</span>` : ''}
        </div>
        ${fitHtml}
      </button>`;
  }).join('');

  document.getElementById('cvResult').style.display = 'block';
  renderProfile(0);
  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));
}

/* Helper: get first non-null value from a list of possible field names */
function pval(obj, keys) {
  for (const k of keys) if (obj[k] != null) return obj[k];
  return null;
}

function selectProfile(idx) {
  document.querySelectorAll('.prof-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  renderProfile(idx);
  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));
}

function renderProfile(idx) {
  const p = allProfiles[idx];
  if (!p) return;

  const code  = p.code  || pval(p, ['profile_code','code_profil','code_rome']) || '';
  const sen   = (p.analysis && p.analysis.seniority && p.analysis.seniority.label) || pval(p, ['seniority','seniority_level','niveau','level']) || '';
  const conf  = (p.scores && p.scores.confidence) || pval(p, ['confidence','confiance','confidence_level']) || '';
  const name  = p.title || pval(p, ['profile_name','name','nom_profil','profil','label','titre']) || '';
  const desc  = (p.analysis && p.analysis.quadrant && p.analysis.quadrant.description) || pval(p, ['quadrant_description','context','description','contexte','resume']) || '';
  const score = (p.scores && p.scores.final != null ? p.scores.final : pval(p, ['score_final','final_score','score_global','matching_score','total_score'])) ?? 0;
  const d1    = (p.scores && p.scores.d1 != null) ? p.scores.d1 : pval(p, ['score_d1','d1','dim_1','dimension_1']);
  const d2    = (p.scores && p.scores.d2 != null) ? p.scores.d2 : pval(p, ['score_d2','d2','dim_2','dimension_2']);
  const d3    = (p.scores && p.scores.d3 != null) ? p.scores.d3 : pval(p, ['score_d3','d3','dim_3','dimension_3']);

  qs('phCode').innerText     = code;
  qs('phSeniority').innerText = sen;
  qs('phConf').innerText     = confLabel(conf);
  qs('phTitle').innerText    = name;
  qs('phQuadDesc').innerText = desc;

  /* Score circle */
  const r = 50, circ = 2 * Math.PI * r;
  const circle = qs('phCircle');
  circle.style.strokeDasharray  = circ;
  circle.style.strokeDashoffset = circ * (1 - score / 100);
  qs('phCircleText').innerText  = score + '%';

  /* D1 / D2 / D3 */
  const dims = [
    { l: 'D1', v: d1 },
    { l: 'D2', v: d2 },
    { l: 'D3', v: d3 }
  ].filter(d => d.v != null);

  qs('phDims').innerHTML = dims.map((d, i) => `
    <div class="dim-row">
      <span class="dim-lbl">${d.l}</span>
      <div class="mini-bar"><div class="mini-fill fill-d${i+1}" style="width:${d.v}%"></div></div>
      <span class="dim-val">${d.v}%</span>
    </div>`).join('');

  /* Gap direction + improvement potential */
  const gapDir   = (p.gap && p.gap.direction) || (p.analysis && p.analysis.gap && p.analysis.gap.direction) || '';
  const gapScore = (p.gap && p.gap.score != null) ? p.gap.score : ((p.analysis && p.analysis.gap && p.analysis.gap.score != null) ? p.analysis.gap.score : null);
  const improv   = (p.analysis && p.analysis.improvement && p.analysis.improvement.potential_final != null) ? p.analysis.improvement.potential_final : null;
  const gapEl    = qs('phGapRow');
  if (gapDir || improv != null) {
    const gapCls   = /positif|positive|fort/.test(gapDir) ? 'gap-positive' : /négatif|negatif|negative|faible/.test(gapDir) ? 'gap-negative' : 'gap-neutral';
    const gapBadge = gapDir ? `<span class="ph-gap-badge ${gapCls}">Gap : ${gapDir}${gapScore != null ? ' · ' + gapScore + '%' : ''}</span>` : '';
    const impBadge = improv != null ? `<span class="ph-improvement">Potentiel +${improv}%</span>` : '';
    gapEl.innerHTML = gapBadge + impBadge;
    gapEl.style.display = 'flex';
  } else {
    gapEl.innerHTML = '';
    gapEl.style.display = 'none';
  }

  qs('secMission').innerHTML      = renderMission(p.mission);
  qs('secActivities').innerHTML   = renderActivities((p.activities && p.activities.items) || (Array.isArray(p.activities) ? p.activities : []));
  qs('secCompetencies').innerHTML = renderCompetencies((p.competencies && p.competencies.items) || (Array.isArray(p.competencies) ? p.competencies : []));
  qs('secNotions').innerHTML      = renderNotions((p.notions_transversales && p.notions_transversales.items) || []);
}

/* ── FREELANCE IDENTITY CARD ── */
function renderFreelanceCard(fl) {
  const name  = fl.name || '';
  const title = fl.current_title || fl.title || '';
  const email = fl.email || '';
  const phone = fl.phone || '';
  const city  = fl.city || '';
  const photo = fl.photo_base64 || '';
  const sen   = fl.seniority || {};

  const photoHtml = photo
    ? `<img src="${photo.startsWith('data:') ? photo : 'data:image/jpeg;base64,' + photo}" alt="" />`
    : `<div class="fl-photo-placeholder">${name ? name.charAt(0).toUpperCase() : '?'}</div>`;

  const badges = [
    fl.is_freelance !== false ? '<span class="fl-badge fl-badge-freelance">Freelance</span>' : '',
    fl.remote_work     ? '<span class="fl-badge fl-badge-remote">Télétravail</span>'   : '',
    fl.mobility        ? '<span class="fl-badge fl-badge-mobility">Mobilité</span>'    : '',
    fl.driving_license ? '<span class="fl-badge fl-badge-license">Permis B</span>'     : ''
  ].filter(Boolean).join('');

  const metaItems = [
    email ? `<span class="fl-meta-item">✉ ${email}</span>` : '',
    phone ? `<span class="fl-meta-item">☎ ${phone}</span>` : '',
    city  ? `<span class="fl-meta-item">📍 ${city}</span>`  : ''
  ].filter(Boolean).join('');

  const senHtml = (sen.label || sen.years != null || sen.score != null) ? `
    <div class="fl-seniority">
      ${sen.label ? `<div class="fl-sen-label">${sen.label}</div>` : ''}
      <div class="fl-sen-meta">
        ${sen.years != null ? `<span class="fl-sen-years">${sen.years} ans exp.</span>` : ''}
        ${sen.score != null ? `<span class="fl-sen-score">${Math.round(sen.score * 100)}%</span>` : ''}
      </div>
    </div>` : '';

  const el = qs('freelanceCard');
  el.innerHTML = `
    <div class="card fl-card">
      <div class="fl-photo-wrap">${photoHtml}</div>
      <div class="fl-info">
        ${name  ? `<div class="fl-name">${name}</div>`   : ''}
        ${title ? `<div class="fl-title">${title}</div>` : ''}
        ${metaItems ? `<div class="fl-meta">${metaItems}</div>`   : ''}
        ${badges    ? `<div class="fl-badges">${badges}</div>`    : ''}
      </div>
      ${senHtml}
    </div>`;
  el.style.display = '';
}

/* ── TECH STACK + GLOBAL NOTIONS ── */
function renderTechNotionsSection(tech, notions) {
  const hasTech    = tech && typeof tech === 'object' && Object.values(tech).some(v => Array.isArray(v) && v.length);
  const hasNotions = notions && notions.length;
  if (!hasTech && !hasNotions) return;

  const el = qs('techNotionsSection');
  el.innerHTML = `
    <div class="card tn-col">
      <div class="tn-title">Stack Technique</div>
      ${hasTech ? renderTechStack(tech) : '<p class="empty-state">Non disponible</p>'}
    </div>
    <div class="card tn-col">
      <div class="tn-title">Notions Transversales</div>
      ${hasNotions ? renderNotions(notions) : '<p class="empty-state">Non disponible</p>'}
    </div>`;
  el.style.display = 'flex';
}

function renderTechStack(tech) {
  const keys = Object.keys(tech).filter(k => Array.isArray(tech[k]) && tech[k].length);
  return keys.map(key => {
    const c = TECH_COLORS[key] || { bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.2)', text:'rgba(255,255,255,0.72)' };
    const pills = tech[key].map(item => {
      const nm    = typeof item === 'string' ? item : (item.name || item.label || String(item));
      const level = typeof item === 'object' ? (item.level ?? item.proficiency ?? null) : null;
      const opa   = level != null ? Math.max(0.45, level / 5) : 1;
      const tip   = level != null ? `${nm} · ${level}/5` : nm;
      return `<span class="tech-pill" style="--tc-bg:${c.bg};--tc-border:${c.border};--tc-text:${c.text};opacity:${opa}" title="${tip}">${nm}</span>`;
    }).join('');
    return `
      <div class="tech-group">
        <div class="tech-group-label">${TECH_LABEL_FR[key] || key}</div>
        <div class="tech-pills">${pills}</div>
      </div>`;
  }).join('');
}

function confLabel(c) {
  return { high:'✓ Haute confiance', medium:'~ Confiance moyenne', low:'⚠ Faible confiance' }[c] || (c || '');
}

/* ── MISSION ── */
function renderMission(m) {
  if (!m) return '<p class="empty-state">Non disponible</p>';
  const score = pval(m, ['score','matching_score','score_mission']);
  const text  = m.text || m.description || m.summary || m.contexte || '';
  const dl    = m.deliverables || m.livrables || [];

  return [
    score != null ? `
      <div class="ms-score-row">
        <span class="ms-score-lbl">Score d'adéquation</span>
        <span class="ms-score-val">${score}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${score}%"></div></div>` : '',
    text  ? `<p class="ms-text">${text}</p>` : '',
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
      <div class="act-title">${a.title || a.activity_title || a.activity || a.nom || ''}</div>
      <ul class="item-list">${(a.tasks || a.taches || []).map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`).join('');
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
    const fl  = c.cv_estimated_level ?? c.freelance_level ?? 0;
    const rl  = c.expected_level ?? c.required_level ?? 0;
    const g   = fl - rl;
    const cls = c.status === 'strong' ? 'c-strong' : c.status === 'adequate' ? 'c-adequate' : c.status === 'missing' ? 'c-weak' : (g >= 0 ? 'c-strong' : (g >= -1 ? 'c-adequate' : 'c-weak'));
    return `<span class="cbadge ${cls}">${c.code || c.title || c.name}</span>`;
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
    <div class="cpanels">${panels}</div>`;
}

function switchComp(btn, letter) {
  const root = btn.closest('.acc-inner');
  root.querySelectorAll('.ctab').forEach(t  => t.classList.remove('active'));
  root.querySelectorAll('.cpanel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  root.querySelector(`.cpanel[data-area="${letter}"]`).classList.add('active');
}

function renderSkill(s) {
  const fl  = s.cv_estimated_level ?? s.freelance_level ?? 0;
  const rl  = s.expected_level ?? s.required_level ?? 0;
  const g   = fl - rl;
  const cls = g >= 0 ? 'c-strong' : (g >= -1 ? 'c-adequate' : 'c-weak');
  const gtxt = g >= 0 ? `+${g}` : `${g}`;
  const skillName = s.title || s.name || s.skill_name || '';
  const skillDesc = s.skill_description || s.description || '';
  const knowledge = (s.knowledge || []).map(k => typeof k === 'object' ? k.description : k).filter(Boolean);
  const abilities = (s.abilities || []).map(a => typeof a === 'object' ? a.description : a).filter(Boolean);

  return `
    <div class="skill-card">
      <div class="sk-head" onclick="toggleSkill(this)">
        <div class="sk-info">
          <span class="sk-code">${s.code || ''}</span>
          <span class="sk-name">${skillName}</span>
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
            <span class="lv-lbl">Candidat</span>
            <div class="dots-row">${levelDots(fl, 5, 'dot-teal')}</div>
            <span class="lv-num">${fl}/5</span>
          </div>
          <div class="lv-row">
            <span class="lv-lbl">Requis</span>
            <div class="dots-row">${levelDots(rl, 5, 'dot-blue')}</div>
            <span class="lv-num">${rl}/5</span>
          </div>
          ${skillDesc ? `<p class="sk-desc">${skillDesc}</p>` : ''}
          ${knowledge.length ? `
            <div class="ka-section">
              <div class="ka-lbl">Savoirs</div>
              <ul class="item-list">${knowledge.map(k => `<li>${k}</li>`).join('')}</ul>
            </div>` : ''}
          ${abilities.length ? `
            <div class="ka-section">
              <div class="ka-lbl">Savoir-faire</div>
              <ul class="item-list">${abilities.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

function ldots(fl, rl, total) {
  const ok = fl >= rl;
  return Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i < fl ? (ok ? 'dot-teal' : 'dot-gap') : 'dot-empty'}"></span>`
  ).join('');
}

function levelDots(n, total, cls) {
  return Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i < n ? cls : 'dot-empty'}"></span>`
  ).join('');
}

function toggleSkill(head) { head.closest('.skill-card').classList.toggle('open'); }

/* ── NOTIONS ── */
function renderNotions(notions) {
  if (!notions || !notions.length) return '<p class="empty-state">Non disponible</p>';
  return `<div class="notions-list">${notions.map(n => {
    const fl = n.freelance_level ?? n.freelance ?? 0;
    const el = n.expected_level  ?? n.expected  ?? 0;
    const ok = fl >= el;
    return `
      <div class="notion-row">
        <span class="notion-name">${n.label || n.notion_name || n.name || ''}</span>
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

function nstars(filled, threshold, total) {
  return Array.from({ length: total }, (_, i) => {
    const cls = i < filled ? (filled >= threshold ? 'star-filled' : 'star-gap') : 'star-empty';
    return `<span class="star ${cls}">★</span>`;
  }).join('');
}

/* ── ACCORDION ── */
function toggleAcc(h) { h.closest('.accordion').classList.toggle('open'); }

const ENDPOINTS = {
  p01: 'https://n8n.trajectoire-freelance.fr/webhook/upload-cv',
  p2:  'https://n8n.trajectoire-freelance.fr/webhook/normalize-cv',
  p34: 'https://n8n.trajectoire-freelance.fr/webhook/normalize-P3'
};

let currentArch = 'p34';

function selectArch(btn, arch) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentArch = arch;
  document.getElementById('cvResult').style.display = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  document.getElementById('statusMessage').innerText = '';
  document.getElementById('statusMessage').className = 'status-message';
}

const uploadBtn       = document.getElementById('uploadBtn');
const fileInput       = document.getElementById('fileInput');
const fileLabel       = document.getElementById('fileLabel');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const statusMessage   = document.getElementById('statusMessage');
const loaderWrap      = document.getElementById('loaderWrap');
const loaderText      = document.getElementById('loaderText');

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileLabel.innerText = 'Fichier sélectionné ✓';
  fileNameDisplay.innerText = file.name;
  statusMessage.innerText = 'Prêt à analyser';
  statusMessage.className = 'status-message info';
});

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    statusMessage.innerText = "Sélectionne un fichier PDF d'abord";
    statusMessage.className = 'status-message error';
    return;
  }

  const formData = new FormData();
  formData.append('data', file);

  document.getElementById('cvResult').style.display = 'none';
  document.getElementById('simpleResult').style.display = 'none';
  loaderWrap.classList.add('active');
  uploadBtn.disabled = true;

  const steps = [
    'Extraction du texte...',
    'Analyse des compétences...',
    'Structuration du profil...',
    'Finalisation...'
  ];
  let i = 0;
  const interval = setInterval(() => {
    loaderText.innerText = steps[i % steps.length];
    i++;
  }, 1400);

  try {
    const res = await fetch(ENDPOINTS[currentArch], { method: 'POST', body: formData });

    let data;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (currentArch === 'p34' && data.display) {
      renderFull(data);
      document.getElementById('cvResult').style.display = 'grid';
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
    clearInterval(interval);
    loaderWrap.classList.remove('active');
    uploadBtn.disabled = false;
  }
});

function renderFull(data) {
  const d = data.display;

  document.getElementById('cv-name').innerText  = d.identity?.full_name || '';
  document.getElementById('cv-title').innerText = d.identity?.current_title || '';
  document.getElementById('cv-score').innerText = (d.score ?? '—') + '/10';
  document.getElementById('cv-confidence').innerText = (d.confidence_score ?? '—') + '%';

  const score = d.score || 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const circle = document.getElementById('scoreProgress');
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - (score / 10) * circumference;
  document.getElementById('scoreCircleText').innerText = score + '/10';

  const contact = d.contact || {};
  document.getElementById('cv-contact').innerHTML = [
    contact.email     ? `<div>📧 ${contact.email}</div>`     : '',
    contact.phone     ? `<div>📱 ${contact.phone}</div>`     : '',
    contact.linkedin  ? `<div>🔗 ${contact.linkedin}</div>`  : '',
    contact.portfolio ? `<div>🌐 ${contact.portfolio}</div>` : ''
  ].join('');

  const profile = d.main_profile;
  document.getElementById('cv-mainProfile').innerHTML = profile ? `
    <div class="profile-card">
      <strong>${profile.profile_name}</strong>
      <span class="confidence ${profile.confidence}">${profile.confidence}</span>
    </div>
    <p>${profile.justification}</p>
  ` : '<p class="empty-state">Non disponible</p>';

  const skills = (d.all_skills || [])
    .sort((a, b) => {
      const wA = a.estimated_level + (a.category === 'methodology' ? 0.5 : 0);
      const wB = b.estimated_level + (b.category === 'methodology' ? 0.5 : 0);
      return wB - wA;
    })
    .slice(0, 8);

  document.getElementById('cv-skills').innerHTML = skills.map(s => `
    <div class="skill">
      <span>${s.skill_name}</span>
      <span>${s.estimated_level}/5</span>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${s.estimated_level * 20}%"></div></div>
  `).join('');

  document.getElementById('cv-keywords').innerHTML = (d.highlight_keywords || [])
    .map(k => `<span class="keyword">${k}</span>`).join('');

  document.getElementById('cv-experiences').innerHTML = (d.experiences || []).map(exp => `
    <div class="exp-card">
      <div class="exp-title">${exp.title}</div>
      <div class="exp-company">${exp.company || ''}</div>
      <p>${exp.context}</p>
    </div>
  `).join('');

  document.getElementById('cv-languages').innerHTML = (d.languages || [])
    .map(l => `<div>${l.language} ${l.level || ''}</div>`).join('');
}

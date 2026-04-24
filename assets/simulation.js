'use strict';

const RATES = {
  INITIAL: {
    paris:    { mu: 15, mv: 5 },
    province: { mu:  9, mv: 3 }
  },
  PREMIUM: {
    paris:    { mu: 15, mv: 0 },
    province: { mu: 10, mv: 0 }
  },
  ELITE: {
    paris:    { mu: 13, mv: 0 },
    province: { mu:  8, mv: 0 }
  }
};

let curLabel  = 'INITIAL';
let curRegion = 'paris';

const el = id => document.getElementById(id);
const gn = id => parseFloat(el(id).value) || 0;
const gs = id => (el(id).value || '').trim();

function fmtMoney(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtPct(p) {
  const rounded = Math.round(p * 100) / 100;
  return rounded + ' %';
}

function setRegion(r) {
  curRegion = r;
  el('btn-paris').classList.toggle('active', r === 'paris');
  el('btn-province').classList.toggle('active', r === 'province');
  applyDefaults();
  render();
}

function applyDefaults() {
  const d = RATES[curLabel][curRegion];
  el('f-mu').value = d.mu;
  el('f-mv').value = d.mv;

  const hasParrain = curLabel !== 'INITIAL';
  const pp = el('f-pp');
  pp.disabled = !hasParrain;
  pp.value    = hasParrain ? 1 : 0;
  el('parrain-note').style.opacity = hasParrain ? '1' : '0.4';
  el('f-name-pp').disabled = !hasParrain;
}

function resetSim() {
  el('f-titre').value  = 'Mission développeur fullstack .NET/Angular';
  el('f-prenom').value = 'Jean';
  el('f-nom').value    = 'DUPONT';
  document.querySelector('input[name="trust"][value="INITIAL"]').checked = true;
  curLabel  = 'INITIAL';
  curRegion = 'paris';
  el('btn-paris').classList.add('active');
  el('btn-province').classList.remove('active');
  el('f-tj').value = 500;
  el('f-pc').value = 1;
  el('f-pe').value = 1;
  el('f-pa').value = 1;
  el('f-name-pc').value = 'URBIZ CLUB';
  el('f-name-pe').value = 'URBIZ CLUB';
  el('f-name-pp').value = 'URBIZ CLUB';
  el('f-name-pa').value = 'URBIZ CLUB';
  applyDefaults();
  render();
}

function scRow(title, name, amt, pct, isNA) {
  if (isNA) {
    return `
    <div class="fiche-sc-row fiche-sc-row--na">
      <div class="fiche-sc-r-left">
        <span class="fiche-sc-r-title">${title}</span>
        <span class="fiche-sc-r-name">—</span>
      </div>
      <div class="fiche-sc-r-dots"></div>
      <div class="fiche-sc-r-right">
        <span class="fiche-sc-r-amt">—</span>
      </div>
    </div>`;
  }
  return `
    <div class="fiche-sc-row">
      <div class="fiche-sc-r-left">
        <span class="fiche-sc-r-title">${title}</span>
        <span class="fiche-sc-r-name">${name}</span>
      </div>
      <div class="fiche-sc-r-dots"></div>
      <div class="fiche-sc-r-right">
        <span class="fiche-sc-r-amt">${fmtMoney(amt)}</span>
        <span class="fiche-sc-r-pct">(${fmtPct(pct)})</span>
      </div>
    </div>`;
}

function render() {
  const titre    = gs('f-titre') || 'Mission';
  const prenom   = gs('f-prenom') || 'Membre';
  const nom      = gs('f-nom');
  const fullName = (prenom + ' ' + nom).trim().toUpperCase();

  const tj = gn('f-tj');
  const mu = gn('f-mu');
  const mv = gn('f-mv');
  const pc = gn('f-pc');
  const pe = gn('f-pe');
  const pp = gn('f-pp');
  const pa = gn('f-pa');

  const nameC = gs('f-name-pc') || 'URBIZ CLUB';
  const nameE = gs('f-name-pe') || 'URBIZ CLUB';
  const nameP = gs('f-name-pp') || 'URBIZ CLUB';
  const nameA = gs('f-name-pa') || 'URBIZ CLUB';

  const totalMu    = mu + mv;
  const tjClient   = tj * (1 + totalMu / 100);
  const amtMuU     = tj * mu / 100;
  const amtMuV     = tj * mv / 100;

  const amtC       = tj * pc / 100;
  const amtE       = tj * pe / 100;
  const amtP       = tj * pp / 100;
  const amtA       = tj * pa / 100;
  const totalSCPct = pc + pe + pp + pa;
  const totalSC    = amtC + amtE + amtP + amtA;
  const tjNet      = tj - totalSC;

  el('out-total-mu').textContent = fmtPct(totalMu);
  el('out-total-sc').textContent = fmtPct(totalSCPct);

  const hasParrain = curLabel !== 'INITIAL';
  const labelLc    = curLabel.toLowerCase();

  const trustClass = { INITIAL: 'ftp-initial', PREMIUM: 'ftp-premium', ELITE: 'ftp-elite' }[curLabel];
  const trustIcon  = { INITIAL: '◎', PREMIUM: '★', ELITE: '◆' }[curLabel];

  const varBlock = mv > 0 ? `
      <div class="fiche-box-var">
        <span class="fiche-box-var-amt">${fmtMoney(amtMuV)}</span>
        <span class="fiche-box-var-sub">${fmtPct(mv)} réservé pour le variable</span>
      </div>` : '';

  const urbizBoxClass = mv > 0 ? 'fiche-box-urbiz fiche-box-urbiz--has-var' : 'fiche-box-urbiz';

  el('sim-fiche').innerHTML = `
<div class="fiche fiche--${labelLc}">

  <div class="fiche-head">
    <div class="fiche-title">${titre}</div>
    <div class="fiche-subtitle">Répartition de la rémunération par acteur impliqué (hors taxe)</div>
  </div>

  <div class="fiche-client-row">
    <span class="fiche-client-lbl">TJ FACTURÉ AU CLIENT&nbsp;:</span>
    <span class="fiche-client-val">${fmtMoney(tjClient)}</span>
  </div>

  <div class="fiche-markup-section">
    <div class="fiche-ms-desc">
      <div class="fiche-mu-tag">Markup URBIZ <span class="fiche-mu-pct">(+${fmtPct(totalMu)} du TJ)</span></div>
      <div class="fiche-mu-logo">
        <div class="fiche-mu-logo-icon">⊙</div>
        <span class="fiche-mu-logo-text">URBIZ</span>
      </div>
      <div class="fiche-mu-note">(Porteur commercial, tiers de facturation et de confiance, sourcing et suivi de mission)</div>
    </div>
    <div class="fiche-ms-boxes">
      <div class="${urbizBoxClass}">${fmtMoney(amtMuU)}</div>
      ${varBlock}
    </div>
  </div>

  <div class="fiche-tj-bar">
    <span class="fiche-tj-bar-label">TJ FACTURÉ À URBIZ</span>
    <span class="fiche-tj-bar-val">${tj.toLocaleString('fr-FR')}&nbsp;€</span>
  </div>

  <div class="fiche-service-club">
    <div class="fiche-sc-header">
      <div class="fiche-sc-logo">
        <div class="fiche-sc-logo-icon">⊙</div>
        <span class="fiche-sc-logo-text">Club URBIZ · Service TripleOne+</span>
      </div>
      <div class="fiche-sc-badge">−${fmtPct(totalSCPct)} du TJ</div>
    </div>
    <div class="fiche-sc-rows">
      ${scRow('Commissionnaire', nameC, amtC, pc, false)}
      ${scRow('Entremetteur',    nameE, amtE, pe, false)}
      ${hasParrain
        ? scRow('Parrain',       nameP, amtP, pp, false)
        : scRow('Parrain',       '—',   0,    0,  true)}
      ${scRow('Ambassadeur',     nameA, amtA, pa, false)}
    </div>
    <div class="fiche-sc-total">
      <span class="fiche-sc-total-lbl">Total service</span>
      <span class="fiche-sc-total-amt">${fmtMoney(totalSC)} <span class="fiche-sc-total-pct">(${fmtPct(totalSCPct)})</span></span>
    </div>
  </div>

  <div class="fiche-bottom">
    <div class="fiche-b-left">
      <div class="fiche-member-name">${fullName}</div>
      <div class="fiche-trust-pill ${trustClass}">
        <div class="fiche-trust-pill-dot">${trustIcon}</div>
        <span class="fiche-trust-pill-label">Membre&nbsp;<strong>${curLabel}</strong></span>
      </div>
    </div>
    <div class="fiche-net-box">
      <div class="fiche-net-amt">${fmtMoney(tjNet)}</div>
      <div class="fiche-net-lbl">TJ final perçu</div>
      <div class="fiche-net-sub">après compensation</div>
    </div>
  </div>

  <div class="fiche-foot">
    ${fmtMoney(tjNet)} est la rémunération nette par jour facturée par le Membre pour la mission qui lui a été confiée.
  </div>

</div>`;
}

document.querySelectorAll('input[name="trust"]').forEach(radio => {
  radio.addEventListener('change', function () {
    curLabel = this.value;
    applyDefaults();
    render();
  });
});

['f-titre', 'f-prenom', 'f-nom', 'f-tj', 'f-mu', 'f-mv',
 'f-pc', 'f-pe', 'f-pp', 'f-pa',
 'f-name-pc', 'f-name-pe', 'f-name-pp', 'f-name-pa'].forEach(id => {
  el(id).addEventListener('input', render);
});

applyDefaults();
render();

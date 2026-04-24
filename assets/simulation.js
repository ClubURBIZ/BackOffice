'use strict';

/* ── Taux par défaut : [label][région] ──
   mu  = part URBIZ du markup (%)
   mv  = variable provisionné (%)
   Total markup facturé client = mu + mv
*/
const RATES = {
  INITIAL: {
    paris:    { mu: 15, mv: 5 },
    province: { mu:  12, mv: 3 }
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

/* ── Utilitaires ── */
const el  = id => document.getElementById(id);
const gn  = id => parseFloat(el(id).value) || 0;
const gs  = id => (el(id).value || '').trim();

function fmtMoney(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtPct(p) {
  const rounded = Math.round(p * 100) / 100;
  return rounded + ' %';
}

/* ── Bascule région ── */
function setRegion(r) {
  curRegion = r;
  el('btn-paris').classList.toggle('active', r === 'paris');
  el('btn-province').classList.toggle('active', r === 'province');
  applyDefaults();
  render();
}

/* ── Applique les valeurs par défaut selon label + région ── */
function applyDefaults() {
  const d = RATES[curLabel][curRegion];
  el('f-mu').value = d.mu;
  el('f-mv').value = d.mv;

  const hasParrain = curLabel !== 'INITIAL';
  const pp = el('f-pp');
  pp.disabled = !hasParrain;
  pp.value    = hasParrain ? 1 : 0;
  el('parrain-note').style.opacity = hasParrain ? '1' : '0.4';
}

/* ── Réinitialisation complète ── */
function resetSim() {
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
  applyDefaults();
  render();
}

/* ── Génération d'une ligne de rôle ── */
function roleRow(title, name, amt, pct, isNA) {
  const naClass  = isNA ? ' fiche-rl-na' : '';
  const boxClass = isNA ? ' fiche-rb-na' : '';
  return `
    <div class="fiche-role-row${naClass}">
      <div class="fiche-rl-labels">
        <span class="fiche-rl-title">${title}</span>
        <span class="fiche-rl-name">${name}</span>
      </div>
      <div class="fiche-role-dots"></div>
      <div class="fiche-role-dot"></div>
      <div class="fiche-rb${boxClass}">
        ${fmtMoney(amt)}<span class="fiche-rb-pct">(${fmtPct(pct)})</span>
      </div>
    </div>`;
}

/* ── Rendu principal ── */
function render() {
  const prenom = gs('f-prenom') || 'Membre';
  const nom    = gs('f-nom');
  const fullName = (prenom + ' ' + nom).trim().toUpperCase();

  const tj = gn('f-tj');
  const mu = gn('f-mu');   /* % URBIZ */
  const mv = gn('f-mv');   /* % variable */
  const pc = gn('f-pc');   /* % Commissionnaire */
  const pe = gn('f-pe');   /* % Entremetteur */
  const pp = gn('f-pp');   /* % Parrain */
  const pa = gn('f-pa');   /* % Ambassadeur */

  const totalMu = mu + mv;

  /* TJ facturé au client */
  const tjClient = tj * (1 + totalMu / 100);

  /* Montants URBIZ */
  const amtMuU = tj * mu / 100;
  const amtMuV = tj * mv / 100;

  /* Service Club */
  const amtC = tj * pc / 100;
  const amtE = tj * pe / 100;
  const amtP = tj * pp / 100;
  const amtA = tj * pa / 100;
  const totalSCPct = pc + pe + pp + pa;
  const totalSC    = amtC + amtE + amtP + amtA;

  /* TJ Net In the Pocket */
  const tjNet = tj - totalSC;

  /* Mise à jour des totaux dans le panneau config */
  el('out-total-mu').textContent = fmtPct(totalMu);
  el('out-total-sc').textContent = fmtPct(totalSCPct);

  const hasParrain = curLabel !== 'INITIAL';

  /* Badge de confiance dans la fiche */
  const trustClass = { INITIAL: 'ftp-initial', PREMIUM: 'ftp-premium', ELITE: 'ftp-elite' }[curLabel];
  const trustIcon  = { INITIAL: '◎', PREMIUM: '★', ELITE: '◆' }[curLabel];

  /* Bloc variable (affiché seulement si mv > 0) */
  const varBlock = mv > 0 ? `
      <div class="fiche-box-var">
        <span class="fiche-box-var-amt">${fmtMoney(amtMuV)}</span>
        <span class="fiche-box-var-sub">${fmtPct(mv)} réservé pour le variable</span>
      </div>` : '';

  const urbizBoxClass = mv > 0 ? 'fiche-box-urbiz fiche-box-urbiz--has-var' : 'fiche-box-urbiz';

  /* Construction du HTML de la fiche */
  el('sim-fiche').innerHTML = `
<div class="fiche">

  <div class="fiche-head">
    <div class="fiche-title">MISSION ${fullName}</div>
    <div class="fiche-subtitle">Répartition de la rémunération par acteur impliqué (hors taxe)</div>
  </div>

  <div class="fiche-client-row">
    <span class="fiche-client-lbl">TJ FACTURÉ AU CLIENT&nbsp;:</span>
    <span class="fiche-client-val">${fmtMoney(tjClient)}</span>
  </div>

  <div class="fiche-markup-section">
    <div class="fiche-ms-desc">
      <div class="fiche-mu-tag">Markup (+${fmtPct(totalMu)} du TJ BRUT)</div>
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

  <div class="fiche-sep">
    <div class="fiche-sep-left"></div>
    <div class="fiche-sep-right">
      <div class="fiche-plus-circle">+</div>
      <div class="fiche-tj-brut-tag">TJ BRUT&nbsp;: ${tj.toLocaleString('fr-FR')}&nbsp;€</div>
    </div>
  </div>

  <div class="fiche-roles">
    ${roleRow('Commissionnaire', 'URBIZ CLUB', amtC, pc, false)}
    ${roleRow('Entremetteur',    'URBIZ CLUB', amtE, pe, false)}
    ${hasParrain
      ? roleRow('Parrain', 'URBIZ CLUB', amtP, pp, false)
      : roleRow('Parrain', '—', 0, 0, true)}
    ${roleRow('Ambassadeur', 'URBIZ CLUB', amtA, pa, false)}
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
      <div class="fiche-net-lbl">TJ Net In the Pocket</div>
    </div>
  </div>

  <div class="fiche-foot">
    ${fmtMoney(tjNet)} est la rémunération nette par jour facturée par le Membre pour la mission qui lui a été confiée.
  </div>

</div>`;
}

/* ── Événements ── */
document.querySelectorAll('input[name="trust"]').forEach(radio => {
  radio.addEventListener('change', function () {
    curLabel = this.value;
    applyDefaults();
    render();
  });
});

['f-prenom', 'f-nom', 'f-tj', 'f-mu', 'f-mv', 'f-pc', 'f-pe', 'f-pp', 'f-pa'].forEach(id => {
  el(id).addEventListener('input', render);
});

/* ── Initialisation ── */
applyDefaults();
render();

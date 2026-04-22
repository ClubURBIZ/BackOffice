const BDD_URL = 'https://n8n.trajectoire-freelance.fr/webhook/update';

async function runBDD(action) {
  const resultDiv = document.getElementById('bddResult');
  const buttons   = document.querySelectorAll('.action-btn');

  resultDiv.style.display = 'block';
  resultDiv.className = 'result-message info';
  resultDiv.innerText = 'Exécution en cours…';
  buttons.forEach(b => b.disabled = true);

  try {
    const res  = await fetch(`${BDD_URL}?action=${action}`);
    const data = await res.json();
    resultDiv.className = 'result-message success';
    resultDiv.innerText = data.message || 'Opération terminée avec succès.';
  } catch {
    resultDiv.className = 'result-message error';
    resultDiv.innerText = 'Erreur de connexion — vérifiez que n8n est actif.';
  } finally {
    buttons.forEach(b => b.disabled = false);
  }
}

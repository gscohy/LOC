import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/api';

// Simuler un token d'authentification (vous devrez peut-être l'ajuster)
const AUTH_TOKEN = 'your-test-token-here';

async function testPaiementsMultiples() {
  try {
    console.log('🧪 Test des paiements multiples...');

    // Données de test pour paiements multiples
    const testData = {
      paiements: [
        {
          loyerId: 'test-loyer-id', // Vous devrez remplacer par un vrai ID
          montant: 150,
          date: '2024-01-15',
          mode: 'VIREMENT',
          payeur: 'Locataire Principal',
          reference: 'VIR001',
          commentaires: 'Paiement locataire'
        },
        {
          loyerId: 'test-loyer-id', // Même loyer
          montant: 100,
          date: '2024-01-15',
          mode: 'VIREMENT',
          payeur: 'CAF',
          reference: 'CAF001',
          commentaires: 'Aide CAF'
        }
      ]
    };

    console.log('📤 Envoi des données:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${API_BASE}/paiements/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${AUTH_TOKEN}` // Décommentez si nécessaire
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Status de la réponse:', response.status);
    console.log('📋 Headers de la réponse:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('📄 Réponse brute:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Succès:', data);
    } else {
      console.log('❌ Erreur HTTP:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('💥 Détails de l\'erreur:', errorData);
      } catch (e) {
        console.log('💥 Erreur de parsing JSON:', e.message);
      }
    }

  } catch (error) {
    console.error('💀 Erreur fatale:', error);
  }
}

// Test de la route de santé d'abord
async function testHealth() {
  try {
    console.log('🔍 Test de la connexion au serveur...');
    const response = await fetch(`${API_BASE}/../health`);
    const data = await response.text();
    console.log('🏥 Health check:', response.status, data);
  } catch (error) {
    console.error('💀 Erreur de connexion:', error.message);
  }
}

async function runTests() {
  await testHealth();
  await testPaiementsMultiples();
}

runTests();
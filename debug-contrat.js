const axios = require('axios');

// Simuler une création de contrat
async function testContratCreation() {
  try {
    // D'abord, créer un compte de test si nécessaire
    try {
      await axios.post('http://localhost:3002/api/auth/register', {
        nom: 'Test',
        prenom: 'Admin',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'ADMIN'
      });
      console.log('✅ Compte de test créé');
    } catch (e) {
      console.log('ℹ️ Compte déjà existant ou erreur de création');
    }
    
    // Ensuite, se connecter pour récupérer un token
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Connexion réussie, token récupéré');
    
    // Récupérer les biens disponibles
    const biensResponse = await axios.get('http://localhost:3002/api/biens', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Biens récupérés:', biensResponse.data.data.biens.length, 'biens');
    
    // Récupérer les locataires disponibles
    const locatairesResponse = await axios.get('http://localhost:3002/api/locataires', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Locataires récupérés:', locatairesResponse.data.data.locataires.length, 'locataires');
    
    if (biensResponse.data.data.biens.length === 0) {
      console.log('❌ Aucun bien disponible pour créer un contrat');
      return;
    }
    
    if (locatairesResponse.data.data.locataires.length === 0) {
      console.log('❌ Aucun locataire disponible pour créer un contrat');
      return;
    }
    
    const premierBien = biensResponse.data.data.biens[0];
    const premierLocataire = locatairesResponse.data.data.locataires[0];
    
    // Créer un contrat de test
    const contratData = {
      bienId: premierBien.id,
      dateDebut: '2025-01-01',
      duree: 12,
      loyer: 800.00,
      chargesMensuelles: 100.00,
      depotGarantie: 800.00,
      jourPaiement: 1,
      fraisNotaire: 0,
      fraisHuissier: 0,
      type: 'HABITATION',
      locataires: [premierLocataire.id]
    };
    
    console.log('📊 Données du contrat à créer:', JSON.stringify(contratData, null, 2));
    
    const createResponse = await axios.post('http://localhost:3002/api/contrats', contratData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Contrat créé avec succès!', createResponse.data);
    
  } catch (error) {
    console.log('❌ Erreur:', error.response?.data || error.message);
    if (error.response?.data?.error?.stack) {
      console.log('Stack trace:', error.response.data.error.stack);
    }
  }
}

testContratCreation();
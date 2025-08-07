import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { PrismaClient } from '@prisma/client';

async function createSafePayment() {
  try {
    console.log('🧪 Test de création de paiement sécurisé...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // Récupérer un loyer valide du locataire
    const loyer = await db.get(`
      SELECT l.id, l.mois, l.annee
      FROM loyers l
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      ORDER BY l.annee DESC, l.mois DESC
      LIMIT 1
    `);
    
    if (!loyer) {
      console.log('❌ Aucun loyer trouvé pour ce locataire');
      await db.close();
      return;
    }
    
    console.log(`🎯 Test avec loyer ${loyer.id} (${loyer.mois}/${loyer.annee})`);
    
    // Test 1: Créer un paiement avec le bon schéma
    const testId = `test_${Date.now()}`;
    
    console.log('1️⃣ Création paiement avec SQL...');
    try {
      await db.run(`
        INSERT INTO paiements (id, loyerId, montant, date, mode, payeur, reference, commentaire, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        testId,
        loyer.id,
        335.0,
        '2025-08-01',
        'VIREMENT',
        'Locataire',
        'TEST001',
        'Test paiement'
      ]);
      
      console.log('✅ Paiement créé avec succès');
      
      // Test 2: Lecture avec SQL direct
      const paiementSQL = await db.get('SELECT * FROM paiements WHERE id = ?', [testId]);
      console.log('✅ Lecture SQL OK:', {
        montant: paiementSQL.montant,
        payeur: paiementSQL.payeur,
        mode: paiementSQL.mode
      });
      
      // Test 3: Lecture avec Prisma
      console.log('2️⃣ Test lecture Prisma...');
      const prisma = new PrismaClient();
      
      try {
        const paiementPrisma = await prisma.paiement.findUnique({
          where: { id: testId }
        });
        
        if (paiementPrisma) {
          console.log('✅ Lecture Prisma OK:', {
            montant: paiementPrisma.montant,
            payeur: paiementPrisma.payeur,
            mode: paiementPrisma.mode
          });
        } else {
          console.log('❌ Paiement non trouvé avec Prisma');
        }
        
      } catch (prismaError) {
        console.log('❌ Erreur Prisma:', prismaError.message);
      } finally {
        await prisma.$disconnect();
      }
      
      // Test 4: Création d'un paiement problématique (champs vides)
      console.log('3️⃣ Test avec champs vides...');
      const testId2 = `test_empty_${Date.now()}`;
      
      await db.run(`
        INSERT INTO paiements (id, loyerId, montant, date, mode, payeur, reference, commentaire, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        testId2,
        loyer.id,
        335.0,
        'VIREMENT',  // Date problématique (pas une vraie date)
        'VIREMENT',
        '',          // Payeur vide
        '',          // Reference vide
        '',          // Commentaire vide
      ]);
      
      console.log('✅ Paiement avec champs vides créé');
      
      // Test avec Prisma
      const prisma2 = new PrismaClient();
      try {
        const paiementVide = await prisma2.paiement.findUnique({
          where: { id: testId2 }
        });
        
        if (paiementVide) {
          console.log('✅ Paiement vide lu avec Prisma');
        }
      } catch (prismaError) {
        console.log('❌ Erreur Prisma avec champs vides:', prismaError.message);
      } finally {
        await prisma2.$disconnect();
      }
      
      // Nettoyage
      await db.run('DELETE FROM paiements WHERE id IN (?, ?)', [testId, testId2]);
      console.log('🗑️  Paiements de test supprimés');
      
    } catch (error) {
      console.log('❌ Erreur création:', error.message);
    }
    
    await db.close();
    
    console.log('\n💡 Conclusions:');
    console.log('- Le schéma correct est: id, loyerId, montant, date, mode, payeur, reference, commentaire, createdAt');
    console.log('- Pas de colonne updatedAt');
    console.log('- Les champs vides peuvent causer des problèmes Prisma');
    console.log('- Vérifiez le format des dates dans vos données');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

createSafePayment();
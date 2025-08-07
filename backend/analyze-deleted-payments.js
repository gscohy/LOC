import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function analyzeDeletedPayments() {
  try {
    console.log('🔍 Analyse des paiements supprimés...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // 1. Vérifier combien de paiements restent pour ce locataire
    console.log('1️⃣ Paiements actuels du locataire...');
    const currentPayments = await db.all(`
      SELECT p.id, p.montant, p.payeur, p.commentaire, p.reference, p.date
      FROM paiements p
      JOIN loyers l ON p.loyerId = l.id
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log(`📊 ${currentPayments.length} paiements restants`);
    
    // 2. Analyser le schéma de la table paiements
    console.log('\n2️⃣ Schéma de la table paiements...');
    const schema = await db.all(`PRAGMA table_info(paiements)`);
    console.log('📋 Colonnes:');
    schema.forEach(col => {
      console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 3. Vérifier les contraintes et index
    console.log('\n3️⃣ Contraintes et index...');
    const indexes = await db.all(`PRAGMA index_list(paiements)`);
    console.log('📋 Index:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${idx.unique ? 'UNIQUE' : 'NORMAL'}`);
    });
    
    // 4. Créer un paiement test pour identifier le problème exact
    console.log('\n4️⃣ Test de création d\'un paiement...');
    
    // Récupérer un loyer valide
    const loyers = await db.all(`
      SELECT l.id
      FROM loyers l
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      LIMIT 1
    `);
    
    if (loyers.length > 0) {
      const loyerId = loyers[0].id;
      console.log(`🎯 Test avec loyer: ${loyerId}`);
      
      // Test 1: Paiement minimal
      const testId1 = 'test_payment_1';
      try {
        await db.run(`
          INSERT INTO paiements (id, loyerId, montant, payeur, commentaire, reference, date, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [testId1, loyerId, 100.0, 'Test', 'Test commentaire', 'REF001', '2025-01-01']);
        
        console.log('✅ Paiement test 1 créé avec succès');
        
        // Tester la lecture avec Prisma
        console.log('🔍 Test lecture Prisma...');
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          const paiement = await prisma.paiement.findUnique({
            where: { id: testId1 }
          });
          console.log('✅ Lecture Prisma OK:', paiement?.montant);
          await prisma.$disconnect();
        } catch (prismaError) {
          console.log('❌ Erreur Prisma:', prismaError.message);
          await prisma.$disconnect();
        }
        
        // Supprimer le paiement test
        await db.run('DELETE FROM paiements WHERE id = ?', [testId1]);
        console.log('🗑️  Paiement test supprimé');
        
      } catch (error) {
        console.log('❌ Erreur création paiement test:', error.message);
      }
      
      // Test 2: Paiement avec valeurs vides
      const testId2 = 'test_payment_2';
      try {
        await db.run(`
          INSERT INTO paiements (id, loyerId, montant, payeur, commentaire, reference, date, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [testId2, loyerId, 335, '', 'Loyer test', '', 'VIREMENT']);
        
        console.log('✅ Paiement test 2 (avec champs vides) créé');
        
        // Tester avec Prisma
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          const paiement = await prisma.paiement.findUnique({
            where: { id: testId2 }
          });
          console.log('✅ Lecture Prisma OK pour paiement avec champs vides');
          await prisma.$disconnect();
        } catch (prismaError) {
          console.log('❌ Erreur Prisma avec champs vides:', prismaError.message);
          await prisma.$disconnect();
        }
        
        await db.run('DELETE FROM paiements WHERE id = ?', [testId2]);
        
      } catch (error) {
        console.log('❌ Erreur création paiement avec champs vides:', error.message);
      }
    }
    
    await db.close();
    
    console.log('\n📋 Recommandations:');
    console.log('1. Vérifiez le format exact des données que vous remettez');
    console.log('2. Utilisez ce script pour tester chaque paiement individuellement');
    console.log('3. Assurez-vous que tous les champs texte sont des strings, pas NULL');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

analyzeDeletedPayments();
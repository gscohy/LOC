import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function recreatePaymentsClean() {
  try {
    console.log('🔧 Recréation de la table paiements...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // 1. Sauvegarder les données existantes
    console.log('1️⃣ Sauvegarde des paiements existants...');
    const existingPayments = await db.all(`
      SELECT * FROM paiements
      WHERE loyerId IN (
        SELECT l.id FROM loyers l
        JOIN contrats c ON l.contratId = c.id
        JOIN contrat_locataires cl ON c.id = cl.contratId
        WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      )
    `);
    
    console.log(`📊 ${existingPayments.length} paiements à sauvegarder`);
    
    // 2. Supprimer les paiements du locataire
    console.log('2️⃣ Suppression des paiements du locataire...');
    const deleteResult = await db.run(`
      DELETE FROM paiements
      WHERE loyerId IN (
        SELECT l.id FROM loyers l
        JOIN contrats c ON l.contratId = c.id
        JOIN contrat_locataires cl ON c.id = cl.contratId
        WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      )
    `);
    
    console.log(`✅ ${deleteResult.changes} paiements supprimés`);
    
    // 3. Recréer les paiements avec des données propres
    console.log('3️⃣ Recréation des paiements avec données propres...');
    
    let created = 0;
    let errors = 0;
    
    for (const payment of existingPayments) {
      try {
        // Nettoyer les données
        const cleanPayment = {
          id: payment.id,
          loyerId: payment.loyerId,
          montant: parseFloat(String(payment.montant).replace(',', '.')),
          date: payment.date || '2025-01-01',
          mode: payment.mode || 'VIREMENT',
          payeur: payment.payeur || 'Locataire',
          reference: payment.reference || '',
          commentaire: payment.commentaire || '',
          createdAt: payment.createdAt || new Date().toISOString()
        };
        
        // Valider les données
        if (isNaN(cleanPayment.montant)) {
          console.log(`⚠️  Montant invalide pour ${payment.id}: "${payment.montant}"`);
          cleanPayment.montant = 0;
        }
        
        // Nettoyer les chaînes de caractères
        cleanPayment.payeur = String(cleanPayment.payeur).trim();
        cleanPayment.reference = String(cleanPayment.reference).trim();
        cleanPayment.commentaire = String(cleanPayment.commentaire).trim();
        cleanPayment.mode = String(cleanPayment.mode).trim();
        
        // Insérer le paiement propre
        await db.run(`
          INSERT INTO paiements (id, loyerId, montant, date, mode, payeur, reference, commentaire, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          cleanPayment.id,
          cleanPayment.loyerId,
          cleanPayment.montant,
          cleanPayment.date,
          cleanPayment.mode,
          cleanPayment.payeur,
          cleanPayment.reference,
          cleanPayment.commentaire,
          cleanPayment.createdAt
        ]);
        
        created++;
        
      } catch (error) {
        console.log(`❌ Erreur pour paiement ${payment.id}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`✅ ${created} paiements recréés, ${errors} erreurs`);
    
    // 4. Test avec Prisma
    console.log('4️⃣ Test avec Prisma...');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const locataire = await prisma.locataire.findUnique({
        where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
        include: {
          contrats: {
            include: {
              contrat: {
                include: {
                  loyers: {
                    include: {
                      paiements: true
                    },
                    take: 3
                  }
                }
              }
            }
          }
        }
      });
      
      if (locataire) {
        console.log('🎉 Locataire accessible avec Prisma !');
        console.log(`📊 ${locataire.prenom} ${locataire.nom}`);
        
        let totalPaiements = 0;
        locataire.contrats.forEach(c => {
          c.contrat.loyers.forEach(l => {
            totalPaiements += l.paiements.length;
          });
        });
        
        console.log(`📊 ${totalPaiements} paiements accessibles dans les 3 premiers loyers`);
      } else {
        console.log('❌ Locataire toujours inaccessible');
      }
      
    } catch (prismaError) {
      console.log('❌ Erreur Prisma persistante:', prismaError.message);
    } finally {
      await prisma.$disconnect();
    }
    
    await db.close();
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

recreatePaymentsClean();
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function fixEmptyPayeur() {
  try {
    console.log('🔧 Correction des champs payeur vides...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // 1. Identifier tous les paiements avec payeur vide ou NULL
    console.log('1️⃣ Identification des paiements avec payeur vide...');
    const emptyPayeurs = await db.all(`
      SELECT id, montant, payeur, commentaire, date
      FROM paiements 
      WHERE payeur IS NULL OR payeur = '' OR TRIM(payeur) = ''
    `);
    
    console.log(`📊 ${emptyPayeurs.length} paiements avec payeur vide trouvés`);
    
    if (emptyPayeurs.length > 0) {
      // Montrer quelques exemples
      console.log('📋 Exemples:');
      emptyPayeurs.slice(0, 5).forEach(p => {
        console.log(`   - ${p.id}: montant=${p.montant}, payeur="${p.payeur}", date="${p.date}"`);
      });
      
      // 2. Corriger en mettant "Locataire" par défaut
      console.log('\\n2️⃣ Correction des payeurs vides...');
      const result = await db.run(`
        UPDATE paiements 
        SET payeur = 'Locataire'
        WHERE payeur IS NULL OR payeur = '' OR TRIM(payeur) = ''
      `);
      
      console.log(`✅ ${result.changes} paiements corrigés`);
    }
    
    // 3. Vérifier s'il y a d'autres champs texte problématiques
    console.log('\\n3️⃣ Vérification d\'autres champs problématiques...');
    
    const checks = [
      {
        table: 'paiements',
        field: 'commentaire',
        description: 'commentaires paiements'
      },
      {
        table: 'paiements', 
        field: 'reference',
        description: 'références paiements'
      },
      {
        table: 'paiements',
        field: 'date',
        description: 'dates paiements'
      }
    ];
    
    for (const check of checks) {
      // Chercher les valeurs NULL dans les champs texte
      const nullValues = await db.all(`
        SELECT id, ${check.field}
        FROM ${check.table}
        WHERE ${check.field} IS NULL
        LIMIT 5
      `);
      
      if (nullValues.length > 0) {
        console.log(`⚠️  ${nullValues.length} valeurs NULL dans ${check.description}`);
        
        // Corriger les valeurs NULL
        const fieldDefault = check.field === 'date' ? 'NON_PRECISE' : '';
        await db.run(`
          UPDATE ${check.table}
          SET ${check.field} = ?
          WHERE ${check.field} IS NULL
        `, [fieldDefault]);
        
        console.log(`   ✅ Valeurs NULL corrigées avec "${fieldDefault}"`);
      } else {
        console.log(`✅ ${check.description}: pas de valeurs NULL`);
      }
    }
    
    // 4. Test final avec les paiements problématiques identifiés
    console.log('\\n4️⃣ Test des paiements précédemment problématiques...');
    const problematicIds = [
      'cmdt7u5i60175yuxg1t9kikxs1',
      'cmdt7u5i50173yuxgwh33y5lk1',
      'cmdt7u5i40171yuxg1imcp6tf1'
    ];
    
    for (const id of problematicIds) {
      const paiement = await db.get(`
        SELECT id, montant, payeur, commentaire, reference, date
        FROM paiements
        WHERE id = ?
      `, [id]);
      
      if (paiement) {
        console.log(`✅ ${id}: montant=${paiement.montant}, payeur="${paiement.payeur}", commentaire="${paiement.commentaire}"`);
      } else {
        console.log(`❌ ${id}: non trouvé`);
      }
    }
    
    await db.close();
    
    console.log('\\n🎉 Correction terminée !');
    console.log('   → Redémarrez le serveur backend et testez à nouveau');
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

fixEmptyPayeur();
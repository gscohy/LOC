import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function fixAllCommaIssues() {
  try {
    console.log('🔧 Correction complète de tous les problèmes de virgules...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // Vérifier et corriger toutes les colonnes numériques de toutes les tables
    const fixes = [
      // Table paiements
      { table: 'paiements', column: 'montant', desc: 'montants paiements' },
      
      // Table loyers
      { table: 'loyers', column: 'montantDu', desc: 'montants dus loyers' },
      { table: 'loyers', column: 'montantPaye', desc: 'montants payés loyers' },
      
      // Table contrats
      { table: 'contrats', column: 'loyer', desc: 'loyers contrats' },
      { table: 'contrats', column: 'chargesMensuelles', desc: 'charges contrats' },
      { table: 'contrats', column: 'depotGarantie', desc: 'dépôts contrats' },
      { table: 'contrats', column: 'fraisNotaire', desc: 'frais notaire' },
      { table: 'contrats', column: 'fraisHuissier', desc: 'frais huissier' },
      
      // Table biens
      { table: 'biens', column: 'surface', desc: 'surfaces biens' },
      { table: 'biens', column: 'loyer', desc: 'loyers biens' },
      { table: 'biens', column: 'chargesMensuelles', desc: 'charges biens' },
      { table: 'biens', column: 'depotGarantie', desc: 'dépôts biens' },
      
      // Table charges
      { table: 'charges', column: 'montant', desc: 'montants charges' },
      
      // Table locataires
      { table: 'locataires', column: 'revenus', desc: 'revenus locataires' },
      
      // Table garants
      { table: 'garants', column: 'revenus', desc: 'revenus garants' },
      
      // Table quittances
      { table: 'quittances', column: 'montant', desc: 'montants quittances' }
    ];
    
    let totalFixed = 0;
    
    for (const fix of fixes) {
      try {
        // Vérifier s'il y a des problèmes
        const problematic = await db.all(`
          SELECT id, ${fix.column} 
          FROM ${fix.table} 
          WHERE CAST(${fix.column} AS TEXT) LIKE '%,%' 
             OR CAST(${fix.column} AS TEXT) LIKE '%€%'
             OR CAST(${fix.column} AS TEXT) LIKE '% %'
          LIMIT 5
        `);
        
        if (problematic.length > 0) {
          console.log(`❌ ${problematic.length} problème(s) trouvé(s) dans ${fix.desc}:`);
          problematic.forEach(p => {
            console.log(`   - ${p.id}: "${p[fix.column]}"`);
          });
          
          // Corriger tous les problèmes de cette colonne
          const result = await db.run(`
            UPDATE ${fix.table} 
            SET ${fix.column} = CAST(
              REPLACE(
                REPLACE(
                  REPLACE(CAST(${fix.column} AS TEXT), ',', '.'), 
                  '€', ''
                ), 
                ' ', ''
              ) AS REAL
            )
            WHERE CAST(${fix.column} AS TEXT) LIKE '%,%' 
               OR CAST(${fix.column} AS TEXT) LIKE '%€%'
               OR CAST(${fix.column} AS TEXT) LIKE '% %'
          `);
          
          const fixed = result.changes || 0;
          console.log(`✅ ${fixed} ${fix.desc} corrigé(s)`);
          totalFixed += fixed;
        } else {
          console.log(`✅ ${fix.desc}: RAS`);
        }
        
      } catch (error) {
        console.log(`⚠️  Erreur pour ${fix.desc}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total: ${totalFixed} valeurs corrigées`);
    
    // Vérification spéciale pour les champs texte qui pourraient contenir des données numériques
    console.log('\n🔍 Vérification des champs texte suspects...');
    
    const textChecks = [
      'SELECT id, reference FROM paiements WHERE reference LIKE "%,%" LIMIT 3',
      'SELECT id, commentaire FROM paiements WHERE commentaire LIKE "%,%" LIMIT 3',
      'SELECT id, commentaires FROM loyers WHERE commentaires LIKE "%,%" LIMIT 3',
      'SELECT id, clausesParticulieres FROM contrats WHERE clausesParticulieres LIKE "%,%" LIMIT 3'
    ];
    
    for (const check of textChecks) {
      try {
        const results = await db.all(check);
        if (results.length > 0) {
          console.log(`⚠️  Champs texte suspects trouvés:`, results);
        }
      } catch (error) {
        // Ignorer les erreurs de colonnes inexistantes
      }
    }
    
    // Test final avec Prisma-like query simulation
    console.log('\n🧪 Test final des données...');
    
    const testLocataire = await db.get(`
      SELECT l.id, l.prenom, l.nom, l.revenus
      FROM locataires l
      WHERE l.id = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log('✅ Locataire test:', testLocataire);
    
    const testContrat = await db.get(`
      SELECT c.id, c.loyer, c.chargesMensuelles, c.depotGarantie
      FROM contrats c
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log('✅ Contrat test:', testContrat);
    
    const testLoyers = await db.all(`
      SELECT lo.id, lo.montantDu, lo.montantPaye, lo.statut
      FROM loyers lo
      WHERE lo.contratId = ?
      ORDER BY lo.annee DESC, lo.mois DESC
      LIMIT 3
    `, testContrat.id);
    
    console.log('✅ Loyers test:', testLoyers);
    
    if (testLoyers.length > 0) {
      const testPaiements = await db.all(`
        SELECT p.id, p.montant, p.payeur
        FROM paiements p
        WHERE p.loyerId = ?
        LIMIT 2
      `, testLoyers[0].id);
      
      console.log('✅ Paiements test:', testPaiements);
    }
    
    // Forcer un VACUUM pour nettoyer la base
    console.log('\n🔄 Optimisation finale de la base...');
    await db.run('VACUUM');
    console.log('✅ Base optimisée');
    
    await db.close();
    
    console.log(`\n🎉 Correction terminée !`);
    console.log(`   - ${totalFixed} valeurs numériques corrigées`);
    console.log(`   - Base de données optimisée`);
    console.log(`   - Tests de lecture réussis`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  }
}

fixAllCommaIssues();
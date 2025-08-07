import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function debugSpecificLocataire() {
  try {
    console.log('🔍 Debug spécifique du locataire cmdt7nkiz00ygyuxgvfkplwv6...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    // 1. Vérifier TOUS les paiements liés à ce locataire
    console.log('1️⃣ Tous les paiements de ce locataire...');
    const paiements = await db.all(`
      SELECT p.id, p.montant, p.payeur, p.date, p.commentaire, p.reference, p.loyerId
      FROM paiements p
      JOIN loyers l ON p.loyerId = l.id
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log(`✅ ${paiements.length} paiements trouvés`);
    
    // Vérifier chaque paiement pour des caractères suspects
    let problematicPayments = [];
    for (const p of paiements) {
      const montantStr = String(p.montant);
      const payeurStr = String(p.payeur || '');
      const commentaireStr = String(p.commentaire || '');
      const referenceStr = String(p.reference || '');
      
      if (montantStr.includes(',') || 
          montantStr.includes('€') || 
          payeurStr.includes(',') ||
          commentaireStr.includes(',') ||
          referenceStr.includes(',') ||
          montantStr.includes(' ') ||
          /[^\d.-]/.test(montantStr.replace('.', ''))) {
        problematicPayments.push({
          id: p.id,
          montant: p.montant,
          payeur: p.payeur,
          commentaire: p.commentaire,
          reference: p.reference
        });
      }
    }
    
    if (problematicPayments.length > 0) {
      console.log('❌ Paiements problématiques trouvés:');
      problematicPayments.forEach(p => {
        console.log(`   - ${p.id}: montant="${p.montant}", payeur="${p.payeur}", commentaire="${p.commentaire}", reference="${p.reference}"`);
      });
    } else {
      console.log('✅ Aucun paiement problématique trouvé');
    }
    
    // 2. Vérifier TOUS les loyers de ce locataire
    console.log('\\n2️⃣ Tous les loyers de ce locataire...');
    const loyers = await db.all(`
      SELECT l.id, l.montantDu, l.montantPaye, l.commentaires
      FROM loyers l
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log(`✅ ${loyers.length} loyers trouvés`);
    
    let problematicLoyers = [];
    for (const l of loyers) {
      const montantDuStr = String(l.montantDu);
      const montantPayeStr = String(l.montantPaye);
      const commentairesStr = String(l.commentaires || '');
      
      if (montantDuStr.includes(',') || 
          montantPayeStr.includes(',') ||
          commentairesStr.includes(',') ||
          /[^\d.-]/.test(montantDuStr.replace('.', '')) ||
          /[^\d.-]/.test(montantPayeStr.replace('.', ''))) {
        problematicLoyers.push({
          id: l.id,
          montantDu: l.montantDu,
          montantPaye: l.montantPaye,
          commentaires: l.commentaires
        });
      }
    }
    
    if (problematicLoyers.length > 0) {
      console.log('❌ Loyers problématiques trouvés:');
      problematicLoyers.forEach(l => {
        console.log(`   - ${l.id}: montantDu="${l.montantDu}", montantPaye="${l.montantPaye}", commentaires="${l.commentaires}"`);
      });
    } else {
      console.log('✅ Aucun loyer problématique trouvé');
    }
    
    // 3. Vérifier le contrat de ce locataire
    console.log('\\n3️⃣ Contrat de ce locataire...');
    const contrat = await db.get(`
      SELECT c.id, c.loyer, c.chargesMensuelles, c.depotGarantie, c.clausesParticulieres, c.commentaires
      FROM contrats c
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    if (contrat) {
      const fields = ['loyer', 'chargesMensuelles', 'depotGarantie'];
      let problematicContrat = false;
      
      for (const field of fields) {
        const valueStr = String(contrat[field] || '');
        if (valueStr.includes(',') || /[^\d.-]/.test(valueStr.replace('.', ''))) {
          console.log(`❌ Contrat problématique - ${field}: "${contrat[field]}"`);
          problematicContrat = true;
        }
      }
      
      if (!problematicContrat) {
        console.log('✅ Contrat OK');
      }
    }
    
    // 4. Test de caractères cachés/invisibles
    console.log('\\n4️⃣ Test de caractères cachés...');
    
    // Vérifier le premier paiement en détail
    if (paiements.length > 0) {
      const firstPayment = paiements[0];
      const montantBytes = Buffer.from(String(firstPayment.montant), 'utf8');
      console.log(`Paiement ${firstPayment.id}:`);
      console.log(`   - Montant: "${firstPayment.montant}"`);
      console.log(`   - Bytes: [${Array.from(montantBytes).join(', ')}]`);
      console.log(`   - Length: ${String(firstPayment.montant).length}`);
      
      // Vérifier s'il y a des caractères non-ASCII
      const hasNonAscii = /[^\x00-\x7F]/.test(String(firstPayment.montant));
      console.log(`   - Non-ASCII chars: ${hasNonAscii}`);
    }
    
    await db.close();
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

debugSpecificLocataire();
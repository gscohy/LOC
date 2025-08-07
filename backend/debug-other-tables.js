import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { PrismaClient } from '@prisma/client';

async function debugOtherTables() {
  try {
    console.log('🔍 Debug des autres tables liées au locataire...');
    
    const db = await open({
      filename: './prisma/gestion-locative.db',
      driver: sqlite3.Database
    });
    
    const prisma = new PrismaClient();
    
    // Test 1: Locataire seul
    console.log('1️⃣ Test locataire seul...');
    try {
      const locataire = await prisma.locataire.findUnique({
        where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' }
      });
      console.log('✅ Locataire seul OK:', locataire?.prenom);
    } catch (error) {
      console.log('❌ Erreur locataire seul:', error.message);
      
      // Vérifier les données du locataire avec SQL
      const locataireSQL = await db.get('SELECT * FROM locataires WHERE id = ?', ['cmdt7nkiz00ygyuxgvfkplwv6']);
      console.log('📊 Données locataire SQL:', locataireSQL);
    }
    
    // Test 2: Contrats
    console.log('\n2️⃣ Test contrats...');
    try {
      const contrats = await prisma.contratLocataire.findMany({
        where: { locataireId: 'cmdt7nkiz00ygyuxgvfkplwv6' }
      });
      console.log(`✅ Contrats OK: ${contrats.length}`);
    } catch (error) {
      console.log('❌ Erreur contrats:', error.message);
      
      const contratsSQL = await db.all(`
        SELECT * FROM contrat_locataires 
        WHERE locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      `);
      console.log('📊 Contrats SQL:', contratsSQL.length);
    }
    
    // Test 3: Biens
    console.log('\n3️⃣ Test biens...');
    try {
      const biens = await db.all(`
        SELECT b.* FROM biens b
        JOIN contrats c ON b.id = c.bienId
        JOIN contrat_locataires cl ON c.id = cl.contratId
        WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      `);
      
      console.log(`📊 Biens SQL: ${biens.length}`);
      biens.forEach(b => {
        console.log(`   - ${b.id}: "${b.adresse}", surface=${b.surface}, loyer=${b.loyer}`);
      });
      
      // Test Prisma avec les biens
      for (const bien of biens) {
        try {
          const bienPrisma = await prisma.bien.findUnique({
            where: { id: bien.id }
          });
          console.log(`✅ Bien ${bien.id} OK avec Prisma`);
        } catch (error) {
          console.log(`❌ Bien ${bien.id} erreur Prisma:`, error.message);
          console.log(`   Données: surface="${bien.surface}", loyer="${bien.loyer}"`);
        }
      }
      
    } catch (error) {
      console.log('❌ Erreur biens:', error.message);
    }
    
    // Test 4: Loyers
    console.log('\n4️⃣ Test loyers...');
    const loyersSQL = await db.all(`
      SELECT l.* FROM loyers l
      JOIN contrats c ON l.contratId = c.id
      JOIN contrat_locataires cl ON c.id = cl.contratId
      WHERE cl.locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
      LIMIT 5
    `);
    
    console.log(`📊 Loyers SQL: ${loyersSQL.length}`);
    
    for (const loyer of loyersSQL) {
      try {
        const loyerPrisma = await prisma.loyer.findUnique({
          where: { id: loyer.id }
        });
        console.log(`✅ Loyer ${loyer.id} OK`);
      } catch (error) {
        console.log(`❌ Loyer ${loyer.id} erreur:`, error.message);
        console.log(`   Données: montantDu="${loyer.montantDu}", montantPaye="${loyer.montantPaye}"`);
      }
    }
    
    // Test 5: Garants
    console.log('\n5️⃣ Test garants...');
    const garantsSQL = await db.all(`
      SELECT * FROM garants 
      WHERE locataireId = 'cmdt7nkiz00ygyuxgvfkplwv6'
    `);
    
    console.log(`📊 Garants SQL: ${garantsSQL.length}`);
    
    for (const garant of garantsSQL) {
      try {
        const garantPrisma = await prisma.garant.findUnique({
          where: { id: garant.id }
        });
        console.log(`✅ Garant ${garant.id} OK`);
      } catch (error) {
        console.log(`❌ Garant ${garant.id} erreur:`, error.message);
        console.log(`   Données: revenus="${garant.revenus}"`);
      }
    }
    
    // Test 6: Test progressif de la requête complète
    console.log('\n6️⃣ Test progressif de la requête complète...');
    
    const testQueries = [
      {
        name: 'Locataire + garants',
        query: () => prisma.locataire.findUnique({
          where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
          include: { garants: true }
        })
      },
      {
        name: 'Locataire + contrats (sans include)',
        query: () => prisma.locataire.findUnique({
          where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
          include: { contrats: true }
        })
      },
      {
        name: 'Locataire + contrats + contrat',
        query: () => prisma.locataire.findUnique({
          where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
          include: { 
            contrats: { 
              include: { contrat: true } 
            }
          }
        })
      },
      {
        name: 'Locataire + contrats + bien',
        query: () => prisma.locataire.findUnique({
          where: { id: 'cmdt7nkiz00ygyuxgvfkplwv6' },
          include: { 
            contrats: { 
              include: { 
                contrat: { 
                  include: { bien: true } 
                } 
              } 
            }
          }
        })
      }
    ];
    
    for (const test of testQueries) {
      try {
        const result = await test.query();
        console.log(`✅ ${test.name}: OK`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        break; // Arrêter au premier échec
      }
    }
    
    await prisma.$disconnect();
    await db.close();
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

debugOtherTables();
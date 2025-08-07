import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  console.log('=== VÉRIFICATION DES DONNÉES ===');
  
  // Compter les loyers
  const loyersCount = await prisma.loyer.count();
  console.log('Nombre de loyers:', loyersCount);
  
  // Compter les paiements
  const paiementsCount = await prisma.paiement.count();
  console.log('Nombre de paiements:', paiementsCount);
  
  // Compter les charges
  const chargesCount = await prisma.charge.count();
  console.log('Nombre de charges:', chargesCount);
  
  // Quelques exemples de loyers avec paiements
  const loyersWithPaiements = await prisma.loyer.findMany({
    take: 5,
    include: {
      paiements: true,
      contrat: {
        include: {
          bien: {
            select: { adresse: true, ville: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== EXEMPLES DE LOYERS ===');
  loyersWithPaiements.forEach(loyer => {
    console.log(`Loyer ${loyer.mois}/${loyer.annee} - ${loyer.contrat?.bien?.adresse || 'N/A'}`);
    console.log(`  Montant dû: ${loyer.montantDu}€, Payé: ${loyer.montantPaye}€`);
    console.log(`  Statut: ${loyer.statut}`);
    console.log(`  Paiements: ${loyer.paiements.length}`);
    if (loyer.paiements.length > 0) {
      loyer.paiements.forEach(p => {
        console.log(`    - ${p.montant}€ le ${p.date} (${p.mode})`);
      });
    }
    console.log('');
  });
  
  // Statistiques 2025
  console.log('\n=== STATISTIQUES 2025 ===');
  const loyers2025 = await prisma.loyer.findMany({
    where: { annee: 2025 },
    include: {
      paiements: true,
      contrat: {
        include: {
          bien: { select: { adresse: true } }
        }
      }
    }
  });
  
  let totalDu = 0;
  let totalPaye = 0;
  const parMois = {};
  
  loyers2025.forEach(loyer => {
    totalDu += loyer.montantDu;
    totalPaye += loyer.montantPaye;
    
    const moisKey = `${loyer.annee}-${loyer.mois.toString().padStart(2, '0')}`;
    if (!parMois[moisKey]) {
      parMois[moisKey] = { du: 0, paye: 0, nombre: 0 };
    }
    parMois[moisKey].du += loyer.montantDu;
    parMois[moisKey].paye += loyer.montantPaye;
    parMois[moisKey].nombre += 1;
  });
  
  console.log(`Total 2025 - Dû: ${totalDu}€, Payé: ${totalPaye}€`);
  console.log('Par mois:');
  Object.keys(parMois).sort().forEach(mois => {
    const data = parMois[mois];
    console.log(`  ${mois}: ${data.paye}€ payés sur ${data.du}€ dus (${data.nombre} loyers)`);
  });
  
  await prisma.$disconnect();
}

checkData().catch(console.error);
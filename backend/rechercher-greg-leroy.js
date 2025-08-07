import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function rechercherContratGregLeroy() {
  try {
    // Rechercher Greg Leroy
    const contrats = await prisma.contrat.findMany({
      include: {
        locataires: {
          include: {
            locataire: true
          }
        },
        bien: true,
        loyers: {
          where: {
            mois: 7,
            annee: 2020
          }
        }
      },
      where: {
        locataires: {
          some: {
            locataire: {
              OR: [
                { nom: { contains: 'Leroy' } },
                { nom: { contains: 'Greg' } },
                { prenom: { contains: 'Greg' } }
              ]
            }
          }
        }
      }
    });

    console.log('🔍 Contrats trouvés pour Greg Leroy:', contrats.length);
    
    contrats.forEach(contrat => {
      const locataires = contrat.locataires.map(cl => `${cl.locataire.prenom} ${cl.locataire.nom}`).join(', ');
      console.log(`\n📋 Contrat ${contrat.id}:`);
      console.log(`   Locataire(s): ${locataires}`);
      console.log(`   Bien: ${contrat.bien.adresse}`);
      console.log(`   Période: ${contrat.dateDebut.toISOString().split('T')[0]} → ${contrat.dateFin?.toISOString().split('T')[0] || 'En cours'}`);
      console.log(`   Loyer: ${contrat.loyer}€ + charges ${contrat.chargesMensuelles}€ = ${contrat.loyer + contrat.chargesMensuelles}€`);
      console.log(`   Statut: ${contrat.statut}`);
      
      if (contrat.dateFinReelle) {
        console.log(`   📅 Résiliation effective: ${contrat.dateFinReelle.toISOString().split('T')[0]}`);
        console.log(`   📝 Raison: ${contrat.raisonResiliation || 'Non spécifiée'}`);
      }
      
      if (contrat.loyers.length > 0) {
        console.log(`   💰 Loyer juillet 2020: ${contrat.loyers[0].montantDu}€ (payé: ${contrat.loyers[0].montantPaye}€, statut: ${contrat.loyers[0].statut})`);
        console.log(`   🆔 Loyer ID: ${contrat.loyers[0].id}`);
      }
    });
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

rechercherContratGregLeroy();
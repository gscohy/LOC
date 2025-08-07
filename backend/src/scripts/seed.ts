import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Créer un utilisateur admin
  const adminPassword = await bcrypt.hash('password', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: adminPassword,
      nom: 'Admin',
      prenom: 'Test',
      role: 'ADMIN',
    },
  });
  
  console.log('✅ Admin user created:', admin.email);
  
  // Créer quelques propriétaires de test
  const existingProp1 = await prisma.proprietaire.findFirst({
    where: { email: 'prop1@test.com' }
  });
  
  const proprietaire1 = existingProp1 || await prisma.proprietaire.create({
    data: {
      type: 'PHYSIQUE',
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'prop1@test.com',
      telephone: '0123456789',
      adresse: '123 Rue de la Paix',
      ville: 'Paris',
      codePostal: '75001',
    },
  });
  
  const existingProp2 = await prisma.proprietaire.findFirst({
    where: { email: 'prop2@test.com' }
  });
  
  const proprietaire2 = existingProp2 || await prisma.proprietaire.create({
    data: {
      type: 'PHYSIQUE',
      nom: 'Martin',
      prenom: 'Marie',
      email: 'prop2@test.com',
      telephone: '0987654321',
      adresse: '456 Avenue des Champs',
      ville: 'Lyon',
      codePostal: '69001',
    },
  });
  
  console.log('✅ Proprietaires created:', proprietaire1.nom, proprietaire2.nom);
  
  // Créer quelques biens de test
  const bien1 = await prisma.bien.create({
    data: {
      adresse: '10 Rue de Rivoli',
      ville: 'Paris',
      codePostal: '75001',
      type: 'APPARTEMENT',
      surface: 65.5,
      nbPieces: 3,
      nbChambres: 2,
      loyer: 1200,
      chargesMensuelles: 150,
      depotGarantie: 1200,
      statut: 'LIBRE',
      description: 'Bel appartement 3 pièces au centre de Paris',
      proprietaires: {
        create: [
          {
            proprietaireId: proprietaire1.id,
            quotePart: 100,
          },
        ],
      },
    },
  });
  
  const bien2 = await prisma.bien.create({
    data: {
      adresse: '25 Boulevard de la République',
      ville: 'Lyon',
      codePostal: '69002',
      type: 'APPARTEMENT',
      surface: 45.0,
      nbPieces: 2,
      nbChambres: 1,
      loyer: 800,
      chargesMensuelles: 100,
      depotGarantie: 800,
      statut: 'LOUE',
      description: 'Studio moderne proche du centre-ville',
      proprietaires: {
        create: [
          {
            proprietaireId: proprietaire2.id,
            quotePart: 100,
          },
        ],
      },
    },
  });
  
  console.log('✅ Biens created:', bien1.adresse, bien2.adresse);
  
  // Créer quelques locataires de test
  const locataire1 = await prisma.locataire.create({
    data: {
      civilite: 'M',
      nom: 'Durand',
      prenom: 'Pierre',
      email: 'pierre.durand@test.com',
      telephone: '0612345678',
      adresse: '789 Rue de la Liberté',
      ville: 'Paris',
      codePostal: '75010',
      profession: 'Ingénieur',
      revenus: 3500,
    },
  });
  
  console.log('✅ Locataires created:', locataire1.nom);
  
  // Créer quelques contrats de test
  const contrat1 = await prisma.contrat.create({
    data: {
      bienId: bien1.id,
      dateDebut: new Date('2024-01-01'),
      dateFin: new Date('2025-12-31'),
      duree: 24,
      loyer: 1200,
      chargesMensuelles: 150,
      depotGarantie: 1200,
      jourPaiement: 5,
      type: 'HABITATION',
      statut: 'ACTIF',
      clausesParticulieres: 'Pas d\'animaux autorisés',
    },
  });

  // Associer le locataire au contrat
  await prisma.contratLocataire.create({
    data: {
      contratId: contrat1.id,
      locataireId: locataire1.id,
    },
  });

  // Créer l'historique du contrat
  await prisma.contratHistorique.create({
    data: {
      contratId: contrat1.id,
      action: 'CREATION',
      description: 'Contrat créé et signé',
    },
  });

  console.log('✅ Contrats created:', contrat1.id);
  
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });